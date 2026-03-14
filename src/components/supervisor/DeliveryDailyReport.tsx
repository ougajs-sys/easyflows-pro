import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDailyWindow, formatWindowLabel } from "@/lib/dailyWindow";
import { formatCurrency } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

const DELIVERY_FEE = 1500; // FCFA per delivery

interface DeliveryRow {
  id: string;
  name: string;
  zone: string | null;
  status: string;
  received: number;
  delivered: number;
  reported: number;
  cancelled: number;
  inProgress: number;
  deliveryRate: number;
  revenue: number;
  collected: number;
  remaining: number;
  fees: number;
  toRemit: number;
}

export function DeliveryDailyReport() {
  const { user } = useAuth();
  const { start, end, startISO, endISO } = getDailyWindow();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["delivery-daily-report", startISO],
    enabled: !!user,
    queryFn: async () => {
      // 1. Get active delivery persons
      const { data: dps, error: dpErr } = await supabase
        .from("delivery_persons")
        .select("id, user_id, status, zone")
        .eq("is_active", true);
      if (dpErr) throw dpErr;
      if (!dps?.length) return [];

      // 2. Get profiles
      const userIds = dps.map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", [...new Set(userIds)]);
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p.full_name || "Inconnu";
      });

      // 3. Get orders in the window assigned to these delivery persons
      const dpIds = dps.map((d) => d.id);
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id, status, total_amount, amount_paid, delivery_person_id")
        .in("delivery_person_id", dpIds)
        .gte("created_at", startISO)
        .lt("created_at", endISO);
      if (oErr) throw oErr;

      // 4. Aggregate per delivery person
      const result: DeliveryRow[] = dps.map((dp) => {
        const dpOrders = (orders || []).filter(
          (o) => o.delivery_person_id === dp.id
        );
        const received = dpOrders.length;
        const delivered = dpOrders.filter((o) => o.status === "delivered").length;
        const reported = dpOrders.filter((o) => o.status === "reported").length;
        const cancelled = dpOrders.filter((o) => o.status === "cancelled").length;
        const inProgress = dpOrders.filter((o) =>
          ["pending", "confirmed", "in_transit"].includes(o.status)
        ).length;
        const deliveredOrders = dpOrders.filter((o) => o.status === "delivered");
        const revenue = deliveredOrders.reduce(
          (s, o) => s + Number(o.total_amount || 0),
          0
        );
        const collected = deliveredOrders.reduce(
          (s, o) => s + Number(o.amount_paid || 0),
          0
        );
        const fees = delivered * DELIVERY_FEE;

        return {
          id: dp.id,
          name: profileMap[dp.user_id] || "Inconnu",
          zone: dp.zone,
          status: dp.status,
          received,
          delivered,
          reported,
          cancelled,
          inProgress,
          deliveryRate: received > 0 ? Math.round((delivered / received) * 100) : 0,
          revenue,
          collected,
          remaining: revenue - collected,
          fees,
          toRemit: collected - fees,
        };
      });

      return result.sort((a, b) => b.delivered - a.delivered);
    },
    refetchInterval: 30000,
  });

  const totals = React.useMemo(() => {
    if (!rows?.length) return null;
    return rows.reduce(
      (acc, r) => ({
        received: acc.received + r.received,
        delivered: acc.delivered + r.delivered,
        reported: acc.reported + r.reported,
        cancelled: acc.cancelled + r.cancelled,
        inProgress: acc.inProgress + r.inProgress,
        revenue: acc.revenue + r.revenue,
        collected: acc.collected + r.collected,
        remaining: acc.remaining + r.remaining,
        fees: acc.fees + r.fees,
        toRemit: acc.toRemit + r.toRemit,
      }),
      {
        received: 0,
        delivered: 0,
        reported: 0,
        cancelled: 0,
        inProgress: 0,
        revenue: 0,
        collected: 0,
        remaining: 0,
        fees: 0,
        toRemit: 0,
      }
    );
  }, [rows]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-success/20 text-success border-success/30 text-[10px]">
            Dispo
          </Badge>
        );
      case "busy":
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">
            En livraison
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            Hors ligne
          </Badge>
        );
    }
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-primary" />
            Rapport Livreurs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {formatWindowLabel(start, end)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {rows?.length ?? 0} livreurs
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !rows?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun livreur actif
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Livreur</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-center">Reçues</TableHead>
                  <TableHead className="text-center">Livrées</TableHead>
                  <TableHead className="text-center">En cours</TableHead>
                  <TableHead className="text-center">Report.</TableHead>
                  <TableHead className="text-center">Annul.</TableHead>
                  <TableHead className="text-center">Taux</TableHead>
                  <TableHead className="text-right min-w-[100px]">CA</TableHead>
                  <TableHead className="text-right min-w-[100px]">Encaissé</TableHead>
                  <TableHead className="text-right min-w-[100px]">Reste</TableHead>
                  <TableHead className="text-right min-w-[100px]">Frais</TableHead>
                  <TableHead className="text-right min-w-[110px]">À reverser</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.zone || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(r.status)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {r.received}
                    </TableCell>
                    <TableCell className="text-center font-medium text-success">
                      {r.delivered}
                    </TableCell>
                    <TableCell className="text-center font-medium text-warning">
                      {r.inProgress}
                    </TableCell>
                    <TableCell className="text-center font-medium text-warning">
                      {r.reported}
                    </TableCell>
                    <TableCell className="text-center font-medium text-destructive">
                      {r.cancelled}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "font-bold text-sm",
                          r.deliveryRate >= 70
                            ? "text-success"
                            : r.deliveryRate >= 40
                            ? "text-warning"
                            : "text-destructive"
                        )}
                      >
                        {r.deliveryRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(r.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-success">
                      {formatCurrency(r.collected)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-warning">
                      {formatCurrency(r.remaining)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(r.fees)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      <span
                        className={cn(
                          r.toRemit >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {formatCurrency(r.toRemit)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {totals && (
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-center">{totals.received}</TableCell>
                    <TableCell className="text-center text-success">
                      {totals.delivered}
                    </TableCell>
                    <TableCell className="text-center text-warning">
                      {totals.inProgress}
                    </TableCell>
                    <TableCell className="text-center text-warning">
                      {totals.reported}
                    </TableCell>
                    <TableCell className="text-center text-destructive">
                      {totals.cancelled}
                    </TableCell>
                    <TableCell className="text-center">
                      {totals.received > 0
                        ? Math.round((totals.delivered / totals.received) * 100)
                        : 0}
                      %
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(totals.collected)}
                    </TableCell>
                    <TableCell className="text-right text-warning">
                      {formatCurrency(totals.remaining)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.fees)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          totals.toRemit >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {formatCurrency(totals.toRemit)}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
