import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user && role) {
        // Redirection selon le rôle
        if (role === "livreur") {
          navigate("/delivery");
        } else if (role === "superviseur" || role === "administrateur") {
          navigate("/supervisor");
        } else {
          navigate("/dashboard");
        }
      } else if (user && !role) {
        // User exists but no role - redirect to dashboard
        // This is safe because:
        // 1. User is authenticated
        // 2. Role creation happens during/after signup and will be populated shortly
        // 3. ProtectedRoute allows access if user exists (even without role)
        // 4. New users always get 'appelant' role, so this state is temporary
        console.warn("User logged in but no role found, redirecting to dashboard");
        navigate("/dashboard");
      } else if (!user) {
        navigate("/auth");
      }
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
};

export default Index;
