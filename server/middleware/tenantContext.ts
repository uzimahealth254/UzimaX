import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';

/**
 * Sets Postgres session GUCs for RLS policies (server/db/sql/rls.sql).
 * Safe no-op if RLS not applied or connection is table owner (owner bypasses RLS).
 * Call after authenticate / apiKeyAuth.
 */
export async function setTenantContext(req: Request, _res: Response, next: NextFunction) {
  try {
    const orgId = req.user?.orgId || req.apiClient?.orgId || '';
    const role = req.user?.role || (req.apiClient ? 'api' : '');
    const userId = req.user?.userId || '';
    const bypass = role === 'admin' || role === 'spv' || role === 'api' ? 'on' : 'off';
    if (role || orgId) {
      await db.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
      await db.execute(sql`select set_config('app.role', ${role}, true)`);
      await db.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
      await db.execute(sql`select set_config('app.bypass_rls', ${bypass}, true)`);
    }
    next();
  } catch (e) {
    console.warn('[rls] setTenantContext failed (continuing)', e);
    next();
  }
}
