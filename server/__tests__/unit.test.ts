import { describe, it, expect } from 'vitest';
import { generateIOURegistryId, isValidIOURegistryId, luhnCheckDigit } from '../lib/iouId.ts';
import { checkProgramCapacity, computeTenorDays, priceReceivable } from '../lib/pricing.ts';
import {
  canonicalizeAssignmentType,
  toAssignmentTrack,
} from '../lib/assignmentTracks.ts';
import {
  packageTotals,
  weightedAvgDiscountBps,
  weightedAvgTenorDays,
} from '../lib/packageMetrics.ts';

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

describe('assignment tracks (WS hybrid)', () => {
  it('maps legacy types to canonical tracks', () => {
    expect(toAssignmentTrack('opt_in_auto')).toBe('standard_confirmation');
    expect(toAssignmentTrack('supplier_originated_auto')).toBe('standard_confirmation');
    expect(toAssignmentTrack('offer_consent')).toBe('negotiated_offer');
    expect(canonicalizeAssignmentType('opt_in_auto')).toBe('standard_confirmation');
    expect(canonicalizeAssignmentType('negotiated_offer')).toBe('negotiated_offer');
  });
});

describe('package metrics (WS-16)', () => {
  it('matches hand-calculated weighted tenor and discount', () => {
    // 1m @ 30d + 3m @ 90d → tenor = (30m + 270m) / 4m = 75
    expect(weightedAvgTenorDays([
      { faceValue: 1_000_000, tenorDays: 30 },
      { faceValue: 3_000_000, tenorDays: 90 },
    ])).toBe(75);

    // 1m @ 500bps + 1m @ 700bps → 600
    expect(weightedAvgDiscountBps([
      { faceValue: 1_000_000, discountBps: 500 },
      { faceValue: 1_000_000, discountBps: 700 },
    ])).toBe(600);
  });

  it('sums package totals', () => {
    expect(packageTotals([
      { faceValue: 100, purchasePrice: 95 },
      { faceValue: 200, purchasePrice: 180 },
    ])).toEqual({ totalFaceValue: 300, totalPurchasePrice: 275 });
  });
});
