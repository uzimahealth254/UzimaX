import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserNotifications } from '@/hooks/useNotifications';
import NotificationPanel from '@/components/shared/NotificationPanel';
import { UserRole } from '@/types';
import UzimaMark from '@/components/brand/UzimaMark';
import { BRAND } from '@/lib/brand';
import {
  LayoutDashboard, FileText, FilePlus, User, Bell,
  LogOut, ShoppingCart, ClipboardCheck, Calendar,
  Database, Send, Layers, GitBranch, Cpu, Users, Activity,
  BarChart3, Menu, X, MoreHorizontal, HandCoins,
  Wallet, Briefcase, FolderOpen, Percent, Receipt,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Sidebar accent — forest + lime (unchanged palette) */
const SIDEBAR = {
  bg: '#0E1F1A',
  bgSoft: '#173028',
  lime: '#D3F36B',
  gold: '#F0C419',
  text: '#E8F0EA',
  muted: 'rgba(232, 240, 234, 0.65)',
};
interface NavItem {
  label: string;
  short?: string;
  path: string;
  icon: React.ReactNode;
}

const walletEnabled = import.meta.env.VITE_ENABLE_WALLET === 'true';
const engineEnabled = import.meta.env.VITE_ENABLE_ENGINE === 'true';

function getNavItems(role: UserRole): NavItem[] {
  const s = 18;
  const sw = 1.5;
  switch (role) {
    case 'supplier':
      return [
        { label: 'Dashboard', short: 'Home', path: '/supplier', icon: <LayoutDashboard size={s} strokeWidth={sw} /> },
        { label: 'Opt-in Inbox', short: 'Opt-in', path: '/supplier/opt-in', icon: <HandCoins size={s} strokeWidth={sw} /> },
        { label: 'Post Invoice', short: 'Post', path: '/supplier/post-invoice', icon: <FilePlus size={s} strokeWidth={sw} /> },
        { label: 'My Invoices', short: 'Invoices', path: '/supplier/invoices', icon: <FileText size={s} strokeWidth={sw} /> },
        { label: 'Payments', short: 'Payments', path: '/supplier/payments', icon: <Receipt size={s} strokeWidth={sw} /> },
        { label: 'Documents', short: 'Docs', path: '/supplier/documents', icon: <FolderOpen size={s} strokeWidth={sw} /> },
        ...(walletEnabled ? [{ label: 'Ledger', short: 'Ledger', path: '/supplier/wallet', icon: <Wallet size={s} strokeWidth={sw} /> }] : []),
        { label: 'Profile', short: 'Profile', path: '/supplier/profile', icon: <User size={s} strokeWidth={sw} /> },
      ];
    case 'buyer':
      return [
        { label: 'Dashboard', short: 'Home', path: '/buyer', icon: <LayoutDashboard size={s} strokeWidth={sw} /> },
        { label: 'Post IOU', short: 'Post', path: '/buyer/post-iou', icon: <FilePlus size={s} strokeWidth={sw} /> },
        { label: 'Verification', short: 'Verify', path: '/buyer/verification', icon: <ClipboardCheck size={s} strokeWidth={sw} /> },
        { label: 'Invoice Register', short: 'Register', path: '/buyer/register', icon: <ShoppingCart size={s} strokeWidth={sw} /> },
        { label: 'Consent', short: 'Consent', path: '/buyer/consent', icon: <ClipboardCheck size={s} strokeWidth={sw} /> },
        { label: 'Payments', short: 'Payments', path: '/buyer/payments', icon: <Calendar size={s} strokeWidth={sw} /> },
        { label: 'Documents', short: 'Docs', path: '/buyer/documents', icon: <FolderOpen size={s} strokeWidth={sw} /> },
        ...(walletEnabled ? [{ label: 'Ledger', short: 'Ledger', path: '/buyer/wallet', icon: <Wallet size={s} strokeWidth={sw} /> }] : []),
        { label: 'Profile', short: 'Profile', path: '/buyer/profile', icon: <User size={s} strokeWidth={sw} /> },
      ];
    case 'spv':
      return [
        { label: 'Dashboard', short: 'Home', path: '/spv', icon: <LayoutDashboard size={s} strokeWidth={sw} /> },
        { label: 'IOU Registry', short: 'Registry', path: '/spv/registry', icon: <Database size={s} strokeWidth={sw} /> },
        { label: 'Offers', short: 'Offers', path: '/spv/offers', icon: <Send size={s} strokeWidth={sw} /> },
        { label: 'Assignments', short: 'Assign', path: '/spv/assignments', icon: <GitBranch size={s} strokeWidth={sw} /> },
        { label: 'Escrow', short: 'Escrow', path: '/spv/escrow', icon: <Wallet size={s} strokeWidth={sw} /> },
        { label: 'Packaging & Listing', short: 'Packages', path: '/spv/packaging', icon: <Layers size={s} strokeWidth={sw} /> },
        { label: 'Payments', short: 'Payments', path: '/spv/payments', icon: <Receipt size={s} strokeWidth={sw} /> },
        ...(walletEnabled ? [{ label: 'Ledger', short: 'Ledger', path: '/spv/wallet', icon: <Wallet size={s} strokeWidth={sw} /> }] : []),
        ...(engineEnabled ? [{ label: 'Backend Engine', short: 'Engine', path: '/spv/engine', icon: <Cpu size={s} strokeWidth={sw} /> }] : []),
        { label: 'Profile', short: 'Profile', path: '/spv/profile', icon: <User size={s} strokeWidth={sw} /> },
      ];
    case 'admin':
      return [
        { label: 'Dashboard', short: 'Home', path: '/admin', icon: <LayoutDashboard size={s} strokeWidth={sw} /> },
        { label: 'All Invoices', short: 'Invoices', path: '/admin/invoices', icon: <FileText size={s} strokeWidth={sw} /> },
        { label: 'Programmes', short: 'Programs', path: '/admin/programs', icon: <Briefcase size={s} strokeWidth={sw} /> },
        { label: 'Fees', short: 'Fees', path: '/admin/fees', icon: <Percent size={s} strokeWidth={sw} /> },
        { label: 'Reconciliation', short: 'Reconcile', path: '/admin/reconciliation', icon: <Activity size={s} strokeWidth={sw} /> },
        { label: 'Users & Orgs', short: 'Users', path: '/admin/users', icon: <Users size={s} strokeWidth={sw} /> },
        { label: 'Workflow', short: 'Workflow', path: '/admin/workflow', icon: <Activity size={s} strokeWidth={sw} /> },
        { label: 'Analytics', short: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={s} strokeWidth={sw} /> },
        { label: 'Profile', short: 'Profile', path: '/admin/profile', icon: <User size={s} strokeWidth={sw} /> },
      ];
  }
}

function getRoleLabel(role: UserRole): string {
  return {
    supplier: 'Supplier portal',
    buyer: 'Buyer portal',
    spv: 'SPV portal',
    admin: 'Admin portal',
  }[role];
}

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUserNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = useMemo(() => (user ? getNavItems(user.role) : []), [user]);
  const primaryNav = useMemo(
    () => navItems.filter((i) => !i.path.endsWith('/profile')),
    [navItems],
  );
  const tabItems = primaryNav.slice(0, 4);
  const moreItems = primaryNav.slice(4);
  const moreActive = moreItems.some(i => location.pathname === i.path || (i.path !== `/${user?.role}` && location.pathname.startsWith(i.path)));

  if (!user) return null;

  const sidebarNav = (
    <>
      <div className="px-4 pt-5 pb-4 pr-14 lg:pr-4">
        <div className="flex items-center gap-3">
          <UzimaMark className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <span className="font-display text-base font-bold tracking-tight text-white">{BRAND.name}</span>
            <p className="mt-0.5 text-[11px] font-medium truncate" style={{ color: SIDEBAR.muted }}>
              {getRoleLabel(user.role)}
            </p>
          </div>
        </div>
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-scroll flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
        {primaryNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === `/${user.role}`}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn('sidebar-nav-link', isActive && 'is-active')}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-divider" />

      <div className="px-2.5 pb-2 space-y-0.5">
        <NavLink
          to={`/${user.role}/profile`}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => cn('sidebar-nav-link', isActive && 'is-active')}
        >
          <Settings size={18} strokeWidth={1.5} />
          <span className="truncate">Settings</span>
        </NavLink>
      </div>

      <div className="px-3 pb-3 pt-1 safe-pad-bottom">
        <div
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5"
          style={{ background: SIDEBAR.bgSoft }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: SIDEBAR.lime, color: SIDEBAR.bg }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{user.name}</p>
            <p className="text-[10px] truncate mt-0.5 leading-tight" style={{ color: SIDEBAR.muted }}>
              {user.organisationName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setNotifOpen(true); setMobileOpen(false); }}
            className="sidebar-footer-btn relative"
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: SIDEBAR.gold }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={logout}
            className="sidebar-footer-btn"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="portal-shell flex h-[100dvh] app-ambient overflow-hidden">
      <div className="portal-backdrop" aria-hidden>
        <img src="/auth-portal-hero.jpg?v=4" alt="" className="portal-backdrop__pharmacy" />
        <div className="portal-backdrop__veil" />
      </div>

      {/* Desktop sidebar */}
      <aside className="relative z-10 hidden lg:flex w-[15.5rem] xl:w-64 sidebar-glass flex-col shrink-0 m-3 mr-0 rounded-2xl overflow-hidden">
        {sidebarNav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[min(20rem,88vw)] flex flex-col shadow-2xl animate-fade-in rounded-r-2xl overflow-hidden"
            style={{ background: SIDEBAR.bg }}
          >
            <button
              className="absolute right-3 top-[max(0.75rem,var(--safe-top))] p-2.5 rounded-md z-10 hover:bg-white/10"
              style={{ color: SIDEBAR.muted }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebarNav}
          </aside>
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col min-w-0 m-0 lg:m-3 lg:ml-3">
        <header className="lg:hidden sticky top-0 z-30 glass-nav safe-pad-x safe-pad-top">
          <div className="flex items-center justify-between py-2.5">
            <button onClick={() => setMobileOpen(true)} className="touch-target rounded-xl hover:bg-secondary" aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <UzimaMark className="w-7 h-7" />
              <span className="font-display font-extrabold text-lg text-[#0B1F33]">{BRAND.name}</span>
            </div>
            <button onClick={() => setNotifOpen(true)} className="relative touch-target rounded-xl hover:bg-secondary" aria-label="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-white" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-touch overscroll-y-contain content-panel">
          <div className="main-pad min-w-0">
            <div className="content-canvas p-3 sm:p-4">
              <Outlet />
            </div>
          </div>
        </main>

        {/* iPhone-style bottom tab bar */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-tabbar safe-pad-x"
          style={{ paddingBottom: 'max(0.35rem, var(--safe-bottom))' }}
        >
          <div className="flex items-stretch justify-around pt-1.5 pb-1 max-w-lg mx-auto">
            {tabItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${user.role}`}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[52px] px-1 rounded-xl transition-all active:scale-95',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('p-1.5 rounded-xl transition-colors', isActive && 'bg-primary/10')}>
                      {item.icon}
                    </span>
                    <span className={cn('text-[10px] font-medium truncate max-w-full', isActive && 'font-semibold')}>
                      {item.short || item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
            {moreItems.length > 0 && (
              <button
                onClick={() => setMobileOpen(true)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[52px] px-1 rounded-xl transition-all active:scale-95',
                  moreActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <span className={cn('p-1.5 rounded-xl', moreActive && 'bg-primary/10')}>
                  <MoreHorizontal size={20} />
                </span>
                <span className="text-[10px] font-medium">More</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
