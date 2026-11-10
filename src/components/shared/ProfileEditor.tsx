import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+254');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setPhone(data.phone || '');
      setPhoneCountryCode(data.phoneCountryCode || '+254');
      setSmsOptIn(!!data.smsOptIn);
      setPhoneVerifiedAt(data.phoneVerifiedAt || null);
    }).catch(() => undefined);
  }, []);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', { name, email });
      updateProfile({ name: data.name, email: data.email });
      if (phone.trim()) {
        await api.patch('/me/contact', { phone: phone.trim(), phoneCountryCode, smsOptIn });
      }
      toast.success('Profile saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 max-w-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Full name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0E1F1A] mb-1">Phone</label>
          <div className="flex gap-2">
            <input className="field-input w-24" value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} />
            <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XXXXXXXX" />
          </div>
          <p className="text-[11px] text-[#5A6B7D] mt-1">{phoneVerifiedAt ? 'Phone stored.' : 'SMS is stored as a preference and sends when a provider is connected.'}</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          SMS notifications when a provider is connected
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-[36px] px-4 py-2 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
