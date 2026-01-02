import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StockOverview } from "@/components/stock/StockOverview";
import { StockTable } from "@/components/stock/StockTable";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { StockHistory } from "@/components/stock/StockHistory";
import { Package } from "lucide-react";

export default function Stock() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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

      {/* Overview Stats */}
      <StockOverview />

      {/* Alerts Section */}
      <div className="mt-6">
        <StockAlerts />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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
    </DashboardLayout>
  );
}
