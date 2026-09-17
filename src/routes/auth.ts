import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authRateLimit } from "../middleware/rate-limit";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1).default(""),
  phone: z.string().default(""),
  role: z.enum(["customer", "provider"]).default("customer"),
});

// Called from the frontend's signup form. Does NOT log the user in —
// the frontend follows up with next-auth's signIn("credentials", ...),
// which calls POST /api/auth/login below via the Credentials authorize().
router.post("/register", authRateLimit, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    return;
  }
  const { email, password, name, phone, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone,
      role,
      // Providers get an empty draft profile immediately so
      // GET /api/providers/me works before onboarding finishes.
      provider:
        role === "provider"
          ? {
              create: {
                slug: `provider-${Date.now().toString(36)}`,
                name: name || "New provider",
                contactEmail: email,
                contactPhone: phone,
                contactPerson: name,
                status: "draft",
              },
            }
          : undefined,
    },
  });

  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Called by the frontend's next-auth Credentials provider `authorize()`.
router.post("/login", authRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input." });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;
