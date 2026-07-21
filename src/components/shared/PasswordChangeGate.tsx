import { useState } from 'react';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

/** Blocks portal until invited users set a permanent password */
export default function PasswordChangeGate({ children }: { children: React.ReactNode }) {
  const { user, refreshUser, logout } = useAuth();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user?.mustChangePassword) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      await refreshUser();
      toast.success('Password updated');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E1F1A]/70 p-4">
      <div className="w-full max-w-md rounded-xl bg-white border border-[#0E1F1A]/10 p-6 space-y-4 shadow-xl">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#D3F36B] flex items-center justify-center shrink-0">
            <Lock size={16} className="text-[#0E1F1A]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0E1F1A]">Set a new password</h2>
            <p className="text-[11px] text-[#5A6B7D] mt-0.5 leading-relaxed">
              Your account was provisioned with a temporary password. Choose a permanent password to continue.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-[#5A6B7D]">Temporary password</label>
            <input
              type="password"
              required
              className="field-input mt-1"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#5A6B7D]">New password</label>
            <input
              type="password"
              required
              minLength={12}
              className="field-input mt-1"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 12 characters"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#5A6B7D]">Confirm new password</label>
            <input
              type="password"
              required
              minLength={12}
              className="field-input mt-1"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-bold text-red-700">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#0E1F1A] text-white text-xs font-bold hover:bg-[#1A3A2E] disabled:opacity-60"
          >
            {busy ? 'Updating…' : 'Update password & continue'}
            {!busy && <ArrowRight size={13} />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full text-[11px] font-bold text-[#5A6B7D] hover:text-[#0E1F1A]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
