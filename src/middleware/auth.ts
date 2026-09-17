import type { NextFunction, Request, Response } from "express";
import { decode } from "next-auth/jwt";

// The frontend's NextAuth instance and this backend must share the same
// NEXTAUTH_SECRET (or AUTH_SECRET) env var. The frontend exposes the raw,
// encrypted session token via GET /api/auth/token (a small Next.js route
// handler — see src/app/api/auth/token/route.ts in the frontend repo) and
// sends it here as `Authorization: Bearer <token>`.

export type AuthedUser = {
  id: string;
  email: string;
  role: "customer" | "provider" | "admin";
  name?: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

async function resolveUser(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const raw = header.slice("Bearer ".length).trim();
  if (!raw) return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn("NEXTAUTH_SECRET is not set — cannot verify session tokens.");
    return null;
  }

  try {
    const token = await decode({ token: raw, secret });
    if (!token || !token.sub) return null;

    return {
      id: token.sub,
      email: (token.email as string) ?? "",
      role: (token.role as AuthedUser["role"]) ?? "customer",
      name: (token.name as string) ?? undefined,
    };
  } catch (error) {
    console.warn("Failed to decode session token:", (error as Error).message);
    return null;
  }
}

/** Attaches req.user when a valid session token is present; never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  req.user = (await resolveUser(req)) ?? undefined;
  next();
}

/** Rejects the request unless a valid session is present. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    req.user = user;
  }
  next();
}

/** Rejects the request unless the session belongs to one of the given roles. */
export function requireRole(...roles: AuthedUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "You do not have access to this resource." });
      return;
    }
    next();
  };
}
