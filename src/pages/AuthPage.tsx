import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getRoleRedirect } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { Eye, EyeOff, Lock, Rocket, ShieldCheck } from 'lucide-react';
import UzimaMark from '@/components/brand/UzimaMark';
import { BRAND } from '@/lib/brand';
import authHero from '../assets/auth-portal-hero.jpg';

const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';
/** Full launch sequence: ignite → smoke → slow rise → exit */
const LAUNCH_MS = 3400;

type Mode = 'login' | 'forgot' | 'reset';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!launching) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [launching]);

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (launching) return;
    resetMessages();
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      const dest = getRoleRedirect(result.role || 'buyer');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setLaunching(true);
      if (launchTimer.current) clearTimeout(launchTimer.current);
      launchTimer.current = setTimeout(() => {
        navigate(dest);
      }, reduced ? 200 : LAUNCH_MS);
    } else {
      setError(result.error || 'Invalid email or password. Please try again.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setOtpHint(SHOW_DEMO ? (data.demoHint || null) : null);
      setInfo(data.message || 'If the account exists, a reset code was sent');
      setMode('reset');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not start password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      setInfo('Password updated. Sign in with your new password.');
      setMode('login');
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpHint(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reset failed — check the code and try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0E1F1A]">
      <img
        src={authHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(8,18,15,0.94) 0%, rgba(14,31,26,0.82) 42%, rgba(14,31,26,0.4) 68%, rgba(14,31,26,0.62) 100%)',
        }}
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col lg:flex-row">
        <div className="flex shrink-0 flex-col justify-between px-5 py-4 sm:px-8 sm:py-5 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-14 lg:py-8">
          <Link to="/" className="inline-flex items-center gap-2.5 w-fit">
            <UzimaMark className="h-8 w-8 lg:h-9 lg:w-9" />
            <span className="font-display text-lg lg:text-xl font-extrabold tracking-tight text-white">{BRAND.name}</span>
          </Link>

          <div className="mt-0 hidden max-w-md min-h-0 lg:block">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D3F36B]">
              Secure access
            </p>
            <h1 className="mt-3 font-display text-[clamp(1.5rem,2.8vh+1rem,2.75rem)] font-extrabold leading-[1.1] tracking-tight text-white">
              {BRAND.tagline}
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/75 max-w-sm">
              Sign in with your organisation credentials to access your role portal.
            </p>
            <div className="mt-4 flex items-start gap-2.5 max-w-sm">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[#D3F36B]" />
              <p className="text-xs font-medium leading-relaxed text-white/55">
                Accounts are provisioned by {BRAND.name} administrators. Contact your programme lead if you need access.
              </p>
            </div>
          </div>

          <p className="hidden text-xs font-medium text-white/35 lg:block">
            © {new Date().getFullYear()} {BRAND.name} · Confidential
          </p>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-contain px-4 py-3 sm:px-8 lg:px-10 lg:py-6">
          <div className="auth-card relative w-full max-w-[400px] shrink-0 overflow-visible rounded-2xl bg-white p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#0E1F1A]">
                  {mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Forgot password' : 'Reset password'}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#5A6B7D]">
                  {mode === 'login'
                    ? 'Organisation portal access'
                    : mode === 'forgot'
                      ? 'We will send a one-time reset code'
                      : 'Enter the code and choose a new password'}
                </p>
              </div>
              <Link
                to="/"
                className="text-xs font-bold text-[#5A6B7D] hover:text-[#0E1F1A] transition-colors shrink-0 pt-1"
              >
                Home
              </Link>
            </div>

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="auth-email" className="block text-[11px] font-bold text-[#3D4F5C] mb-1.5">
                    Work email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organisation.co.ke"
                    className="min-h-[44px] w-full rounded-lg border border-[#D8E0DA] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0E1F1A] placeholder:text-[#0E1F1A]/30 focus:border-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#0E1F1A]/10"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="auth-password" className="block text-[11px] font-bold text-[#3D4F5C]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { resetMessages(); setMode('forgot'); setOtpHint(null); }}
                      className="text-[11px] font-bold text-[#0E1F1A] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="min-h-[44px] w-full rounded-lg border border-[#D8E0DA] bg-white px-3.5 py-2.5 pr-11 text-sm font-semibold text-[#0E1F1A] placeholder:text-[#0E1F1A]/30 focus:border-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#0E1F1A]/10"
                    />
                    <button
                      type="button"
                      className="touch-target absolute right-1 top-1/2 -translate-y-1/2 text-[#5A6B7D] hover:text-[#0E1F1A] rounded-md"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
                    <p className="text-xs font-bold text-red-700">{error}</p>
                  </div>
                )}
                {info && (
                  <div className="rounded-lg border border-[#0E1F1A]/15 bg-[#F4FBE3] px-3 py-2.5" role="status">
                    <p className="text-xs font-bold text-[#0E1F1A]">{info}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || launching}
                  className={`auth-signin-btn relative flex min-h-[46px] w-full items-center justify-center gap-2 overflow-visible rounded-lg bg-[#0E1F1A] py-2.5 text-sm font-bold text-white hover:bg-[#1A3A2E] disabled:opacity-60 transition-colors ${
                    launching ? 'auth-signin-btn--launch' : ''
                  }`}
                >
                  <span className={launching ? 'auth-signin-label-out' : undefined}>
                    {loading ? 'Signing in…' : launching ? 'Launching…' : 'Sign in'}
                  </span>
                  {!loading && (
                    <span
                      className={`auth-rocket-chip flex h-6 w-6 items-center justify-center rounded-md bg-[#D3F36B] text-[#0E1F1A] ${
                        launching ? 'auth-rocket-chip--ignite' : ''
                      }`}
                      aria-hidden
                    >
                      <Rocket size={13} strokeWidth={2.5} className="auth-rocket-icon" />
                    </span>
                  )}
                </button>
              </form>
            )}

            {launching &&
              createPortal(
                <div className="auth-launch-screen" aria-live="polite" aria-busy="true">
                  <div className="auth-launch-pad">
                    <span className="auth-smoke auth-smoke--1" />
                    <span className="auth-smoke auth-smoke--2" />
                    <span className="auth-smoke auth-smoke--3" />
                    <span className="auth-smoke auth-smoke--4" />
                    <span className="auth-smoke auth-smoke--5" />
                    <div className="auth-launch-craft">
                      <span className="auth-exhaust" />
                      <span className="auth-flame auth-flame--core" />
                      <span className="auth-flame auth-flame--outer" />
                      <Rocket size={56} strokeWidth={2} className="auth-craft-icon" />
                    </div>
                  </div>
                  <p className="auth-launch-caption">
                    <span className="auth-launch-caption-line">Ignition</span>
                    <span className="auth-launch-caption-line auth-launch-caption-line--2">Lift off</span>
                    <span className="auth-launch-caption-line auth-launch-caption-line--3">Entering your portal…</span>
                  </p>
                </div>,
                document.body,
              )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-[11px] font-bold text-[#3D4F5C] mb-1.5">
                    Work email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organisation.co.ke"
                    className="min-h-[44px] w-full rounded-lg border border-[#D8E0DA] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0E1F1A] placeholder:text-[#0E1F1A]/30 focus:border-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#0E1F1A]/10"
                  />
                </div>
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
                    <p className="text-xs font-bold text-red-700">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-[#0E1F1A] py-2.5 text-sm font-bold text-white hover:bg-[#1A3A2E] disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
                <button
                  type="button"
                  onClick={() => { resetMessages(); setMode('login'); setOtpHint(null); }}
                  className="w-full text-xs font-bold text-[#5A6B7D] hover:text-[#0E1F1A]"
                >
                  Back to sign in
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleReset} className="mt-6 space-y-4">
                {info && (
                  <div className="rounded-lg border border-[#0E1F1A]/15 bg-[#F4FBE3] px-3 py-2.5" role="status">
                    <p className="text-xs font-bold text-[#0E1F1A]">{info}</p>
                    {SHOW_DEMO && otpHint && (
                      <p className="text-[11px] text-[#5A6B7D] mt-1">
                        Demo code: <span className="font-mono font-bold text-[#0E1F1A]">{otpHint}</span>
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label htmlFor="reset-otp" className="block text-[11px] font-bold text-[#3D4F5C] mb-1.5">
                    Reset code
                  </label>
                  <input
                    id="reset-otp"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={8}
                    inputMode="numeric"
                    className="min-h-[44px] w-full rounded-lg border border-[#D8E0DA] bg-white px-3.5 py-2.5 text-sm font-mono tracking-widest font-semibold text-[#0E1F1A] focus:border-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#0E1F1A]/10"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label htmlFor="reset-password" className="block text-[11px] font-bold text-[#3D4F5C] mb-1.5">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={12}
                    className="min-h-[44px] w-full rounded-lg border border-[#D8E0DA] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0E1F1A] focus:border-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#0E1F1A]/10"
                    placeholder="At least 12 characters"
                  />
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="block text-[11px] font-bold text-[#3D4F5C] mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={12}
                    className="min-h-[44px] w-full rounded-lg border border-[#D8E0DA] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0E1F1A] focus:border-[#0E1F1A] focus:outline-none focus:ring-2 focus:ring-[#0E1F1A]/10"
                  />
                </div>
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
                    <p className="text-xs font-bold text-red-700">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-[#0E1F1A] py-2.5 text-sm font-bold text-white hover:bg-[#1A3A2E] disabled:opacity-60"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
                <button
                  type="button"
                  onClick={() => { resetMessages(); setMode('forgot'); setOtp(''); setOtpHint(null); }}
                  className="w-full text-xs font-bold text-[#5A6B7D] hover:text-[#0E1F1A]"
                >
                  Resend code
                </button>
              </form>
            )}

            <div className="mt-5 flex items-start gap-2 border-t border-[#E8EEE9] pt-4">
              <Lock size={13} className="shrink-0 mt-0.5 text-[#5A6B7D]" />
              <p className="text-[11px] font-medium leading-relaxed text-[#5A6B7D]">
                Access is restricted to invited organisations. Credentials are issued by your {BRAND.name} administrator — do not share your password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
