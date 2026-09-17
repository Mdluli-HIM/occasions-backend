import { Router } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { toDashboardProviderSummary, toLead, buildProfileTasks } from "../lib/serializers";
import { saveFile } from "../lib/storage";

const router = Router();
router.use(requireAuth, requireRole("provider"));

async function getOwnProvider(userId: string) {
  return prisma.provider.findUnique({ where: { userId } });
}

router.get("/", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet — complete onboarding first." });
    return;
  }
  res.json(provider);
});

const profilePatchSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  tagline: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  contactWhatsapp: z.string().optional(),
  responseTime: z.string().optional(),
});

router.patch("/", async (req, res) => {
  const parsed = profilePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile update." });
    return;
  }

  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: parsed.data,
  });

  res.json(updated);
});

// --- Listing editor — src/app/provider-dashboard/listing/page.tsx (section 5.7) ---

router.get("/listing", async (req, res) => {
  const provider = await prisma.provider.findUnique({
    where: { userId: req.user!.id },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  res.json({
    businessName: provider.name,
    location: provider.locationDisplay || [provider.area, provider.province].filter(Boolean).join(", "),
    category: provider.category,
    capacity: provider.capacityLabel || `${provider.capacityMin} - ${provider.capacityMax} guests`,
    areas: provider.areasDisplay || (provider.areasServed.length > 0 ? `${provider.areasServed.length} areas` : "Main area only"),
    rating: provider.reviewCount > 0 ? String(provider.rating) : "New listing",
    description: provider.description,
    services: provider.detailServices,
    occasions: provider.detailEventTypes,
    media: provider.media.map((m) => ({ id: m.id, url: m.url, sortOrder: m.sortOrder })),
    contactPhone: provider.contactPhone,
    contactEmail: provider.contactEmail,
    contactWhatsapp: provider.contactWhatsapp,
  });
});

const listingPatchSchema = z.object({
  businessName: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  capacity: z.string().optional(),
  areas: z.string().optional(),
  description: z.string().optional(),
  services: z.array(z.string()).optional(),
  occasions: z.array(z.string()).optional(),
});

router.patch("/listing", async (req, res) => {
  const parsed = listingPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid listing update." });
    return;
  }
  const data = parsed.data;

  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const update: Record<string, unknown> = {};
  if (data.businessName !== undefined) update.name = data.businessName;
  if (data.location !== undefined) update.locationDisplay = data.location;
  if (data.category !== undefined) update.category = data.category;
  if (data.capacity !== undefined) update.capacityLabel = data.capacity;
  if (data.areas !== undefined) update.areasDisplay = data.areas;
  if (data.description !== undefined) {
    update.description = data.description;
    update.descriptionParagraphs = [];
  }
  if (data.services !== undefined) update.detailServices = data.services;
  if (data.occasions !== undefined) update.detailEventTypes = data.occasions;

  const updated = await prisma.provider.update({ where: { id: provider.id }, data: update });

  res.json({
    businessName: updated.name,
    location: updated.locationDisplay || [updated.area, updated.province].filter(Boolean).join(", "),
    category: updated.category,
    capacity: updated.capacityLabel || `${updated.capacityMin} - ${updated.capacityMax} guests`,
    areas: updated.areasDisplay || "Main area only",
    rating: updated.reviewCount > 0 ? String(updated.rating) : "New listing",
    description: updated.description,
    services: updated.detailServices,
    occasions: updated.detailEventTypes,
  });
});

// --- Dashboard overview — src/data/provider-dashboard.ts ---

router.get("/stats", async (req, res) => {
  const provider = await prisma.provider.findUnique({
    where: { userId: req.user!.id },
    include: { media: true },
  });
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const leadCounts = await prisma.lead.groupBy({
    by: ["status"],
    where: { providerId: provider.id },
    _count: true,
  });
  const countFor = (status: string) => leadCounts.find((l) => l.status === status)?._count ?? 0;
  // Real count from the Lead table — not the `quoteRequests` counter column,
  // which can drift out of sync (e.g. if a lead is ever deleted or reassigned).
  const liveQuoteCount = leadCounts.reduce((sum, l) => sum + l._count, 0);

  // Single source of truth — the exact same checklist that drives the
  // "Listing health" percentage badge, so the two can never disagree.
  const profileTasks = buildProfileTasks(provider);

  res.json({
    provider: toDashboardProviderSummary(provider, liveQuoteCount),
    profileTasks,
    listing: {
      services: provider.detailServices,
      occasions: provider.detailEventTypes,
      areas: provider.areasServed,
      priceFrom: provider.priceLabel,
      capacity: provider.capacityLabel || `${provider.capacityMin} - ${provider.capacityMax} guests`,
      visibility: provider.featured
        ? `Featured in ${provider.category} searches`
        : "Standard search placement",
    },
    leadSummary: {
      new: countFor("New"),
      viewed: countFor("Viewed"),
      contacted: countFor("Contacted"),
      quoted: countFor("Quoted"),
      accepted: countFor("Accepted"),
      completed: countFor("Completed"),
      closed: countFor("Closed"),
    },
  });
});

// --- Leads inbox — src/app/provider-dashboard/leads/page.tsx ---

router.get("/leads", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const leads = await prisma.lead.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  res.json(leads.map(toLead));
});

