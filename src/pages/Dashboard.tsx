import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CallerLayout } from "@/components/caller/CallerLayout";
import { CallerDashboard } from "@/components/caller/CallerDashboard";
import { CallerOrders } from "@/components/caller/CallerOrders";
import CallerChat from "@/components/caller/CallerChat";
import { CallerClients } from "@/components/caller/CallerClients";
import { CallerFollowUps } from "@/components/caller/CallerFollowUps";
import { CallerTraining } from "@/components/caller/CallerTraining";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { role, loading } = useAuth();

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
      case "chat":
        return <CallerChat />;
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
