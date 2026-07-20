import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserNotifications } from '@/hooks/useNotifications';
import NotificationPanel from '@/components/shared/NotificationPanel';
import { UserRole } from '@/types';
import {
  LayoutDashboard, FileText, FilePlus, History, User, Bell,
  LogOut, ShoppingCart, ClipboardCheck, Calendar,
  Database, Send, Layers, GitBranch, Cpu, Users, Activity,
  BarChart3, ShieldCheck, Menu, X, MoreHorizontal, HandCoins,
  KeyRound, Wallet, Landmark, Briefcase, FolderOpen, Percent, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  short?: string;
  path: string;
  icon: React.ReactNode;
}

function getNavItems(role: UserRole): NavItem[] {
  const s = 20;
  switch (role) {
    case 'supplier':
      return [
        { label: 'Dashboard', short: 'Home', path: '/supplier', icon: <LayoutDashboard size={s} /> },
        { label: 'Opt-in Inbox', short: 'Opt-in', path: '/supplier/opt-in', icon: <HandCoins size={s} /> },
        { label: 'Post Invoice', short: 'Post', path: '/supplier/post-invoice', icon: <FilePlus size={s} /> },
        { label: 'My Invoices', short: 'Invoices', path: '/supplier/invoices', icon: <FileText size={s} /> },
        { label: 'Wallet', short: 'Wallet', path: '/supplier/wallet', icon: <Wallet size={s} /> },
        { label: 'Documents', short: 'Docs', path: '/supplier/documents', icon: <FolderOpen size={s} /> },
        { label: 'Signatories', short: 'Sign', path: '/supplier/signatories', icon: <ShieldCheck size={s} /> },
        { label: 'Trade History', short: 'History', path: '/supplier/history', icon: <History size={s} /> },
        { label: 'Profile', short: 'Profile', path: '/supplier/profile', icon: <User size={s} /> },
      ];
    case 'buyer':
      return [
        { label: 'Dashboard', short: 'Home', path: '/buyer', icon: <LayoutDashboard size={s} /> },
        { label: 'Post IOU', short: 'Post', path: '/buyer/post-iou', icon: <FilePlus size={s} /> },
        { label: 'Verification', short: 'Verify', path: '/buyer/verification', icon: <ClipboardCheck size={s} /> },
        { label: 'Invoice Register', short: 'Register', path: '/buyer/register', icon: <ShoppingCart size={s} /> },
        { label: 'Consent Inbox', short: 'Consent', path: '/buyer/consent', icon: <ClipboardCheck size={s} /> },
        { label: 'Wallet', short: 'Wallet', path: '/buyer/wallet', icon: <Wallet size={s} /> },
        { label: 'Documents', short: 'Docs', path: '/buyer/documents', icon: <FolderOpen size={s} /> },
        { label: 'Signatories', short: 'Sign', path: '/buyer/signatories', icon: <ShieldCheck size={s} /> },
        { label: 'API Integration', short: 'API', path: '/buyer/api', icon: <KeyRound size={s} /> },
        { label: 'Payment Schedule', short: 'Payments', path: '/buyer/payments', icon: <Calendar size={s} /> },
        { label: 'Payment History', short: 'History', path: '/buyer/payment-history', icon: <Receipt size={s} /> },
        { label: 'Profile', short: 'Profile', path: '/buyer/profile', icon: <User size={s} /> },
      ];
    case 'spv':
      return [
        { label: 'Dashboard', short: 'Home', path: '/spv', icon: <LayoutDashboard size={s} /> },
        { label: 'IOU Registry', short: 'Registry', path: '/spv/registry', icon: <Database size={s} /> },
        { label: 'Offers & Receivables', short: 'Offers', path: '/spv/offers', icon: <Send size={s} /> },
        { label: 'Assignments', short: 'Assign', path: '/spv/assignments', icon: <GitBranch size={s} /> },
        { label: 'Escrow', short: 'Escrow', path: '/spv/escrow', icon: <Wallet size={s} /> },
        { label: 'Wallet', short: 'Wallet', path: '/spv/wallet', icon: <Wallet size={s} /> },
        { label: 'Payment History', short: 'Payments', path: '/spv/payment-history', icon: <Receipt size={s} /> },
        { label: 'Documents', short: 'Docs', path: '/spv/documents', icon: <FolderOpen size={s} /> },
        { label: 'Signatories', short: 'Sign', path: '/spv/signatories', icon: <ShieldCheck size={s} /> },
        { label: 'Packaging', short: 'Packages', path: '/spv/packaging', icon: <Layers size={s} /> },
        { label: 'NSE Listing', short: 'NSE', path: '/spv/listing', icon: <Landmark size={s} /> },
        { label: 'Backend Engine', short: 'Engine', path: '/spv/engine', icon: <Cpu size={s} /> },
        { label: 'Profile', short: 'Profile', path: '/spv/profile', icon: <User size={s} /> },
      ];
    case 'admin':
      return [
        { label: 'Dashboard', short: 'Home', path: '/admin', icon: <LayoutDashboard size={s} /> },
        { label: 'All Invoices', short: 'Invoices', path: '/admin/invoices', icon: <FileText size={s} /> },
        { label: 'Programmes', short: 'Programs', path: '/admin/programs', icon: <Briefcase size={s} /> },
        { label: 'Fees', short: 'Fees', path: '/admin/fees', icon: <Percent size={s} /> },
        { label: 'Reconciliation', short: 'Reconcile', path: '/admin/reconciliation', icon: <Activity size={s} /> },
        { label: 'Users & Orgs', short: 'Users', path: '/admin/users', icon: <Users size={s} /> },
        { label: 'Workflow', short: 'Workflow', path: '/admin/workflow', icon: <Activity size={s} /> },
        { label: 'Analytics', short: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={s} /> },
      ];
  }
}

