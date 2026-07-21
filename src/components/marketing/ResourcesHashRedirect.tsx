import { Navigate, useLocation } from 'react-router-dom';

/** Preserve hash when redirecting legacy /resources/* paths. */
export default function ResourcesHashRedirect({ hash }: { hash: string }) {
  const loc = useLocation();
  return <Navigate to={{ pathname: '/resources', hash: hash.startsWith('#') ? hash : `#${hash}`, search: loc.search }} replace />;
}
