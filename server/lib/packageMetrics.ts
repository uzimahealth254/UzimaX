/**
 * Face-weighted package metrics (IOUX-FULL-FINISH-001 WS-16).
 * Pure helpers — unit-tested against hand fixtures.
 */
export function weightedAvgTenorDays(
  items: { faceValue: number; tenorDays: number }[],
): number {
  const totalFace = items.reduce((s, i) => s + i.faceValue, 0);
  if (totalFace <= 0) return 0;
  const weighted = items.reduce((s, i) => s + i.faceValue * i.tenorDays, 0);
  return Math.round(weighted / totalFace);
}

export function weightedAvgDiscountBps(
  items: { faceValue: number; discountBps: number }[],
): number {
  const totalFace = items.reduce((s, i) => s + i.faceValue, 0);
  if (totalFace <= 0) return 0;
  const weighted = items.reduce((s, i) => s + i.faceValue * i.discountBps, 0);
  return Math.round(weighted / totalFace);
}

export function packageTotals(items: { faceValue: number; purchasePrice: number }[]) {
  return {
    totalFaceValue: items.reduce((s, i) => s + i.faceValue, 0),
    totalPurchasePrice: items.reduce((s, i) => s + i.purchasePrice, 0),
  };
}
