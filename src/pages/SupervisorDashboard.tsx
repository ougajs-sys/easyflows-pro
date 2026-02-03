import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeliveryPerformance } from "@/components/supervisor/DeliveryPerformance";
import { CallerPerformance } from "@/components/supervisor/CallerPerformance";
import { SalesSummary } from "@/components/supervisor/SalesSummary";
import { SupervisorStats } from "@/components/supervisor/SupervisorStats";
import { DeliveryStatus } from "@/components/dashboard/DeliveryStatus";
import { StockOverviewPanel } from "@/components/supervisor/StockOverviewPanel";
import { ConnectedWorkers } from "@/components/supervisor/ConnectedWorkers";

export default function SupervisorDashboard() {
  return (
    <DashboardLayout>
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Tableau de Bord</span> Superviseur
        </h1>
        <p className="text-muted-foreground">
          Suivi des indicateurs et performances
        </p>
      </div>

      {/* Statistiques */}
      <SupervisorStats />

      {/* Travailleurs connectés */}
      <div className="mt-6">
        <ConnectedWorkers />
      </div>

      {/* Vue Stock */}
      <div className="mt-6">
        <StockOverviewPanel />
      </div>

      {/* Grille Performances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DeliveryPerformance />
        <DeliveryStatus />
      </div>

      {/* Performance Appelants */}
      <div className="mt-6">
        <CallerPerformance />
      </div>

      {/* Résumé Ventes */}
      <div className="mt-6">
        <SalesSummary />
      </div>
    </DashboardLayout>
  );
}
