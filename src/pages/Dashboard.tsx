import { useState } from "react";
import { CallerLayout } from "@/components/caller/CallerLayout";
import { CallerDashboard } from "@/components/caller/CallerDashboard";
import { CallerOrders } from "@/components/caller/CallerOrders";
import { CallerChat } from "@/components/caller/CallerChat";
import { CallerClients } from "@/components/caller/CallerClients";
import { CallerFollowUps } from "@/components/caller/CallerFollowUps";
import { CallerTraining } from "@/components/caller/CallerTraining";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");

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
