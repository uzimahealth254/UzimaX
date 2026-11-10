import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/apiClient';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/access-requests/accept', { token: params.get('token') || '', password });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invitation could not be accepted');
    }
  };

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">Set your password</h1>
      {done ? <p className="mt-3">Password saved. Sign in from the portal.</p> : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input className="input w-full" type="password" required minLength={12} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-[#5A6B7D]">At least 12 characters, with upper case, lower case, a number, and a symbol.</p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary" type="submit">Save password</button>
        </form>
      )}
    </main>
  );
}
