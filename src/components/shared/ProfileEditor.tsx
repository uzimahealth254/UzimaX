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
    <form onSubmit={handleSave} className="border rounded-lg p-5 space-y-4 max-w-md">
      <h3 className="font-semibold text-sm">Edit Account</h3>
      <div>
        <label className="block text-sm font-medium mb-1.5">Full Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
