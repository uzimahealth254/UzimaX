/** Assignment track semantics (IOUX-COMPLETE-001 §2 Hybrid). */

export type AssignmentTrack = 'standard_confirmation' | 'negotiated_offer';

/** Canonical types written going forward */
export type AssignmentType =
  | 'standard_confirmation'
  | 'negotiated_offer'
  /** @deprecated legacy — still accepted when reading */
  | 'opt_in_auto'
  | 'supplier_originated_auto'
  | 'offer_consent';

export function toAssignmentTrack(type: string | null | undefined): AssignmentTrack {
  if (!type) return 'standard_confirmation';
  if (type === 'negotiated_offer' || type === 'offer_consent') return 'negotiated_offer';
  return 'standard_confirmation';
}

/** Normalize legacy types to canonical names before insert */
export function canonicalizeAssignmentType(
  type: AssignmentType | string,
): 'standard_confirmation' | 'negotiated_offer' {
  return toAssignmentTrack(type) === 'negotiated_offer'
    ? 'negotiated_offer'
    : 'standard_confirmation';
}

export function trackLabel(track: AssignmentTrack): string {
  return track === 'negotiated_offer'
    ? 'Negotiated offer track'
    : 'Standard confirmation track';
}

export function trackExplanation(track: AssignmentTrack, assignedAt?: string | Date | null): string {
  if (track === 'negotiated_offer') {
    return 'Awaiting or completed obligor consent to negotiated terms (OTP).';
  }
  const when = assignedAt
    ? ` — obligor acknowledgement recorded ${typeof assignedAt === 'string' ? assignedAt.slice(0, 10) : assignedAt.toISOString().slice(0, 10)}`
    : '';
  return `Assigned on buyer confirmation${when}.`;
}
