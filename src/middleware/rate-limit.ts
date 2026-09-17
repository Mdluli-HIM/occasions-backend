import rateLimit from "express-rate-limit";

// The quote form is intentionally open to guests (BACKEND_HANDOFF.md 5.5),
// which means it's also open to spam/bots once this is public. Cap it per IP.
export const leadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many quote requests from this device. Please try again later." },
});

// Basic brute-force protection on login/register.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
