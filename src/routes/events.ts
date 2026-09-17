import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toProviderListingWithMedia, toLead } from "../lib/serializers";

const router = Router();

const briefSchema = z.object({
  occasion: z.string().min(1),
  location: z.string().min(1),
  eventDate: z.string().optional().default(""),
  guests: z.string().optional().default(""),
  budget: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  serviceSlugs: z.array(z.string()).min(1),
});

function toEventBrief(brief: {
  id: string;
  occasion: string;
  location: string;
  eventDate: string;
  guests: string;
  budget: string;
  notes: string;
  serviceSlugs: string[];
  createdAt: Date;
}) {
  return {
    id: brief.id,
    occasion: brief.occasion,
    location: brief.location,
    eventDate: brief.eventDate,
    guests: brief.guests,
    budget: brief.budget,
    notes: brief.notes,
    serviceSlugs: brief.serviceSlugs,
    createdAt: brief.createdAt.toISOString(),
  };
}

// POST /api/events — create a new Event Brief for the logged-in customer.
router.post("/", requireAuth, async (req, res) => {
  const parsed = briefSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid event brief." });
    return;
  }

  const data = parsed.data;

  const brief = await prisma.eventBrief.create({
    data: {
      customerId: req.user!.id,
      occasion: data.occasion,
      location: data.location,
      eventDate: data.eventDate,
      guests: data.guests,
      budget: data.budget,
      notes: data.notes,
      serviceSlugs: data.serviceSlugs,
    },
  });

  res.status(201).json(toEventBrief(brief));
});

// GET /api/events/me — the logged-in customer's own briefs, newest first.
router.get("/me", requireAuth, async (req, res) => {
  const briefs = await prisma.eventBrief.findMany({
    where: { customerId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });

  res.json(briefs.map(toEventBrief));
});

// GET /api/events/:id — a single brief (owner only) plus providers matching
// each requested service, grouped by service slug.
router.get("/:id", requireAuth, async (req, res) => {
  const brief = await prisma.eventBrief.findFirst({
    where: { id: req.params.id, customerId: req.user!.id },
  });

  if (!brief) {
    res.status(404).json({ error: "Event brief not found." });
    return;
  }

  const providersByService: Record<string, ReturnType<typeof toProviderListingWithMedia>[]> = {};

  for (const slug of brief.serviceSlugs) {
    const rows = await prisma.provider.findMany({
      where: {
        status: "live",
        serviceSlugs: { has: slug },
        ...(brief.location
          ? {
              OR: [
                { area: { contains: brief.location, mode: "insensitive" } },
                { locationDisplay: { contains: brief.location, mode: "insensitive" } },
                { province: { contains: brief.location, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ promoted: "desc" }, { featured: "desc" }, { rating: "desc" }],
      take: 6,
      include: { media: true },
    });

    providersByService[slug] = rows.map(toProviderListingWithMedia);
  }

  res.json({
    brief: toEventBrief(brief),
    providersByService,
  });
});

const batchLeadSchema = z.object({
  providerIds: z.array(z.string()).min(1),
});

// POST /api/events/:id/leads — send this brief as a quote request to
// several providers at once (spec section 6 / Phase 6: multi-provider
// enquiries). Skips providers this brief has already contacted rather
// than erroring, so a customer can select more providers later without
// duplicating requests.
router.post("/:id/leads", requireAuth, async (req, res) => {
  const brief = await prisma.eventBrief.findFirst({
    where: { id: req.params.id, customerId: req.user!.id },
  });

  if (!brief) {
    res.status(404).json({ error: "Event brief not found." });
    return;
  }

  const parsed = batchLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
    return;
  }

  const { providerIds } = parsed.data;

  const [customer, existingLeads, providers] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user!.id } }),
    prisma.lead.findMany({
      where: { eventBriefId: brief.id, providerId: { in: providerIds } },
      select: { providerId: true },
    }),
    prisma.provider.findMany({
      where: { id: { in: providerIds }, status: "live" },
    }),
  ]);

  if (!customer) {
    res.status(404).json({ error: "Customer account not found." });
    return;
  }

  const alreadyRequested = new Set(existingLeads.map((l) => l.providerId));
  const validProviderIds = new Set(providers.map((p) => p.id));

  const toCreate = providerIds.filter(
    (id) => validProviderIds.has(id) && !alreadyRequested.has(id),
  );

  if (toCreate.length === 0) {
    res.status(200).json({ created: 0, skipped: providerIds.length, leads: [] });
    return;
  }

  const message = [
    `Event Brief: ${brief.occasion}`,
    brief.eventDate ? `Date: ${brief.eventDate}` : null,
    brief.guests ? `Guests: ${brief.guests}` : null,
    brief.budget ? `Budget: ${brief.budget}` : null,
    brief.notes ? `Notes: ${brief.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await prisma.$transaction(
    toCreate.map((providerId) => {
      const provider = providers.find((p) => p.id === providerId)!;
      return prisma.lead.create({
        data: {
          providerId,
          customerId: customer.id,
          eventBriefId: brief.id,
          name: customer.name || "Occasions customer",
          email: customer.email,
          phone: customer.phone,
          eventType: brief.occasion,
          serviceNeeded: provider.category,
          eventDate: brief.eventDate,
          location: brief.location,
          guests: brief.guests,
          budget: brief.budget,
          message,
          status: "New",
          urgency: "Medium",
          contactMethod: "Email",
        },
      });
    }),
  );

  res.status(201).json({
    created: created.length,
    skipped: providerIds.length - toCreate.length,
    leads: created.map(toLead),
  });
});

export default router;
