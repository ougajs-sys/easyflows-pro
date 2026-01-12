import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

// Fonction helper pour obtenir le chemin par défaut selon le rôle
const getDefaultPathForRole = (userRole: AppRole | null): string => {
  switch (userRole) {
    case 'livreur':
      return '/delivery';
    case 'superviseur':
    case 'administrateur':
      return '/supervisor';
    case 'appelant':
    default:
      return '/dashboard';
  }
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Si l'utilisateur n'a pas le bon rôle, rediriger vers son espace approprié
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPathForRole(role)} replace />;
  }

  return <>{children}</>;
}
