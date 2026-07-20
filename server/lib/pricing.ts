export interface PricingBand {
  discountMin: number;
  discountMax: number;
  maxTenorDays: number;
}

export interface PricingInput {
  faceValue: number;
  tenorDays: number;
  band?: PricingBand;
  baseRate?: number;
  tenorSpreadPer30d?: number;
}

export interface PricingResult {
  recommendedDiscount: number;
  recommendedBps: number;
  offerPrice: number;
  margin: number;
  tenorDays: number;
  withinBand: boolean;
  clamped: boolean;
  explanation: string;
}

export function computeTenorDays(issueDate: string | Date, dueDate: string | Date): number {
  const a = typeof issueDate === 'string' ? new Date(issueDate) : issueDate;
  const b = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

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
    recommendedBps: Math.round(recommended * 100),
    offerPrice,
    margin,
    tenorDays,
    withinBand,
    clamped,
    explanation: `Tenor ${tenorDays}d → ~${recommended}% discount`,
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
