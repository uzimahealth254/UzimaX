import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getRoleRedirect } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'sonner';
import { BRAND } from '@/lib/brand';

import ProtectedRoute from '@/components/ProtectedRoute';
import PortalLayout from '@/components/layout/PortalLayout';
import IdleWarningModal from '@/components/shared/IdleWarningModal';
import PasswordChangeGate from '@/components/shared/PasswordChangeGate';
import HomePage from '@/pages/HomePage';
import AuthPage from '@/pages/AuthPage';
import AboutPage from '@/pages/marketing/AboutPage';
import SolutionsPage from '@/pages/marketing/SolutionsPage';
import PortalsPage from '@/pages/marketing/PortalsPage';
import ResourcesPage from '@/pages/marketing/ResourcesPage';
import PrivacyPage from '@/pages/marketing/PrivacyPage';
import TermsPage from '@/pages/marketing/TermsPage';
import ResourcesHashRedirect from '@/components/marketing/ResourcesHashRedirect';
import ScrollToTop from '@/components/ScrollToTop';

import SupplierDashboard from '@/pages/supplier/SupplierDashboard';
import MyInvoicesPage from '@/pages/supplier/MyInvoicesPage';
import InvoiceDetailPage from '@/pages/supplier/InvoiceDetailPage';
import SupplierProfilePage from '@/pages/supplier/SupplierProfilePage';
import OptInInboxPage from '@/pages/supplier/OptInInboxPage';
import PostSupplierInvoicePage from '@/pages/supplier/PostSupplierInvoicePage';

import BuyerDashboard from '@/pages/buyer/BuyerDashboard';
import InvoiceRegisterPage from '@/pages/buyer/InvoiceRegisterPage';
import ConsentInboxPage from '@/pages/buyer/ConsentInboxPage';
import BuyerPaymentsPage from '@/pages/buyer/BuyerPaymentsPage';
import BuyerProfilePage from '@/pages/buyer/BuyerProfilePage';
import PostIOUPage from '@/pages/buyer/PostIOUPage';
import BuyerVerificationInboxPage from '@/pages/buyer/BuyerVerificationInboxPage';
import WalletPage from '@/pages/shared/WalletPage';
import DocumentsPage from '@/pages/shared/DocumentsPage';
import PaymentHistoryPage from '@/pages/shared/PaymentHistoryPage';

import SPVDashboard from '@/pages/spv/SPVDashboard';
import IOURegistryPage from '@/pages/spv/IOURegistryPage';
import OffersPage from '@/pages/spv/OffersPage';
import PackagingPage from '@/pages/spv/PackagingPage';
import AssignmentRegistryPage from '@/pages/spv/AssignmentRegistryPage';
import BackendEnginePage from '@/pages/spv/BackendEnginePage';
import SPVProfilePage from '@/pages/spv/SPVProfilePage';
import EscrowPage from '@/pages/spv/EscrowPage';
import IOUDetailPage from '@/pages/spv/IOUDetailPage';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AllInvoicesPage from '@/pages/admin/AllInvoicesPage';
import UsersPage from '@/pages/admin/UsersPage';
import WorkflowMonitorPage from '@/pages/admin/WorkflowMonitorPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import ProgramsPage from '@/pages/admin/ProgramsPage';
import ReconciliationPage from '@/pages/admin/ReconciliationPage';
import FeesPage from '@/pages/admin/FeesPage';
import AdminProfilePage from '@/pages/admin/AdminProfilePage';
import IntegrationsPage from '@/pages/admin/IntegrationsPage';
import NotFound from '@/pages/NotFound';

const walletEnabled = import.meta.env.VITE_ENABLE_WALLET === 'true';
const engineEnabled = import.meta.env.VITE_ENABLE_ENGINE === 'true';

function WalletRoute({ home }: { home: string }) {
  if (!walletEnabled) return <Navigate to={home} replace />;
  return <WalletPage />;
}

