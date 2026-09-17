import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { toProviderListingWithMedia } from "../lib/serializers";

const router = Router();

router.get("/saved-providers", requireAuth, async (req, res) => {
  const saved = await prisma.savedProvider.findMany({
    where: { customerId: req.user!.id },
    include: { provider: { include: { media: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(saved.map((s) => toProviderListingWithMedia(s.provider)));
});

router.post("/saved-providers/:id", requireAuth, async (req, res) => {
  const providerSlug = req.params.id;

  const provider = await prisma.provider.findFirst({
    where: { OR: [{ slug: providerSlug }, { aliases: { has: providerSlug } }] },
  });

  if (!provider) {
    res.status(404).json({ error: "Provider not found." });
    return;
  }

  await prisma.savedProvider.upsert({
    where: { customerId_providerId: { customerId: req.user!.id, providerId: provider.id } },
    create: { customerId: req.user!.id, providerId: provider.id },
    update: {},
  });

  res.status(201).json({ saved: true });
});

router.delete("/saved-providers/:id", requireAuth, async (req, res) => {
  const providerSlug = req.params.id;

  const provider = await prisma.provider.findFirst({
    where: { OR: [{ slug: providerSlug }, { aliases: { has: providerSlug } }] },
  });

  if (!provider) {
    res.status(404).json({ error: "Provider not found." });
    return;
  }

  await prisma.savedProvider
    .delete({
      where: { customerId_providerId: { customerId: req.user!.id, providerId: provider.id } },
    })
    .catch(() => {
      // Already unsaved — treat as success.
    });

  res.json({ saved: false });
});

const savedSearchSchema = z.object({
  filters: z.record(z.any()),
});

router.post("/saved-searches", requireAuth, async (req, res) => {
  const parsed = savedSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A `filters` object is required." });
    return;
  }

  const savedSearch = await prisma.savedSearch.create({
    data: { customerId: req.user!.id, filters: parsed.data.filters },
  });

  res.status(201).json(savedSearch);
});

router.get("/saved-searches", requireAuth, async (req, res) => {
  const rows = await prisma.savedSearch.findMany({
    where: { customerId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows);
});

export default router;
