import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getDailyWindow, formatWindowLabel } from "@/lib/dailyWindow";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  ClipboardList,
  CheckCircle2,
  Truck,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Banknote,
  Clock,
} from "lucide-react";

export function DailyReportPanel() {
  const { user } = useAuth();
  const { start, end, startISO, endISO } = getDailyWindow();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["daily-report", startISO],
    enabled: !!user,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, total_amount, amount_paid, product_id")
        .gte("created_at", startISO)
        .lt("created_at", endISO);

      if (error) throw error;
      const all = orders || [];

      const received = all.length;
      const confirmed = all.filter((o) =>
        ["confirmed", "delivered", "in_transit"].includes(o.status)
      ).length;
      const delivered = all.filter((o) => o.status === "delivered").length;
      const cancelled = all.filter((o) => o.status === "cancelled").length;
      const reported = all.filter((o) => o.status === "reported").length;
      const pending = all.filter((o) =>
        ["pending", "confirmed", "in_transit"].includes(o.status)
      ).length;

      const deliveredOrders = all.filter((o) => o.status === "delivered");
      const revenue = deliveredOrders.reduce(
        (s, o) => s + Number(o.total_amount || 0),
        0
      );
      const collected = deliveredOrders.reduce(
        (s, o) => s + Number(o.amount_paid || 0),
        0
      );

      const confirmRate = received > 0 ? Math.round((confirmed / received) * 100) : 0;
      const deliveryRate = confirmed > 0 ? Math.round((delivered / confirmed) * 100) : 0;

      return {
        received,
        confirmed,
        delivered,
        cancelled,
        reported,
        pending,
        revenue,
        collected,
        remaining: revenue - collected,
        confirmRate,
        deliveryRate,
      };
    },
    refetchInterval: 30000,
  });

  const kpis = [
    { label: "Reçues", value: stats?.received ?? 0, icon: ClipboardList, color: "text-primary" },
    { label: "Confirmées", value: stats?.confirmed ?? 0, icon: CheckCircle2, color: "text-success" },
    { label: "Livrées", value: stats?.delivered ?? 0, icon: Truck, color: "text-success" },
    { label: "En cours", value: stats?.pending ?? 0, icon: Clock, color: "text-warning" },
    { label: "Annulées", value: stats?.cancelled ?? 0, icon: XCircle, color: "text-destructive" },
    { label: "Reportées", value: stats?.reported ?? 0, icon: AlertTriangle, color: "text-warning" },
    { label: "Taux confirm.", value: `${stats?.confirmRate ?? 0}%`, icon: TrendingUp, color: "text-primary" },
    { label: "Taux livraison", value: `${stats?.deliveryRate ?? 0}%`, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5 text-primary" />
            Rapport Journalier
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {formatWindowLabel(start, end)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card/50"
                >
                  <k.icon className={`w-5 h-5 mb-1 ${k.color}`} />
                  <p className="text-xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Financial row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="flex flex-col items-center p-3 rounded-lg border bg-success/5">
                <Banknote className="w-5 h-5 text-success mb-1" />
                <p className="text-lg font-bold text-success">
                  {formatCurrency(stats?.revenue ?? 0)} FCFA
                </p>
                <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg border bg-primary/5">
                <Banknote className="w-5 h-5 text-primary mb-1" />
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(stats?.collected ?? 0)} FCFA
                </p>
                <p className="text-xs text-muted-foreground">Encaissé</p>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg border bg-warning/5">
                <Banknote className="w-5 h-5 text-warning mb-1" />
                <p className="text-lg font-bold text-warning">
                  {formatCurrency(stats?.remaining ?? 0)} FCFA
                </p>
                <p className="text-xs text-muted-foreground">Reste à encaisser</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
