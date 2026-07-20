import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/hooks/usePlatformData';
import PageHeader from '@/components/layout/PageHeader';
import ProfileEditor from '@/components/shared/ProfileEditor';
import { Building2, Mail, Hash, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function BuyerProfilePage() {
  const { user } = useAuth();
  const { organisations, creditRisk } = useData();
  const org = organisations.find((o: any) => o.id === user?.organisationId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Profile" subtitle="Your account and organisation details" />

      <ProfileEditor />

      {creditRisk && (
        <div className="border rounded-2xl p-5 max-w-3xl">
          <h3 className="font-semibold text-sm mb-2">Credit risk profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-2xl font-mono font-bold">{creditRisk.score}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Band</p>
              <p className="text-2xl font-bold">{creditRisk.band}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active exposure</p>
              <p className="font-mono">{Number(creditRisk.metrics?.activeExposure || 0).toLocaleString()} KES</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm">Account</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {user?.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="pt-2 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} />
              <span>Organisation account</span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm">Organisation</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-muted-foreground" />
              <span className="font-medium">{org?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-muted-foreground" />
              <span className="font-mono text-xs">{org?.registrationNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-muted-foreground" />
              <span>{org?.contactEmail}</span>
            </div>
            {org?.sector && (
              <div className="pt-1">
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                  {org.sector}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
