/**
 * Formal IOU registry ID scheme (draft for Sule review — Phase 1).
 * Format: IOU-KE-{YYYY}-{SEQ5}-{CHK}
 * Example: IOU-KE-2026-00042-7
 */

export function luhnCheckDigit(numeric: string): string {
  let sum = 0;
  let alt = false;
  for (let i = numeric.length - 1; i >= 0; i--) {
    let n = parseInt(numeric[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}

let seqCounter = Math.floor(Date.now() % 100000);

export function generateIOURegistryId(opts?: { year?: number; seq?: number }): string {
  const year = opts?.year ?? new Date().getFullYear();
  seqCounter = (opts?.seq ?? seqCounter + 1) % 100000;
  const seq = String(seqCounter).padStart(5, '0');
  const body = `${year}${seq}`;
  const chk = luhnCheckDigit(body);
  return `IOU-KE-${year}-${seq}-${chk}`;
}

export function isValidIOURegistryId(id: string): boolean {
  const m = /^IOU-KE-(\d{4})-(\d{5})-(\d)$/.exec(id);
  if (!m) return false;
  const [, year, seq, chk] = m;
  return luhnCheckDigit(`${year}${seq}`) === chk;
}
