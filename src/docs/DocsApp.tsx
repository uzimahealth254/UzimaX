import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiBase';

const TOKEN_KEY = 'docs_access';

type DocsUser = {
  id: string;
  email: string;
  name: string;
  role: 'docs_admin' | 'docs_reader';
  mustChangePassword?: boolean;
};

type ChapterIndex = { id: string; group: string; title: string; summary: string };
type Chapter = ChapterIndex & { markdown: string };
type AccessRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

export function isDocsHost(): boolean {
  const host = window.location.hostname;
  return host === 'docs.ioux.africa' || host.startsWith('docs.');
}

export function isDocsSurface(): boolean {
  if (isDocsHost()) return true;
  const path = window.location.pathname;
  return path === '/docs' || path.startsWith('/docs/');
}

function docsPath(suffix = ''): string {
  const base = isDocsHost() ? '' : '/docs';
  if (!suffix) return base || '/';
  return `${base}/${suffix.replace(/^\//, '')}`;
}

async function docsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${getApiBaseUrl()}/api/v1/docs-auth${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && path !== '/login') {
    sessionStorage.removeItem(TOKEN_KEY);
  }
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Request failed');
  return data as T;
}

export default function DocsApp() {
  const host = isDocsHost();
  return (
    <Routes>
      <Route path={host ? '/' : '/docs'} element={<DocsShell />} />
      <Route path={host ? '/:chapterId' : '/docs/:chapterId'} element={<DocsShell />} />
      <Route path="*" element={<Navigate to={docsPath()} replace />} />
    </Routes>
  );
}

function DocsShell() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<DocsUser | null>(null);
  const [ready, setReady] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'reset'>('login');

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    docsApi<DocsUser>('/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Loading documentation…</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        view={authView}
        setView={setAuthView}
        onSignedIn={(next) => {
          setUser(next);
          if (!chapterId) navigate(docsPath('overview'), { replace: true });
        }}
      />
    );
  }

  if (user.mustChangePassword) {
    return <ChangePassword user={user} onDone={() => setUser({ ...user, mustChangePassword: false })} onSignOut={() => signOut(setUser)} />;
  }

  const page = chapterId === 'access' ? 'access' : (chapterId || 'overview');
  if (page === 'access' && user.role !== 'docs_admin') {
    return <Navigate to={docsPath('overview')} replace />;
  }

  return (
    <Reader
      user={user}
      page={page}
      onSignOut={() => signOut(setUser)}
      onOpen={(id) => navigate(docsPath(id))}
    />
  );
}

function signOut(setUser: (u: DocsUser | null) => void) {
  sessionStorage.removeItem(TOKEN_KEY);
  setUser(null);
}