router.get("/leads/:id", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  let lead = await prisma.lead.findFirst({
    where: { id: req.params.id, providerId: provider.id },
  });

  if (!lead) {
    res.status(404).json({ error: "Lead not found." });
    return;
  }

  // First open of a fresh lead — auto-transition to Viewed.
  if (lead.status === "New") {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "Viewed" },
    });
  }

  res.json(toLead(lead));
});

// Powers the header notification bell — real, currently-unread ("New")
// leads. Intentionally reuses Lead rows rather than a separate
// notifications table; there's no other notification-worthy event in the
// app yet (see BACKEND_HANDOFF.md — no messaging system, no real payments).
router.get("/notifications", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.json({ count: 0, items: [] });
    return;
  }

  const [count, items] = await Promise.all([
    prisma.lead.count({ where: { providerId: provider.id, status: "New" } }),
    prisma.lead.findMany({
      where: { providerId: provider.id, status: "New" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  res.json({
    count,
    items: items.map((l) => ({
      id: l.id,
      name: l.name,
      eventType: l.eventType,
      receivedAt: l.createdAt.toISOString(),
    })),
  });
});

// Bulk-transitions every "New" lead to "Contacted" — powers "Mark all as
// read" on the notification bell. A real bulk update, not a client-side
// loop of individual PATCHes, so it correctly covers every New lead even
// if there are more than the 5 shown in the dropdown preview.
router.post("/notifications/mark-all-read", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.json({ updated: 0 });
    return;
  }

  const result = await prisma.lead.updateMany({
    where: { providerId: provider.id, status: "New" },
    data: { status: "Contacted" },
  });

  res.json({ updated: result.count });
});

const leadPatchSchema = z.object({
  status: z.enum(["New", "Viewed", "Contacted", "Quoted", "Accepted", "Completed", "Closed"]).optional(),
  urgency: z.enum(["High", "Medium", "Low"]).optional(),
});

router.patch("/leads/:id", async (req, res) => {
  const parsed = leadPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lead update." });
    return;
  }

  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const lead = await prisma.lead.findFirst({ where: { id: req.params.id, providerId: provider.id } });
  if (!lead) {
    res.status(404).json({ error: "Lead not found." });
    return;
  }

  const updated = await prisma.lead.update({ where: { id: lead.id }, data: parsed.data });
  res.json(toLead(updated));
});

// --- Settings — src/app/provider-dashboard/settings/page.tsx ---
// Package + contact fields are persisted; notification toggles remain a
// documented stub (the current UI itself labels this section mock data).

router.get("/settings", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  res.json({
    business: {
      name: provider.name,
      category: provider.category,
      location: [provider.area, provider.province].filter(Boolean).join(", "),
      activeSince: provider.createdAt.toISOString(),
    },
    contact: {
      phone: provider.contactPhone,
      email: provider.contactEmail,
      responseTime: provider.responseTime,
      preferredContact: "WhatsApp + Email",
    },
    package: {
      code: provider.packageCode === "starter" ? "Free Listing" : provider.packageCode,
      status: provider.packageStatus,
      visibility: provider.featured ? "Featured search placement" : "Standard placement",
      renewal: provider.packageCode === "starter" ? "No renewal — free" : "Monthly",
    },
    notifications: {
      newLeadAlerts: true,
      weeklySummary: true,
      packageReminders: true,
      marketingTips: false,
    },
  });
});

const settingsPatchSchema = z.object({
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  responseTime: z.string().optional(),
});

router.patch("/settings", async (req, res) => {
  const parsed = settingsPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid settings update." });
    return;
  }

  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const updated = await prisma.provider.update({ where: { id: provider.id }, data: parsed.data });
  res.json({ ok: true, provider: updated });
});

// --- Media upload — see src/lib/storage.ts for the local-disk-vs-R2 switch. ---

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

router.post("/media", upload.array("photos", 10), async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    res.status(400).json({ error: "No files uploaded." });
    return;
  }

  const existingCount = await prisma.media.count({ where: { providerId: provider.id } });

  let uploaded: { url: string }[];
  try {
    uploaded = await Promise.all(
      files.map((file) => {
        const ext = path.extname(file.originalname) || ".jpg";
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        return saveFile({ buffer: file.buffer, filename, contentType: file.mimetype });
      }),
    );
  } catch (error) {
    console.error("Media upload failed:", error);
    res.status(500).json({ error: "Failed to store uploaded images." });
    return;
  }

  const created = await prisma.$transaction(
    uploaded.map((file, index) =>
      prisma.media.create({
        data: {
          providerId: provider.id,
          url: file.url,
          sortOrder: existingCount + index,
        },
      }),
    ),
  );

  await prisma.provider.update({
    where: { id: provider.id },
    data: { photosAddedCount: { increment: created.length } },
  });

  res.status(201).json(created);
});

router.delete("/media/:id", async (req, res) => {
  const provider = await getOwnProvider(req.user!.id);
  if (!provider) {
    res.status(404).json({ error: "No provider profile yet." });
    return;
  }

  const media = await prisma.media.findFirst({
    where: { id: req.params.id, providerId: provider.id },
  });

  if (!media) {
    res.status(404).json({ error: "Photo not found." });
    return;
  }

  await prisma.media.delete({ where: { id: media.id } });

  res.status(204).send();
});

export default router;
