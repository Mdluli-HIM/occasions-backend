import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  toProviderListingWithMedia,
  toFeaturedProvider,
  toProviderDetail,
} from "../lib/serializers";
import { guestLevelToDb } from "../lib/taxonomy";
import { leadRateLimit } from "../middleware/rate-limit";

const router = Router();

function parseMultiValue(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value || value.toLowerCase() === "any") return [];

  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v && v.toLowerCase() !== "any");
}

// GET /api/providers — search. See BACKEND_HANDOFF.md section 4 for the
// client-side filter logic this reproduces (location/service substring
// match, exact enum match on budget/guests).
router.get("/", async (req, res) => {
  const q = String(req.query.q ?? req.query.service ?? "").trim();
  const location = String(req.query.location ?? "").trim();
  // serviceType/eventType accept comma-separated multiple slugs, e.g.
  // "catering,decor" — a provider matches if it has ANY of the given slugs.
  const serviceTypes = parseMultiValue(req.query.serviceType);
  // Accept both `event` and `eventType` as the same filter (frontend nav
  // links use `event`; the results page historically read `eventType`).
  const eventTypes = parseMultiValue(req.query.eventType ?? req.query.event);
  const budget = String(req.query.budget ?? "any").trim();
  const guests = String(req.query.guests ?? "any").trim();
  const sort = String(req.query.sort ?? "recommended").trim();
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20) || 20));

  const where: Prisma.ProviderWhereInput = {
    status: "live",
  };

  const isNearMe = location.toLowerCase() === "near me";
  if (location && !isNearMe) {
    where.OR = [
      { area: { contains: location, mode: "insensitive" } },
      { locationDisplay: { contains: location, mode: "insensitive" } },
      { province: { contains: location, mode: "insensitive" } },
    ];
  }

  if (q) {
    // Own key (not `OR`) so it doesn't collide with the location OR above —
    // top-level keys on a Prisma `where` object are implicitly AND'd together.
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { detailServices: { has: q } },
          { serviceSlugs: { has: q.toLowerCase() } },
        ],
      },
    ];
  }

  if (serviceTypes.length > 0) {
    where.serviceSlugs = { hasSome: serviceTypes };
  }

  if (eventTypes.length > 0) {
    where.eventSlugs = { hasSome: eventTypes };
  }

  if (budget && budget !== "any") {
    where.budgetLevel = budget as Prisma.EnumBudgetLevelFilter["equals"];
  }

  if (guests && guests !== "any") {
    where.guestLevel = guestLevelToDb(guests);
  }

  const orderBy: Prisma.ProviderOrderByWithRelationInput[] = (() => {
    switch (sort) {
      case "featured":
        return [{ featured: "desc" }, { rating: "desc" }];
      case "rating":
        return [{ rating: "desc" }];
      case "reviews":
        return [{ reviewCount: "desc" }];
      case "price-low":
        return [{ priceValue: "asc" }];
      case "recommended":
      default:
        return [{ promoted: "desc" }, { featured: "desc" }, { rating: "desc" }];
    }
  })();

  const [rows, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { media: true },
    }),
    prisma.provider.count({ where }),
  ]);

  res.json({
    items: rows.map(toProviderListingWithMedia),
    total,
    page,
    limit,
    facets: {
      serviceType: serviceTypes.join(",") || "any",
      eventType: eventTypes.join(",") || "any",
      budget,
      guests,
      location,
    },
  });
});

router.get("/featured", async (req, res) => {
  const limit = Math.min(12, Math.max(1, Number(req.query.limit ?? 3) || 3));

  const rows = await prisma.provider.findMany({
    where: { status: "live", featured: true },
    orderBy: [{ promoted: "desc" }, { rating: "desc" }],
    take: limit,
    include: { media: true },
  });

  res.json(rows.map(toFeaturedProvider));
});

router.get("/:slug", async (req, res) => {
  const slug = req.params.slug;

  const provider = await prisma.provider.findFirst({
    where: {
      status: "live",
      OR: [{ slug }, { aliases: { has: slug } }],
    },
    include: { media: true, reviews: true },
  });

  if (!provider) {
    res.status(404).json({ error: "Provider not found." });
    return;
  }

  // Fire-and-forget view counter — don't block the response on it.
  prisma.provider
    .update({ where: { id: provider.id }, data: { profileViews: { increment: 1 } } })
    .catch(() => {});

  const similar = await prisma.provider.findMany({
    where: {
      status: "live",
      id: { not: provider.id },
      serviceSlugs: { hasSome: provider.serviceSlugs },
    },
    include: { media: true },
    take: 2,
  });

  res.json(toProviderDetail(provider, similar));
});

router.get("/:slug/reviews", async (req, res) => {
  const slug = req.params.slug;

  const provider = await prisma.provider.findFirst({
    where: { OR: [{ slug }, { aliases: { has: slug } }] },
    include: { reviews: true },
  });

  if (!provider) {
    res.status(404).json({ error: "Provider not found." });
    return;
  }

  res.json(
    provider.reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        name: r.authorName,
        rating: r.rating,
        date: r.createdAt.toISOString(),
        comment: r.comment,
      })),
  );
});

// POST /api/providers/:slug/leads — quote form submission (guests allowed).
// See BACKEND_HANDOFF.md section 5.5.
const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  eventType: z.string().optional().default(""),
  eventDate: z.string().optional().default(""),
  guestCount: z.string().optional().default(""),
  location: z.string().optional().default(""),
  budget: z.string().optional().default(""),
  services: z.array(z.string()).optional().default([]),
  message: z.string().min(1),
  contactMethod: z.enum(["WhatsApp", "Phone", "Email"]).optional().default("Email"),
});

router.post("/:slug/leads", leadRateLimit, async (req, res) => {
  const slug = req.params.slug;
  const parsed = leadSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid lead." });
    return;
  }

  const provider = await prisma.provider.findFirst({
    where: { OR: [{ slug }, { aliases: { has: slug } }] },
  });

  if (!provider) {
    res.status(404).json({ error: "Provider not found." });
    return;
  }

  const data = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      providerId: provider.id,
      customerId: req.user?.role === "customer" ? req.user.id : undefined,
      name: data.name,
      email: data.email,
      phone: data.phone,
      eventType: data.eventType,
      eventDate: data.eventDate,
      guests: data.guestCount,
      location: data.location,
      budget: data.budget,
      message: data.message,
      contactMethod: data.contactMethod,
      // Quote form doesn't collect this yet — infer from provider category.
      serviceNeeded: data.services.length > 0 ? data.services.join(", ") : provider.category,
      status: "New",
      urgency: "Medium",
    },
  });

  // Note: we don't maintain a `quoteRequests` counter here anymore — the
  // dashboard now computes the real count live from the Lead table
  // (see GET /api/providers/me/stats), so there's nothing to increment
  // that couldn't just drift out of sync with reality.

  res.status(201).json({ id: lead.id, status: lead.status });
});

export default router;
