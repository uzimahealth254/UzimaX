import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getRoleRedirect } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'sonner';

import ProtectedRoute from '@/components/ProtectedRoute';
import PortalLayout from '@/components/layout/PortalLayout';
import IdleWarningModal from '@/components/shared/IdleWarningModal';
import AuthPage from '@/pages/AuthPage';

import SupplierDashboard from '@/pages/supplier/SupplierDashboard';
import MyInvoicesPage from '@/pages/supplier/MyInvoicesPage';
import InvoiceDetailPage from '@/pages/supplier/InvoiceDetailPage';
import ListInvoicePage from '@/pages/supplier/ListInvoicePage';
import TradeHistoryPage from '@/pages/supplier/TradeHistoryPage';
import SupplierProfilePage from '@/pages/supplier/SupplierProfilePage';
import OptInInboxPage from '@/pages/supplier/OptInInboxPage';
import PostSupplierInvoicePage from '@/pages/supplier/PostSupplierInvoicePage';

import BuyerDashboard from '@/pages/buyer/BuyerDashboard';
import InvoiceRegisterPage from '@/pages/buyer/InvoiceRegisterPage';
import ConsentInboxPage from '@/pages/buyer/ConsentInboxPage';
import PaymentSchedulePage from '@/pages/buyer/PaymentSchedulePage';
import BuyerProfilePage from '@/pages/buyer/BuyerProfilePage';
import PostIOUPage from '@/pages/buyer/PostIOUPage';
import BuyerApiPage from '@/pages/buyer/BuyerApiPage';
import BuyerVerificationInboxPage from '@/pages/buyer/BuyerVerificationInboxPage';
import WalletPage from '@/pages/shared/WalletPage';
import DocumentsPage from '@/pages/shared/DocumentsPage';
import PaymentHistoryPage from '@/pages/shared/PaymentHistoryPage';
import SignatoriesPage from '@/pages/shared/SignatoriesPage';

import SPVDashboard from '@/pages/spv/SPVDashboard';
import IOURegistryPage from '@/pages/spv/IOURegistryPage';
import OffersPage from '@/pages/spv/OffersPage';
import PackagingPage from '@/pages/spv/PackagingPage';
import AssignmentRegistryPage from '@/pages/spv/AssignmentRegistryPage';
import BackendEnginePage from '@/pages/spv/BackendEnginePage';
import SPVProfilePage from '@/pages/spv/SPVProfilePage';
import EscrowPage from '@/pages/spv/EscrowPage';
import ListingReadinessPage from '@/pages/spv/ListingReadinessPage';
import IOUDetailPage from '@/pages/spv/IOUDetailPage';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AllInvoicesPage from '@/pages/admin/AllInvoicesPage';
import UsersPage from '@/pages/admin/UsersPage';
import WorkflowMonitorPage from '@/pages/admin/WorkflowMonitorPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import ProgramsPage from '@/pages/admin/ProgramsPage';
import ReconciliationPage from '@/pages/admin/ReconciliationPage';
import FeesPage from '@/pages/admin/FeesPage';
import NotFound from '@/pages/NotFound';

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading Uzima…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated && user ? <Navigate to={getRoleRedirect(user.role)} /> : <AuthPage />} />

      <Route path="/supplier" element={<ProtectedRoute allowedRole="supplier"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<SupplierDashboard />} />
        <Route path="opt-in" element={<OptInInboxPage />} />
        <Route path="post-invoice" element={<PostSupplierInvoicePage />} />
        <Route path="invoices" element={<MyInvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="list" element={<ListInvoicePage />} />
        <Route path="history" element={<TradeHistoryPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="signatories" element={<SignatoriesPage />} />
        <Route path="profile" element={<SupplierProfilePage />} />
      </Route>

      <Route path="/buyer" element={<ProtectedRoute allowedRole="buyer"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<BuyerDashboard />} />
        <Route path="post-iou" element={<PostIOUPage />} />
        <Route path="verification" element={<BuyerVerificationInboxPage />} />
        <Route path="verification-inbox" element={<BuyerVerificationInboxPage />} />
        <Route path="register" element={<InvoiceRegisterPage />} />
        <Route path="consent" element={<ConsentInboxPage />} />
        <Route path="api" element={<BuyerApiPage />} />
        <Route path="payments" element={<PaymentSchedulePage />} />
        <Route path="payment-history" element={<PaymentHistoryPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="signatories" element={<SignatoriesPage />} />
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
        <Route path="listing" element={<ListingReadinessPage />} />
        <Route path="engine" element={<BackendEnginePage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="payment-history" element={<PaymentHistoryPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="signatories" element={<SignatoriesPage />} />
        <Route path="profile" element={<SPVProfilePage />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><PortalLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="invoices" element={<AllInvoicesPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="workflow" element={<WorkflowMonitorPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated && user ? getRoleRedirect(user.role) : '/login'} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
        <IdleWarningModal />
        <Toaster position="top-right" richColors />
      </NotificationProvider>
    </AuthProvider>
  );
}
