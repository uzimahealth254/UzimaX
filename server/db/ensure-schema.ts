import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pgClient } from './client.js';

const FILES = [
  '0001_platform_integration.sql',
  '0002_afyax_webhook_format.sql',
  '0003_docs_users.sql',
  '0004_instrument_documents.sql',
  '0005_phase_completion.sql',
  '0006_readiness.sql',
];

/**
 * Apply the additive SQL that schema.ts already expects.
 * Safe to run on every boot (each statement is IF NOT EXISTS).
 * A failure is logged and does not stop later files, so one old
 * statement cannot leave the login columns unapplied.
 */
export async function ensureSchema(): Promise<void> {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
  const failed: string[] = [];
  for (const file of FILES) {
    const body = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await pgClient.unsafe(body);
      console.info(`[schema] ${file} ok`);
    } catch (e) {
      failed.push(file);
      console.error(`[schema] ${file} failed`, e);
    }
  }
  if (failed.length) {
    console.error(`[schema] incomplete: ${failed.join(', ')}`);
  }
}