function EngineRoute() {
  if (!engineEnabled) return <Navigate to="/spv" replace />;
  return <BackendEnginePage />;
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Loading {BRAND.name}…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated && user ? <Navigate to={getRoleRedirect(user.role)} /> : <AuthPage />} />
      <Route path="/" element={isAuthenticated && user ? <Navigate to={getRoleRedirect(user.role)} replace /> : <HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/solutions" element={<SolutionsPage />} />
      <Route path="/portals" element={<PortalsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/resources" element={<ResourcesPage />} />
      <Route path="/resources/docs" element={<ResourcesHashRedirect hash="docs" />} />
      <Route path="/resources/faq" element={<ResourcesHashRedirect hash="faq" />} />
      <Route path="/resources/security" element={<ResourcesHashRedirect hash="security" />} />
      <Route path="/resources/contact" element={<ResourcesHashRedirect hash="contact" />} />

      <Route path="/supplier" element={<ProtectedRoute allowedRole="supplier"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<SupplierDashboard />} />
        <Route path="opt-in" element={<OptInInboxPage />} />
        <Route path="post-invoice" element={<PostSupplierInvoicePage />} />
        <Route path="invoices" element={<MyInvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="list" element={<Navigate to="/supplier/post-invoice" replace />} />
        <Route path="history" element={<Navigate to="/supplier/invoices?filter=completed" replace />} />
        <Route path="payments" element={<PaymentHistoryPage />} />
        <Route path="wallet" element={<WalletRoute home="/supplier" />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="signatories" element={<Navigate to="/supplier/profile?tab=signatories" replace />} />
        <Route path="profile" element={<SupplierProfilePage />} />
      </Route>

      <Route path="/buyer" element={<ProtectedRoute allowedRole="buyer"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<BuyerDashboard />} />
        <Route path="post-iou" element={<PostIOUPage />} />
        <Route path="verification" element={<BuyerVerificationInboxPage />} />
        <Route path="register" element={<InvoiceRegisterPage />} />
        <Route path="consent" element={<ConsentInboxPage />} />
        <Route path="api" element={<Navigate to="/buyer/profile?tab=developer" replace />} />
        <Route path="payments" element={<BuyerPaymentsPage />} />
        <Route path="payment-history" element={<Navigate to="/buyer/payments" replace />} />
        <Route path="wallet" element={<WalletRoute home="/buyer" />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="signatories" element={<Navigate to="/buyer/profile?tab=signatories" replace />} />
        <Route path="profile" element={<BuyerProfilePage />} />
      </Route>

      <Route path="/spv" element={<ProtectedRoute allowedRole="spv"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<SPVDashboard />} />
        <Route path="registry" element={<IOURegistryPage />} />
        <Route path="registry/:id" element={<IOUDetailPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="packaging" element={<PackagingPage />} />
        <Route path="assignments" element={<AssignmentRegistryPage />} />
        <Route path="escrow" element={<EscrowPage />} />
        <Route path="listing" element={<Navigate to="/spv/packaging" replace />} />
        <Route path="engine" element={<EngineRoute />} />
        <Route path="wallet" element={<WalletRoute home="/spv" />} />
        <Route path="payments" element={<PaymentHistoryPage />} />
        <Route path="payment-history" element={<Navigate to="/spv/payments" replace />} />
        <Route path="documents" element={<Navigate to="/spv/profile?tab=documents" replace />} />
        <Route path="signatories" element={<Navigate to="/spv/profile?tab=signatories" replace />} />
        <Route path="profile" element={<SPVProfilePage />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="invoices" element={<AllInvoicesPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="workflow" element={<WorkflowMonitorPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ScrollToTop />
        <PasswordChangeGate>
          <AppRoutes />
        </PasswordChangeGate>
        <IdleWarningModal />
        <Toaster position="top-right" richColors />
      </NotificationProvider>
    </AuthProvider>
  );
}
