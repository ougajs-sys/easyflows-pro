import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StockOverview } from "@/components/stock/StockOverview";
import { StockTable } from "@/components/stock/StockTable";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { StockHistory } from "@/components/stock/StockHistory";
import { StockTransferManager } from "@/components/supervisor/StockTransferManager";
import { StockAlertsPanel } from "@/components/stock/StockAlertsPanel";
import { SupplyRequestsPanel } from "@/components/stock/SupplyRequestsPanel";
import { Package, Truck, Bell, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

export default function Stock() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { role } = useAuth();
  const canManageTransfers = role === "administrateur" || role === "superviseur";

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-primary" />
          <span className="text-gradient">Stock</span> Global
        </h1>
        <p className="text-muted-foreground">
          Suivi des niveaux de stock et alertes de rupture
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          {canManageTransfers && (
            <>
              <TabsTrigger value="transfers" className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Stock Livreurs
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Alertes
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Demandes
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <StockOverview />

          {/* Alerts Section */}
          <StockAlerts />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stock Table */}
            <div className="lg:col-span-2">
              <StockTable 
                onSelectProduct={setSelectedProductId}
                selectedProductId={selectedProductId}
              />
            </div>

            {/* Stock History */}
            <div>
              <StockHistory productId={selectedProductId} />
            </div>
          </div>
        </TabsContent>

        {canManageTransfers && (
          <TabsContent value="transfers">
            <StockTransferManager />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