function AuthScreen({
  view, setView, onSignedIn,
}: {
  view: 'login' | 'forgot' | 'reset';
  setView: (v: 'login' | 'forgot' | 'reset') => void;
  onSignedIn: (user: DocsUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (view === 'login') {
        const data = await docsApi<{ accessToken: string; user: DocsUser }>('/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        sessionStorage.setItem(TOKEN_KEY, data.accessToken);
        onSignedIn(data.user);
      } else if (view === 'forgot') {
        const data = await docsApi<{ message: string; demoHint?: string }>('/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setInfo(data.demoHint ? `${data.message}. Dev code: ${data.demoHint}` : data.message);
        setView('reset');
      } else {
        await docsApi('/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, otp, newPassword: password }),
        });
        setInfo('Password updated. Sign in with the new password.');
        setPassword('');
        setOtp('');
        setView('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  const title = view === 'login' ? 'Sign in to the handbook' : view === 'forgot' ? 'Forgot password' : 'Reset password';

  return (
    <div className="min-h-dvh bg-[#0E1F1A] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.18em] uppercase text-[#D3F36B]">IOU Exchange</p>
        <h1 className="mt-2 text-3xl font-semibold">System documentation</h1>
        <p className="mt-2 text-sm text-white/70">Access is by invitation. A revoked email cannot open these pages.</p>
        <form onSubmit={onSubmit} className="mt-8 rounded-2xl bg-white text-[#0E1F1A] p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <label className="block text-sm">
            Email
            <input className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          {view !== 'forgot' && (
            <label className="block text-sm">
              {view === 'reset' ? 'New password' : 'Password'}
              <input className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2" type="password" required minLength={view === 'reset' ? 12 : 1} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={view === 'login' ? 'current-password' : 'new-password'} />
            </label>
          )}
          {view === 'reset' && (
            <label className="block text-sm">
              Code from email
              <input className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 tracking-widest" required value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            </label>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {info && <p className="text-sm text-emerald-800">{info}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-[#0E1F1A] text-[#D3F36B] py-2.5 font-semibold disabled:opacity-60" type="submit">
            {busy ? 'Please wait…' : view === 'login' ? 'Sign in' : view === 'forgot' ? 'Email me a code' : 'Save password'}
          </button>
          <div className="text-sm text-black/60 flex justify-between">
            {view === 'login' ? (
              <button type="button" className="underline" onClick={() => { setError(''); setView('forgot'); }}>Forgot password</button>
            ) : (
              <button type="button" className="underline" onClick={() => { setError(''); setView('login'); }}>Back to sign in</button>
            )}
            <span>docs.ioux.africa</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePassword({ user, onDone, onSignOut }: { user: DocsUser; onDone: () => void; onSignOut: () => void }) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await docsApi('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#f6f7f4] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl border p-6 space-y-4">
        <h1 className="text-xl font-semibold">Choose your password</h1>
        <p className="text-sm text-muted-foreground">{user.email} is using a temporary password.</p>
        <input className="w-full rounded-lg border px-3 py-2" type="password" required placeholder="Current password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        <input className="w-full rounded-lg border px-3 py-2" type="password" required minLength={12} placeholder="New password" value={newPassword} onChange={(e) => setNext(e.target.value)} />
        <p className="text-xs text-muted-foreground">At least 12 characters, with upper, lower, a number, and a symbol.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-[#0E1F1A] text-[#D3F36B] py-2.5 font-semibold" type="submit">{busy ? 'Saving…' : 'Continue'}</button>
        <button type="button" className="text-sm underline" onClick={onSignOut}>Sign out</button>
      </form>
    </div>
  );
}

function Reader({
  user, page, onOpen, onSignOut,
}: {
  user: DocsUser;
  page: string;
  onOpen: (id: string) => void;
  onSignOut: () => void;
}) {
  const [chapters, setChapters] = useState<ChapterIndex[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState('');
  const [openNav, setOpenNav] = useState(false);

  useEffect(() => {
    docsApi<{ data: ChapterIndex[] }>('/chapters').then((r) => setChapters(r.data)).catch((e) => {
      if (!sessionStorage.getItem(TOKEN_KEY)) onSignOut();
      else setError(e.message);
    });
  }, []);

  useEffect(() => {
    if (page === 'access') {
      setChapter(null);
      return;
    }
    setError('');
    docsApi<Chapter>(`/chapters/${page}`)
      .then(setChapter)
      .catch((e) => {
        if (!sessionStorage.getItem(TOKEN_KEY)) onSignOut();
        else setError(e.message);
      });
  }, [page]);

  const groups = useMemo(() => {
    const map = new Map<string, ChapterIndex[]>();
    for (const ch of chapters) {
      const list = map.get(ch.group) || [];
      list.push(ch);
      map.set(ch.group, list);
    }
    return [...map.entries()];
  }, [chapters]);

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#f4f6f2] text-[#0E1F1A]">
      <header className="shrink-0 z-20 flex items-center justify-between gap-3 border-b bg-[#0E1F1A] text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button className="md:hidden text-sm border border-white/20 rounded px-2 py-1" type="button" onClick={() => setOpenNav((v) => !v)}>Menu</button>
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#D3F36B]">IOU Exchange</p>
            <p className="text-sm font-semibold">System documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-white/70">{user.email}</span>
          {user.role === 'docs_admin' && (
            <button type="button" className="rounded bg-[#D3F36B] text-[#0E1F1A] px-3 py-1 font-semibold" onClick={() => { setOpenNav(false); onOpen('access'); }}>Access</button>
          )}
          <button type="button" className="underline text-white/80" onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      <div className="flex-1 min-h-0 md:grid md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${openNav ? 'block' : 'hidden'} md:block fixed md:static top-14 bottom-0 left-0 z-30 w-[220px] border-r bg-white h-auto md:h-full overflow-hidden p-2`}>
          {groups.map(([group, items]) => (
            <div key={group} className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-black/45 mb-0.5 px-2">{group}</p>
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => { setOpenNav(false); onOpen(item.id); }}
                      className={`w-full text-left text-[12px] leading-tight rounded-md px-2 py-0.5 ${page === item.id ? 'bg-[#0E1F1A] text-[#D3F36B]' : 'hover:bg-black/5'}`}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <main className="h-full overflow-y-auto px-5 py-8 md:px-12">
          <div className="max-w-3xl pb-16">
          {error && <p className="text-sm text-red-700">{error}</p>}
          {page === 'access' ? <AccessPanel /> : chapter ? (
            <>
              <p className="text-xs uppercase tracking-wider text-black/45">{chapter.group}</p>
              <h1 className="text-3xl font-semibold mt-1">{chapter.title}</h1>
              <p className="mt-2 text-black/60">{chapter.summary}</p>
              <article className="mt-8 space-y-4 leading-relaxed">{renderMarkdown(chapter.markdown)}</article>
            </>
          ) : !error ? <p className="text-sm text-black/50">Loading chapter…</p> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function AccessPanel() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'docs_reader' | 'docs_admin'>('docs_reader');
  const [temp, setTemp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await docsApi<{ data: AccessRow[] }>('/users');
    setRows(data.data);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setTemp('');
    try {
      const created = await docsApi<{ temporaryPassword?: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({ email, name, role }),
      });
      setTemp(created.temporaryPassword || '');
      setEmail('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not grant access');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: 'active' | 'revoked') {
    setError('');
    try {
      await docsApi(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update access');
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Access</h1>
      <p className="mt-2 text-black/60">Grant or revoke who can open docs.ioux.africa. This list is separate from portal logins.</p>
      <form onSubmit={invite} className="mt-6 grid gap-3 sm:grid-cols-2 bg-white border rounded-xl p-4">
        <input className="rounded-lg border px-3 py-2" required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-lg border px-3 py-2" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-lg border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as 'docs_reader' | 'docs_admin')}>
          <option value="docs_reader">Reader</option>
          <option value="docs_admin">Admin (can grant access)</option>
        </select>
        <button disabled={busy} className="rounded-lg bg-[#0E1F1A] text-[#D3F36B] font-semibold" type="submit">{busy ? 'Sending…' : 'Grant access'}</button>
      </form>
      {temp && <p className="mt-3 text-sm bg-[#D3F36B]/40 border rounded-lg px-3 py-2">Temporary password (also emailed): <span className="font-mono">{temp}</span></p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <ul className="mt-6 divide-y bg-white border rounded-xl">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-black/60">{row.email} · {row.role === 'docs_admin' ? 'Admin' : 'Reader'} · {row.status}</p>
            </div>
            {row.status === 'active' ? (
              <button type="button" className="text-sm text-red-700 underline" onClick={() => setStatus(row.id, 'revoked')}>Revoke</button>
            ) : (
              <button type="button" className="text-sm underline" onClick={() => setStatus(row.id, 'active')}>Restore</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-black/5 px-1 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1;
      blocks.push(<pre key={key++} className="overflow-x-auto rounded-xl bg-[#0E1F1A] text-[#D3F36B] text-xs p-4"><code>{buf.join('\n')}</code></pre>);
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*-+/.test(lines[i])) {
          rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
        }
        i += 1;
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'font-semibold bg-black/5' : ''}>
                  {row.map((cell, ci) => <td key={ci} className="border px-2 py-1.5 align-top">{inline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith('### ')) { blocks.push(<h3 key={key++} className="text-lg font-semibold mt-6">{inline(line.slice(4))}</h3>); i += 1; continue; }
    if (line.startsWith('## ')) { blocks.push(<h2 key={key++} className="text-xl font-semibold mt-6">{inline(line.slice(3))}</h2>); i += 1; continue; }
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) { items.push(lines[i].slice(2)); i += 1; }
      blocks.push(<ul key={key++} className="list-disc pl-5 space-y-1">{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i += 1; }
      blocks.push(<ol key={key++} className="list-decimal pl-5 space-y-1">{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</ol>);
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^#{1,3} |^- |\d+\. |\||```/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={key++}>{inline(para.join(' '))}</p>);
  }
  return blocks;
}
