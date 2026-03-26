import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CallerPerformance } from "@/components/supervisor/CallerPerformance";
import { SalesSummary } from "@/components/supervisor/SalesSummary";
import { SupervisorStats } from "@/components/supervisor/SupervisorStats";
import { DailyReportPanel } from "@/components/supervisor/DailyReportPanel";
import { DeliveryDailyReport } from "@/components/supervisor/DeliveryDailyReport";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function SupervisorDashboard() {
  // Enable realtime synchronization for supervisor dashboard
  useRealtimeSync({
    tables: ['orders', 'payments', 'delivery_persons', 'products'],
    debug: false,
  });

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

      {/* Rapport Journalier */}
      <div className="mt-6">
        <DailyReportPanel />
      </div>

      {/* Rapport Détaillé Livreurs */}
      <div className="mt-6">
        <DeliveryDailyReport />
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
