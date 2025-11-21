import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const status = typeof (err as { status?: number }).status === 'number'
    ? (err as { status?: number }).status!
    : 500;
  console.error('Error:', err);
  res.status(status).json({ error: message });
}
