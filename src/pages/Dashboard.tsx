import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CallerLayout } from "@/components/caller/CallerLayout";
import { CallerDashboard } from "@/components/caller/CallerDashboard";
import { CallerOrders } from "@/components/caller/CallerOrders";
import { CallerClients } from "@/components/caller/CallerClients";
import { CallerFollowUps } from "@/components/caller/CallerFollowUps";
import { CallerTraining } from "@/components/caller/CallerTraining";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to chat page when chat section is selected
  useEffect(() => {
    if (activeSection === "chat") {
      navigate("/chat");
    }
  }, [activeSection, navigate]);

  // Redirect supervisors and admins to their dedicated dashboard
  if (!loading && (role === 'superviseur' || role === 'administrateur')) {
    return <Navigate to="/supervisor" replace />;
  }

  // Show loading state while checking role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <CallerDashboard />;
      case "orders":
        return <CallerOrders />;
      case "clients":
        return <CallerClients />;
      case "followups":
        return <CallerFollowUps />;
      case "training":
        return <CallerTraining />;
      default:
        return <CallerDashboard />;
    }
  };

  return (
    <CallerLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderContent()}
    </CallerLayout>
  );
}
