/**
 * Plant a known OTP hash for smoke tests against hosted DB (.env.render).
 * Only used when SMOKE_PLANT_OTP=1.
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

function loadRenderUrl(): string {
  if (process.env.DATABASE_URL && /supabase|render|neon/i.test(process.env.DATABASE_URL)) {
    return process.env.DATABASE_URL;
  }
  const renderEnv = path.resolve(process.cwd(), '.env.render');
  if (!fs.existsSync(renderEnv)) throw new Error('.env.render missing for OTP plant');
  const text = fs.readFileSync(renderEnv, 'utf8');
  let url = '';
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k === 'DATABASE_URL') url = v;
  }
  if (!url) throw new Error('DATABASE_URL not found in .env.render');
  return url;
}

export async function plantOtp(userId: string, purpose: string, code = '123456') {
  const url = loadRenderUrl();
  const sql = postgres(url, { max: 1, ssl: 'require', connect_timeout: 20 });
  try {
    const hash = await bcrypt.hash(code, 12);
    await sql`
      update otp_codes
      set consumed_at = now()
      where user_id = ${userId}::uuid
        and purpose = ${purpose}
        and consumed_at is null
    `;
    await sql`
      insert into otp_codes (user_id, purpose, code_hash, expires_at)
      values (${userId}::uuid, ${purpose}, ${hash}, now() + interval '10 minutes')
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
