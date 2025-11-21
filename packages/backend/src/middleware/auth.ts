import type { Request, Response, NextFunction } from 'express';
import db from '../lib/db';

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function memberGuard(companyIdParam: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const companyId = Number(req.params[companyIdParam]);
    console.log('memberGuard check', { companyId, user });
    // Weryfikacja członkostwa pracownika/właściciela w firmie
    const member = db
      .prepare(
        'SELECT role FROM company_members WHERE companyId = ? AND userId = ?'
      )
      .get(companyId, user.id) as { role?: string } | undefined;
    console.log('memberGuard result', member);
    if (!member) return res.status(403).json({ error: 'Forbidden' });
    req.memberRole = member.role as 'OWNER' | 'WORKER' | undefined;
    next();
  };
}

export function roleGuard(required: 'OWNER' | 'PLATFORM_ADMIN' | 'WORKER') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    // globalna rola PLATFORM_ADMIN
    if (required === 'PLATFORM_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // dla OWNER/WORKER sprawdzimy na podstawie (req as any).memberRole ustawianej przez memberGuard
    if (required !== 'PLATFORM_ADMIN') {
      const memberRole = req.memberRole;
      if (memberRole !== required && !(memberRole === 'OWNER' && required === 'WORKER')) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    next();
  };
}

export function workerOrOwnerGuard(req: Request, res: Response, next: NextFunction) {
  const role = req.memberRole;
  if (!role || (role !== 'WORKER' && role !== 'OWNER')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
