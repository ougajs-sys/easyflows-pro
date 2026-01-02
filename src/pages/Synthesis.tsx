import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SynthesisFilters } from "@/components/synthesis/SynthesisFilters";
import { SynthesisOverview } from "@/components/synthesis/SynthesisOverview";
import { SynthesisCharts } from "@/components/synthesis/SynthesisCharts";
import { SynthesisTable } from "@/components/synthesis/SynthesisTable";
import { ExportPDFButton } from "@/components/synthesis/ExportPDFButton";
import { BarChart3 } from "lucide-react";

export default function Synthesis() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            <span className="text-gradient">Synthèse</span> Globale
          </h1>
          <p className="text-muted-foreground">
            Analyse détaillée des performances sur période personnalisable
          </p>
        </div>
        <ExportPDFButton dateRange={dateRange} />
      </div>

      {/* Filters */}
      <SynthesisFilters dateRange={dateRange} onDateRangeChange={setDateRange} />

      {/* Overview Stats */}
      <div className="mt-6">
        <SynthesisOverview dateRange={dateRange} />
      </div>

      {/* Charts */}
      <div className="mt-6">
        <SynthesisCharts dateRange={dateRange} />
      </div>

      {/* Detailed Table */}
      <div className="mt-6">
        <SynthesisTable dateRange={dateRange} />
      </div>
    </DashboardLayout>
  );
}
