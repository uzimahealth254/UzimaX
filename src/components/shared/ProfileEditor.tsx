import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', { name, email });
      updateProfile({ name: data.name, email: data.email });
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
