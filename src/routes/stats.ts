import { Router } from "express";
import { prisma } from "../lib/prisma";
import { SERVICES, OCCASIONS } from "../lib/taxonomy";

const router = Router();

// Real, computed numbers for marketing/about-page use — never hand-typed
// figures that go stale as providers are added or removed.
router.get("/", async (_req, res) => {
  const liveProviders = await prisma.provider.findMany({
    where: { status: "live" },
    select: { province: true, area: true },
  });

  const providerCount = liveProviders.length;
  const provinceCount = new Set(
    liveProviders.map((p) => p.province).filter(Boolean),
  ).size;

  const areaFrequency = new Map<string, number>();
  for (const p of liveProviders) {
    if (!p.area) continue;
    areaFrequency.set(p.area, (areaFrequency.get(p.area) ?? 0) + 1);
  }
  const topAreas = [...areaFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([area]) => area);

  res.json({
    providerCount,
    provinceCount,
    serviceCount: SERVICES.length,
    occasionCount: OCCASIONS.length,
    topAreas,
  });
});

export default router;
