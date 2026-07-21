import { Navigate } from 'react-router-dom';

/** Merged into Packaging & Listing — legacy route redirects */
export default function ListingReadinessPage() {
  return <Navigate to="/spv/packaging" replace />;
}
