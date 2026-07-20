import { Navigate } from 'react-router-dom';

/** Legacy list flow — supplier origination is /supplier/post-invoice */
export default function ListInvoicePage() {
  return <Navigate to="/supplier/post-invoice" replace />;
}
