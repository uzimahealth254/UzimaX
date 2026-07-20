import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/client.js';
import { auditLog } from '../db/schema.js';

export async function writeAudit(opts: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLog).values({
    actorId: opts.actorId || null,
    actorEmail: opts.actorEmail || null,
    action: opts.action,
    resourceType: opts.resourceType,
    resourceId: opts.resourceId || null,
    details: opts.details || {},
    ipAddress: opts.ipAddress || null,
  });
}

export function auditAction(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const resourceId = (body as { id?: string })?.id
        || req.params.id
        || null;
      void writeAudit({
        actorId: req.user?.userId || null,
        actorEmail: req.user?.email || req.apiClient?.label || null,
        action,
        resourceType,
        resourceId,
        details: { method: req.method, path: req.path },
        ipAddress: req.ip,
      });
      return originalJson(body);
    }) as typeof res.json;
    next();
  };
}
