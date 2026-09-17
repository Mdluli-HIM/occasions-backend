import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toProviderListingWithMedia } from "../lib/serializers";

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

export default router;
