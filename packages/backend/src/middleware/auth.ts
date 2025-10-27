import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Define enums locally since they're not exported from @prisma/client
enum PlatformRole {
  USER = 'USER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN'
}

enum CompanyRole {
  OWNER = 'OWNER',
  WORKER = 'WORKER'
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    platformRole: PlatformRole;
  };
}

export interface CompanyAuthenticatedRequest extends AuthenticatedRequest {
  companyMembership?: {
    companyId: string;
    role: CompanyRole;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Add user info to request - will be populated by session middleware
  return next();
}

export function requirePlatformRole(role: PlatformRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.platformRole !== role && req.user.platformRole !== PlatformRole.PLATFORM_ADMIN) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}

export const requirePlatformAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
  requirePlatformRole(PlatformRole.PLATFORM_ADMIN)(req, res, next);

export function requireCompanyRole(role: CompanyRole) {
  return async (req: CompanyAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const companyId = req.params.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const membership = await prisma.companyMembership.findFirst({
      where: {
        userId: req.user.id,
        companyId: companyId,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this company' });
    }

    // Check role hierarchy: OWNER > WORKER
    const roleHierarchy: Record<CompanyRole, number> = {
      [CompanyRole.OWNER]: 2,
      [CompanyRole.WORKER]: 1,
    };

    if (roleHierarchy[membership.role as CompanyRole] < roleHierarchy[role]) {
      return res.status(403).json({ error: 'Insufficient company permissions' });
    }

    req.companyMembership = {
      companyId: membership.companyId,
      role: membership.role as CompanyRole,
    };

    return next();
  };
}

export async function loadUserSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          platformRole: true,
        },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          platformRole: (user.platformRole as PlatformRole) || PlatformRole.USER,
        };
      }
    } catch (error) {
      console.error('Error loading user session:', error);
    }
  }

  return next();
}