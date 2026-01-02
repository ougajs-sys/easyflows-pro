import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeliveryPerformance } from "@/components/supervisor/DeliveryPerformance";
import { CallerPerformance } from "@/components/supervisor/CallerPerformance";
import { SalesSummary } from "@/components/supervisor/SalesSummary";
import { SupervisorStats } from "@/components/supervisor/SupervisorStats";
import { RecentOrders } from "@/components/supervisor/RecentOrders";

export default function SupervisorDashboard() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Tableau de Bord</span> Superviseur
        </h1>
        <p className="text-muted-foreground">
          Vue d'ensemble des performances livreurs, appelants et ventes
        </p>
      </div>

      {/* Stats Overview */}
      <SupervisorStats />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Delivery Performance */}
        <DeliveryPerformance />

        {/* Caller Performance */}
        <CallerPerformance />
      </div>

      {/* Sales Summary */}
      <div className="mt-6">
        <SalesSummary />
      </div>

      {/* Recent Orders */}
      <div className="mt-6">
        <RecentOrders />
      </div>
    </DashboardLayout>
  );
}
