import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../../components/layout/FullPageLoader.jsx';
import { useAuth } from './AuthProvider.jsx';

/** Only signed-in users get through; everyone else is sent to /login and returned afterwards. */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login/register pages: a signed-in user goes to the page they originally asked for, or the dashboard. */
export function GuestRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (user) {
    const from = location.state?.from;
    return <Navigate to={from ? `${from.pathname}${from.search ?? ''}` : '/app'} replace />;
  }
  return <Outlet />;
}
