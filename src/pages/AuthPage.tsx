import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleRedirect } from '@/contexts/AuthContext';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'buyer@uzima.co.ke', role: 'buyer', label: 'Buyer' },
  { email: 'supplier@uzima.co.ke', role: 'supplier', label: 'Supplier' },
  { email: 'spv@uzima.co.ke', role: 'spv', label: 'SPV' },
  { email: 'admin@uzima.co.ke', role: 'admin', label: 'Admin' },
];

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const role = DEMO_ACCOUNTS.find((a) => a.email === email)?.role || 'buyer';
      navigate(getRoleRedirect(role));
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      <div className="relative lg:w-1/2 lg:min-h-[100dvh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B3A6E] via-[#1B6BB5] to-[#1A7A4C]" />
        <div className="relative z-10 safe-pad-x safe-pad-top px-6 py-8 lg:p-12 lg:h-full lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <span className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight">Uzima</span>
            </div>
            <p className="text-white/70 text-sm">Trade Receivables / Securitisation Platform · UzimaX</p>
          </div>
          <div className="hidden lg:block space-y-6 mt-12">
            <h2 className="font-display text-3xl xl:text-4xl text-white leading-tight">
              Dual-origin IOUs · SPV assignment · AfyaX-ready APIs
            </h2>
          </div>
          <p className="hidden lg:block text-white/50 text-xs mt-auto">© 2026 Uzima · IP UzimaX</p>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center px-4 py-8 safe-pad-bottom">
        <div className="relative z-10 w-full max-w-md glass-strong rounded-3xl p-5 sm:p-8">
          <h1 className="text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">Demo password: <code className="font-mono">Uzima2026!</code></p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2.5 border rounded-xl text-sm"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2.5 border rounded-xl text-sm pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-medium">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword('Uzima2026!'); }}
                className="text-xs border rounded-xl px-2 py-2.5 min-h-[44px] hover:bg-secondary active:scale-[0.98]"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
