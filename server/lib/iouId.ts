/** IOU-KE-{YYYY}-{SEQ5}-{CHK} with Luhn check digit */

export function luhnCheckDigit(numeric: string): string {
  let sum = 0;
  let alt = false;
  for (let i = numeric.length - 1; i >= 0; i--) {
    let n = parseInt(numeric[i], 10);
    if (Number.isNaN(n)) continue;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}

let seqCounter = 0;

export function generateIOURegistryId(opts?: { year?: number; seq?: number }): string {
  const year = opts?.year ?? new Date().getFullYear();
  if (opts?.seq != null) {
    seqCounter = opts.seq;
  } else {
    seqCounter = (seqCounter + 1) % 100000;
    if (seqCounter === 0) seqCounter = 1;
  }
  const seq = String(seqCounter).padStart(5, '0');
  const chk = luhnCheckDigit(`${year}${seq}`);
  return `IOU-KE-${year}-${seq}-${chk}`;
}

export function isValidIOURegistryId(id: string): boolean {
  const m = /^IOU-KE-(\d{4})-(\d{5})-(\d)$/.exec(id);
  if (!m) return false;
  const [, year, seq, chk] = m;
  return luhnCheckDigit(`${year}${seq}`) === chk;
}

export function generateUzimaPartyId(orgType: string): string {
  const prefix = { buyer: 'BUY', supplier: 'SUP', spv: 'SPV', platform: 'PLT' }[orgType] || 'ORG';
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `UZ-${prefix}-${rand}`;
}
