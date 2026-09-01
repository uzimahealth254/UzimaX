import { cn } from '@/lib/utils';
import { InvoiceStatus, OfferStatus, ConsentStatus } from '@/types';

type BadgeStatus = InvoiceStatus | OfferStatus | ConsentStatus | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  listed: { label: 'Listed', className: 'bg-blue-50 text-blue-700' },
  awaiting_opt_in: { label: 'Awaiting Opt-in', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  awaiting_buyer_verification: { label: 'Awaiting Verification', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  opt_in_declined: { label: 'Opt-in Declined', className: 'bg-red-50 text-red-700' },
  verified: { label: 'Verified', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  offer_received: { label: 'Offer Received', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  offer_accepted: { label: 'Offer Accepted', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  pending_settlement: { label: 'Pending Settlement', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  assigned: { label: 'Assigned', className: 'bg-indigo-50 text-indigo-700' },
  packaged: { label: 'Packaged', className: 'bg-purple-50 text-purple-700' },
  disbursed: { label: 'Disbursed', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  matured: { label: 'Matured', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  settled: { label: 'Settled', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  defaulted: { label: 'Defaulted', className: 'bg-red-50 text-red-700' },
  pending: { label: 'Pending', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  accepted: { label: 'Accepted', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-600' },
  signed: { label: 'Signed', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  structured: { label: 'Structured', className: 'bg-blue-50 text-blue-700' },
  ready_for_submission: { label: 'Ready for submission', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  placed: { label: 'Placed', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-50 text-blue-700' },
  due: { label: 'Due', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700' },
  paid: { label: 'Paid', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  active: { label: 'Active', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  paused: { label: 'Paused', className: 'bg-[#FFF8E0] text-[#8A6A00]' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700' },
  released: { label: 'Released', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  collected: { label: 'Collected', className: 'bg-[#F4FBE3] text-[#1A3A2E]' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium font-mono uppercase', config.className, className)}>
      {config.label}
    </span>
  );
}
