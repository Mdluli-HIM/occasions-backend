import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { attachUser } from "./middleware/auth";
import categoriesRouter from "./routes/categories";
import providersRouter from "./routes/providers";
import authRouter from "./routes/auth";
import meRouter from "./routes/me";
import providerMeRouter from "./routes/provider-me";
import onboardingRouter from "./routes/onboarding";
import statsRouter from "./routes/stats";
import eventsRouter from "./routes/events";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Render (and most PaaS hosts) sit behind a reverse proxy — this makes
// express-rate-limit and req.ip see the real client IP via X-Forwarded-For
// instead of bucketing every request under the proxy's IP.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow the frontend origin to load /uploads images
  }),
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Local media storage for v1 (see src/routes/provider-me.ts) — swap for an
// S3/Cloudinary adapter by changing the multer storage engine only.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(attachUser);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/providers", providersRouter);
app.use("/api/me", meRouter);
app.use("/api/providers/me", providerMeRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/stats", statsRouter);
app.use("/api/events", eventsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Occasions API listening on http://localhost:${PORT}`);
});