function getRoleLabel(role: UserRole): string {
  return { supplier: 'Supplier', buyer: 'Buyer', spv: 'SPV', admin: 'Admin' }[role];
}

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUserNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = useMemo(() => (user ? getNavItems(user.role) : []), [user]);
  const tabItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);
  const moreActive = moreItems.some(i => location.pathname === i.path || (i.path !== `/${user?.role}` && location.pathname.startsWith(i.path)));

  if (!user) return null;

  const sidebarNav = (
    <>
      <div className="p-5 border-b border-white/40 pr-14 lg:pr-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/25">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-xl font-bold tracking-tight">Uzima</span>
            <p className="text-[10px] text-muted-foreground truncate">{getRoleLabel(user.role)} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scroll-touch">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === `/${user.role}`}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px]',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-white/70 hover:text-primary active:scale-[0.98]'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/40 space-y-3 safe-pad-bottom">
        <div className="flex items-center gap-3 glass rounded-xl p-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.organisationName}</p>
          </div>
          <button
            onClick={() => { setNotifOpen(true); setMobileOpen(false); }}
            className="relative touch-target rounded-xl hover:bg-white/60"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-white/60 hover:text-foreground transition-colors min-h-[48px]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] app-ambient overflow-hidden">
      {/* Desktop glass sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 glass-strong border-r border-white/40 flex-col shrink-0 m-3 mr-0 rounded-2xl overflow-hidden">
        {sidebarNav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(20rem,88vw)] glass-strong flex flex-col shadow-2xl animate-fade-in rounded-r-3xl overflow-hidden">
            <button
              className="absolute right-3 top-[max(0.75rem,var(--safe-top))] p-2.5 rounded-xl hover:bg-white/50 touch-target z-10"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebarNav}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile glass top bar */}
        <header className="lg:hidden sticky top-0 z-30 glass-nav safe-pad-x safe-pad-top">
          <div className="flex items-center justify-between py-2.5">
            <button onClick={() => setMobileOpen(true)} className="touch-target rounded-xl hover:bg-white/50" aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <ShieldCheck size={14} className="text-white" />
              </div>
              <span className="font-display font-bold text-lg">Uzima</span>
            </div>
            <button onClick={() => setNotifOpen(true)} className="relative touch-target rounded-xl hover:bg-white/50" aria-label="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-white" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-touch overscroll-y-contain">
          <div className="main-pad min-w-0">
            <Outlet />
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
