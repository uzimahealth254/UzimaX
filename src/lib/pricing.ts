/**
 * Uzima SPV purchase engine — tenor-based discount pricing (Phase 2).
 * Not loan interest UI: discount % applied to face value for early purchase.
 */

export interface PricingBand {
  discountMin: number;
  discountMax: number;
  maxTenorDays: number;
}

export interface PricingInput {
  faceValue: number;
  tenorDays: number;
  /** Optional programme / open-market band */
  band?: PricingBand;
  /** Annualised base discount % (default 4) */
  baseRate?: number;
  /** Extra discount % per 30 days of tenor (default 0.35) */
  tenorSpreadPer30d?: number;
}

export interface PricingResult {
  recommendedDiscount: number;
  offerPrice: number;
  margin: number;
  tenorDays: number;
  withinBand: boolean;
  clamped: boolean;
  explanation: string;
}

export function computeTenorDays(issueDate: string, dueDate: string): number {
  const ms = new Date(dueDate).getTime() - new Date(issueDate).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

/** Core formula: base + (tenor/30)*spread, optionally clamped to programme band */
export function priceReceivable(input: PricingInput): PricingResult {
  const base = input.baseRate ?? 4;
  const spread = input.tenorSpreadPer30d ?? 0.35;
  const tenorDays = input.tenorDays;
  let recommended = Math.round((base + (tenorDays / 30) * spread) * 100) / 100;
  let clamped = false;

  if (input.band) {
    const before = recommended;
    recommended = Math.min(input.band.discountMax, Math.max(input.band.discountMin, recommended));
    clamped = before !== recommended;
  }

  const offerPrice = Math.round(input.faceValue * (1 - recommended / 100));
  const margin = input.faceValue - offerPrice;
  const withinBand = !input.band
    || (recommended >= input.band.discountMin
      && recommended <= input.band.discountMax
      && tenorDays <= input.band.maxTenorDays);

  return {
    recommendedDiscount: recommended,
    offerPrice,
    margin,
    tenorDays,
    withinBand,
    clamped,
    explanation: `Tenor ${tenorDays}d → ~${recommended}% discount (base ${base}% + ${spread}% per 30 days)${clamped ? ' [clamped to programme band]' : ''}`,
  };
}

export function checkProgramCapacity(
  utilised: number,
  maxFacility: number,
  amount: number,
): { ok: boolean; remaining: number; message?: string } {
  const remaining = maxFacility - utilised;
  if (amount > remaining) {
    return {
      ok: false,
      remaining,
      message: `Amount exceeds remaining programme capacity (${remaining.toLocaleString()} KES)`,
    };
  }
  return { ok: true, remaining };
}
