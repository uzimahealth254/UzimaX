import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/apiClient';

export default function ClaimKeyPage() {
  const [params] = useSearchParams();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const claim = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/credential-invites/claim', { token: params.get('token') || '' });
      setKey(data.apiKey);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'This link cannot be used');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold">Claim API key</h1>
      <p className="mt-2 text-sm text-[#5A6B7D]">The key is shown once. Copy it before you leave this page.</p>
      {!key && <button className="btn-primary mt-4" type="button" disabled={loading} onClick={claim}>{loading ? 'Checking…' : 'Show key'}</button>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {key && <pre className="mt-4 overflow-x-auto rounded-lg bg-[#0E1F1A] p-4 text-sm text-[#D3F36B]">{key}</pre>}
    </main>
  );
}
