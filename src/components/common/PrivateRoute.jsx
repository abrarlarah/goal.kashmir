import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children, requireSuperAdmin = false, requireTournamentAdmin = false, requireTeamAdmin = false, requireNewsAdmin = false, requireAdminPanelAccess = false }) {
  const { currentUser, isAdmin, isSuperAdmin, isNewsAdmin, isTeamAdmin, hasAnyAdminAccess } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has ANY admin role before letting them into base generic admin routes
  if (!hasAnyAdminAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-gray-400 max-w-md">
          You don't have admin privileges. Please contact a Super Admin to get access.
        </p>
      </div>
    );
  }

  // Generic Admin Panel access (blocks pure Team Admins from generic panel)
  if (requireAdminPanelAccess && !isAdmin && !isNewsAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check specific required modes
  if (requireTournamentAdmin && !isAdmin) { // isAdmin acts as tournament admin
      return <Navigate to="/" replace />;
  }

  // Team admin access: allows teamadmin, admin, and superadmin
  if (requireTeamAdmin && !isTeamAdmin) {
      return <Navigate to="/" replace />;
  }

  if (requireNewsAdmin && !isNewsAdmin) { 
      return <Navigate to="/" replace />;
  }

  // Check if super admin is required
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">👑</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Super Admin Only</h2>
        <p className="text-slate-500 dark:text-gray-400 max-w-md">
          This section is restricted to Super Admins only.
        </p>
      </div>
    );
  }

  return children;
}
