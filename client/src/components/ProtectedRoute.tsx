import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ReactNode, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isVerified, isLoading } = useAuth();
  const location = useLocation();
  const [isClient, setIsClient] = useState(false);

  // This ensures we don't render anything on the server-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything during initial load to prevent flash of content
  if (!isClient || isLoading) {
    return null;
  }

  if (!isVerified) {
    // Redirect them to the /verify-email page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they log in, which is a nicer user experience
    // than dropping them off on the home page.
    return (
      <Navigate
        to="/verify-email"
        state={{ from: location.pathname !== '/verify-email' ? location : '/' }}
        replace
      />
    );
  }

  return <>{children}</>;
}
