import type { Request, Response, NextFunction } from 'express';

type Keyer = (req: Request) => string;

interface Rule {
  windowMs: number;
  max: number;
  keyer: Keyer;
}

const store = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimitStore() {
  store.clear();
}

export function rateLimit(rule: Rule) {
  return (req: any, res: any, next: any) => {
    const key = rule.keyer(req as Request);
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + rule.windowMs });
      return next();
    }
    if (entry.count >= rule.max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    entry.count += 1;
    next();
  };
}

export const loginRateLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyer: (req) => `login:${(req as any).ip || 'unknown'}`,
});

export const reservationRateLimit = rateLimit({
  windowMs: 30_000,
  max: 1,
  keyer: (req) => `reserve:${(req as any).ip || 'unknown'}:${String((req.body as { email?: string } | undefined)?.email || '').toLowerCase()}`,
});
