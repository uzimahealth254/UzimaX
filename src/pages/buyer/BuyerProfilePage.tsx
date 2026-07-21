import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import ProfileEditor from '@/components/shared/ProfileEditor';
import ProfileHub from '@/components/shared/ProfileHub';
import SignatoriesPage from '@/pages/shared/SignatoriesPage';
import BuyerApiPage from '@/pages/buyer/BuyerApiPage';
import { Building2, Mail, Hash, Calendar } from 'lucide-react';

export default function BuyerProfilePage() {
  const { user } = useAuth();
  const { organisations, creditRisk } = useData();
  const org = organisations.find((o: any) => o.id === user?.organisationId);
  const kyc = (org?.metadata || {}) as Record<string, string | null | undefined>;

  const account = (
    <div className="space-y-4">
      <div className="portal-grid-2 !gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D] mb-2">Profile</p>
          <ProfileEditor />
        </div>
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D]">Account</p>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold bg-[#D3F36B] text-[#0E1F1A]">
              {user?.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0E1F1A] truncate">{user?.name}</p>
              <p className="text-xs text-[#5A6B7D] truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#5A6B7D]">
            <Calendar size={12} />
            <span>Organisation account</span>
          </div>
        </div>
      </div>

      <div className="portal-grid-2 !gap-3">
        <div className="space-y-2 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D]">Organisation</p>
          <div className="flex items-center gap-2">
            <Building2 size={13} className="text-[#5A6B7D] shrink-0" />
            <span className="font-semibold text-[#0E1F1A] text-xs">{org?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash size={13} className="text-[#5A6B7D] shrink-0" />
            <span className="font-mono text-[11px]">{org?.registrationNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-[#5A6B7D] shrink-0" />
            <span className="text-xs truncate">{org?.contactEmail}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#0E1F1A]/8 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D]">Organisation KYC</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">KRA PIN</p>
                <p className="font-mono text-[#0E1F1A] mt-0.5">{kyc.kraPin || '—'}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">PPB registration</p>
                <p className="font-mono text-[#0E1F1A] mt-0.5">{kyc.ppbRegistration || '—'}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5 sm:col-span-2">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Address</p>
                <p className="text-[#0E1F1A] mt-0.5">{kyc.address || '—'}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">KYC status</p>
                <p className="font-semibold capitalize text-[#0E1F1A] mt-0.5">{kyc.kycStatus || 'pending'}</p>
              </div>
            </div>
          </div>
        </div>
        {creditRisk && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7D] mb-2">Credit risk</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Score</p>
                <p className="text-xl font-mono font-bold text-[#0E1F1A] mt-0.5 leading-none">{creditRisk.score}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Band</p>
                <p className="text-xl font-bold text-[#0E1F1A] mt-0.5 leading-none">{creditRisk.band}</p>
              </div>
              <div className="rounded-md bg-[#f7faf6] border border-[#0E1F1A]/6 p-2.5">
                <p className="text-[10px] font-semibold text-[#5A6B7D]">Exposure</p>
                <p className="text-xs font-mono font-bold text-[#0E1F1A] mt-1">
                  {Number(creditRisk.metrics?.activeExposure || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = useMemo(() => [
    { id: 'account', label: 'Account', content: null },
    { id: 'signatories', label: 'Signatories', content: <SignatoriesPage embedded /> },
    { id: 'developer', label: 'Developer', content: <BuyerApiPage embedded /> },
  ], []);

  return <ProfileHub tabs={tabs} account={account} />;
}
