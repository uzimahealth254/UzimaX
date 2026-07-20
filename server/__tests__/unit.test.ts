import { describe, it, expect } from 'vitest';
import { generateIOURegistryId, isValidIOURegistryId, luhnCheckDigit } from '../lib/iouId.ts';
import { checkProgramCapacity, computeTenorDays, priceReceivable } from '../lib/pricing.ts';

describe('IOU registry IDs', () => {
  it('generates valid Luhn-checked IDs', () => {
    const id = generateIOURegistryId({ year: 2026, seq: 42 });
    expect(id).toMatch(/^IOU-KE-2026-00042-\d$/);
    expect(isValidIOURegistryId(id)).toBe(true);
  });

  it('rejects tampered check digits', () => {
    const id = generateIOURegistryId({ year: 2026, seq: 7 });
    const bad = id.slice(0, -1) + (id.endsWith('0') ? '1' : '0');
    expect(isValidIOURegistryId(bad)).toBe(false);
  });

  it('luhn is deterministic', () => {
    expect(luhnCheckDigit('202600007')).toBe(luhnCheckDigit('202600007'));
  });
});

describe('pricing & programmes', () => {
  it('computes tenor days', () => {
    expect(computeTenorDays('2026-01-01', '2026-01-31')).toBe(30);
  });

  it('prices receivable within band', () => {
    const r = priceReceivable({
      faceValue: 1_000_000,
      tenorDays: 90,
      band: { discountMin: 4, discountMax: 8, maxTenorDays: 180 },
    });
    expect(r.offerPrice).toBeLessThan(1_000_000);
    expect(r.withinBand).toBe(true);
  });

  it('blocks over-capacity programmes', () => {
    const check = checkProgramCapacity(900_000, 1_000_000, 200_000);
    expect(check.ok).toBe(false);
    expect(check.remaining).toBe(100_000);
  });

  it('allows within capacity', () => {
    expect(checkProgramCapacity(100_000, 1_000_000, 200_000).ok).toBe(true);
  });
});
