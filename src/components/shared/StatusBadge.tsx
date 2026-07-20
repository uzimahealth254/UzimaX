import { cn } from '@/lib/utils';
import { InvoiceStatus, OfferStatus, ConsentStatus } from '@/types';

type BadgeStatus = InvoiceStatus | OfferStatus | ConsentStatus | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  listed: { label: 'Listed', className: 'bg-blue-50 text-blue-700' },
  awaiting_opt_in: { label: 'Awaiting Opt-in', className: 'bg-amber-50 text-amber-800' },
  opt_in_declined: { label: 'Opt-in Declined', className: 'bg-red-50 text-red-700' },
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700' },
  offer_received: { label: 'Offer Received', className: 'bg-amber-50 text-amber-700' },
  offer_accepted: { label: 'Offer Accepted', className: 'bg-emerald-50 text-emerald-700' },
  assigned: { label: 'Assigned', className: 'bg-indigo-50 text-indigo-700' },
  packaged: { label: 'Packaged', className: 'bg-purple-50 text-purple-700' },
  disbursed: { label: 'Disbursed', className: 'bg-teal-50 text-teal-700' },
  matured: { label: 'Matured', className: 'bg-orange-50 text-orange-700' },
  settled: { label: 'Settled', className: 'bg-emerald-50 text-emerald-700' },
  defaulted: { label: 'Defaulted', className: 'bg-red-50 text-red-700' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  accepted: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-600' },
  signed: { label: 'Signed', className: 'bg-emerald-50 text-emerald-700' },
  structured: { label: 'Structured', className: 'bg-blue-50 text-blue-700' },
  placed: { label: 'Placed', className: 'bg-emerald-50 text-emerald-700' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-50 text-blue-700' },
  due: { label: 'Due', className: 'bg-amber-50 text-amber-700' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700' },
  paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700' },
  released: { label: 'Released', className: 'bg-teal-50 text-teal-700' },
  collected: { label: 'Collected', className: 'bg-emerald-50 text-emerald-700' },
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
