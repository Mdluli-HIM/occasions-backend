import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ONBOARDING_SERVICE_MAP, mapOccasionLabelsToSlugs } from "../lib/taxonomy";
import { slugify, guestLevelFromMax, normaliseWhatsapp } from "../lib/slugify";

const router = Router();

// Mirrors the frontend's FormState (src/components/provider-onboarding/provider-onboarding-flow.tsx).
// Every field is optional so each step can PATCH just what it collected.
const onboardingSchema = z.object({
  area: z.string().optional(),
  province: z.string().optional(),
  mainService: z.string().optional(),
  serviceModel: z.string().optional(),
  minGuests: z.number().int().nonnegative().optional(),
  maxGuests: z.number().int().nonnegative().optional(),
  yearsExperience: z.number().int().nonnegative().optional(),
  responseTime: z.string().optional(),
  coverageAreas: z.array(z.string()).optional(),
  photosAdded: z.number().int().nonnegative().optional(),
  selectedServices: z.array(z.string()).optional(),
  selectedOccasions: z.array(z.string()).optional(),
  listingTitle: z.string().optional(),
  description: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  // Sent by the "success" step to publish the draft.
  finalize: z.boolean().optional(),
});

async function upsertOnboarding(req: any, res: any) {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid onboarding data." });
    return;
  }
  const data = parsed.data;

  let provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });

  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        userId: req.user.id,
        slug: `provider-${Date.now().toString(36)}`,
        name: "New provider",
        status: "draft",
      },
    });
  }

  const update: Record<string, unknown> = {};

  if (data.area !== undefined) update.area = data.area;
  if (data.province !== undefined) update.province = data.province;

  if (data.mainService !== undefined) {
    const mapped = ONBOARDING_SERVICE_MAP[data.mainService];
    update.category = mapped?.category ?? data.mainService;
    update.serviceSlugs = mapped?.serviceSlugs ?? [];
  }

  if (data.serviceModel !== undefined) update.serviceModel = data.serviceModel;

  if (data.minGuests !== undefined) update.capacityMin = data.minGuests;
  if (data.maxGuests !== undefined) {
    update.capacityMax = data.maxGuests;
    update.guestLevel = guestLevelFromMax(data.maxGuests);
  }

  if (data.yearsExperience !== undefined) {
    update.yearsExperience = `${data.yearsExperience}+ years`;
  }
  if (data.responseTime !== undefined) update.responseTime = data.responseTime;

  if (data.coverageAreas !== undefined) {
    update.areasServed = data.coverageAreas;
    update.areasDisplay = data.coverageAreas.length > 0 ? `${data.coverageAreas.length} areas` : null;
  }

  if (data.photosAdded !== undefined) update.photosAddedCount = data.photosAdded;

  if (data.selectedServices !== undefined) update.detailServices = data.selectedServices;
  if (data.selectedOccasions !== undefined) {
    update.detailEventTypes = data.selectedOccasions;
    update.eventSlugs = mapOccasionLabelsToSlugs(data.selectedOccasions);
  }

  if (data.listingTitle !== undefined && data.listingTitle.trim()) {
    update.name = data.listingTitle;
  }
  if (data.description !== undefined) {
    update.description = data.description;
    update.descriptionParagraphs = [];
  }

  if (data.contactName !== undefined) update.contactPerson = data.contactName;
  if (data.phone !== undefined) {
    update.contactPhone = data.phone;
    update.contactWhatsapp = normaliseWhatsapp(data.phone);
  }
  if (data.email !== undefined) update.contactEmail = data.email;

  if (data.finalize) {
    update.status = "live";

    // Mint a real slug from the listing title the first time the draft is published.
    if (provider.slug.startsWith("provider-")) {
      const base = slugify((update.name as string) ?? provider.name) || "provider";
      let candidate = base;
      let suffix = 1;
      // eslint-disable-next-line no-await-in-loop
      while (await prisma.provider.findFirst({ where: { slug: candidate, NOT: { id: provider.id } } })) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      update.slug = candidate;
    }
  }

  const updated = await prisma.provider.update({ where: { id: provider.id }, data: update });

  res.json({ id: updated.slug, status: updated.status });
}

router.patch("/", requireAuth, requireRole("provider"), upsertOnboarding);
router.post("/", requireAuth, requireRole("provider"), upsertOnboarding);

router.get("/", requireAuth, requireRole("provider"), async (req, res) => {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user!.id } });
  if (!provider) {
    res.json(null);
    return;
  }

  res.json({
    area: provider.area,
    province: provider.province,
    mainService: provider.category,
    serviceModel: provider.serviceModel,
    minGuests: provider.capacityMin,
    maxGuests: provider.capacityMax,
    responseTime: provider.responseTime,
    coverageAreas: provider.areasServed,
    photosAdded: provider.photosAddedCount,
    selectedServices: provider.detailServices,
    selectedOccasions: provider.detailEventTypes,
    listingTitle: provider.name,
    description: provider.description,
    contactName: provider.contactPerson,
    phone: provider.contactPhone,
    email: provider.contactEmail,
    status: provider.status,
  });
});

export default router;
