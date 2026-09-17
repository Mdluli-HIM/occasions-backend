import { Router } from "express";
import { prisma } from "../lib/prisma";
import { SERVICES, OCCASIONS } from "../lib/taxonomy";

const router = Router();

router.get("/services", async (_req, res) => {
  const rows = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });

  const list = rows.length
    ? rows.map((s) => ({
        slug: s.slug,
        label: s.label,
        image: s.homepageImage,
        description: s.homepageDescription,
      }))
    : SERVICES.map((s) => ({
        slug: s.slug,
        label: s.label,
        image: `/images/services/${s.slug}.jpg`,
        description: "",
      }));

  // Real, live counts — how many *live* providers actually offer each
  // service — rather than a static seeded number that goes stale the
  // moment a provider is added, removed, or changes their listing.
  const counts = await Promise.all(
    list.map((s) =>
      prisma.provider.count({
        where: { status: "live", serviceSlugs: { has: s.slug } },
      }),
    ),
  );

  res.json(
    list.map((s, index) => ({
      id: s.slug,
      name: s.label,
      count: counts[index],
      image: s.image,
      description: s.description,
    })),
  );
});

router.get("/occasions", async (_req, res) => {
  const rows = await prisma.occasion.findMany({ orderBy: { sortOrder: "asc" } });

  if (rows.length === 0) {
    res.json(
      OCCASIONS.filter((o) => o.homepageId).map((o) => ({
        id: o.homepageId,
        name: o.label,
        description: "",
      })),
    );
    return;
  }

  res.json(
    rows
      .filter((o) => o.homepageId)
      .map((o) => ({
        id: o.homepageId,
        name: o.label,
        description: o.homepageDescription,
      })),
  );
});

export default router;
