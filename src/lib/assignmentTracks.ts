/** Client-side assignment track helpers (mirrors server/lib/assignmentTracks). */

export type AssignmentTrack = 'standard_confirmation' | 'negotiated_offer';

export function toAssignmentTrack(type: string | null | undefined): AssignmentTrack {
  if (!type) return 'standard_confirmation';
  if (type === 'negotiated_offer' || type === 'offer_consent') return 'negotiated_offer';
  return 'standard_confirmation';
}

export function trackLabel(track: AssignmentTrack): string {
  return track === 'negotiated_offer'
    ? 'Negotiated offer track'
    : 'Standard confirmation track';
}

export function trackExplanation(track: AssignmentTrack, assignedAt?: string | null): string {
  if (track === 'negotiated_offer') {
    return 'Awaiting or completed obligor consent to negotiated terms (OTP).';
  }
  const when = assignedAt ? ` — obligor acknowledgement recorded ${assignedAt.slice(0, 10)}` : '';
  return `Assigned on buyer confirmation${when}.`;
}
