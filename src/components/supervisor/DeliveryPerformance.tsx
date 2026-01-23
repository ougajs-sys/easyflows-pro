import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Truck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";

interface DeliveryPersonStats {
  id: string;
  name: string;
  zone: string | null;
  status: string;
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  dailyAmount: number;
}

export function DeliveryPerformance() {
  const { data: deliveryStats, isLoading } = useQuery({
    queryKey: ["delivery-performance"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get all active delivery persons with their profiles
      const { data: deliveryPersons, error: dpError } = await supabase
        .from("delivery_persons")
        .select(`
          id,
          user_id,
          status,
          zone,
          daily_deliveries,
          daily_amount
        `)
        .eq("is_active", true);

      if (dpError) throw dpError;

      // Get profiles for delivery persons
      const userIds = deliveryPersons?.map(dp => dp.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get today's orders per delivery person
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, delivery_person_id, total_amount")
        .in("delivery_person_id", deliveryPersons?.map(dp => dp.id) || [])
        .gte("created_at", todayISO);

      if (ordersError) throw ordersError;

      const stats: DeliveryPersonStats[] = deliveryPersons?.map(dp => {
        const profile = profiles?.find(p => p.id === dp.user_id);
        const dpOrders = orders?.filter(o => o.delivery_person_id === dp.id) || [];
        
        return {
          id: dp.id,
          name: profile?.full_name || "Inconnu",
          zone: dp.zone,
          status: dp.status,
          totalOrders: dpOrders.length,
          deliveredOrders: dpOrders.filter(o => o.status === "delivered").length,
          pendingOrders: dpOrders.filter(o => ["pending", "confirmed", "in_transit"].includes(o.status)).length,
          cancelledOrders: dpOrders.filter(o => o.status === "cancelled").length,
          dailyAmount: dpOrders
            .filter(o => o.status === "delivered")
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        };
      }) || [];

      return stats.sort((a, b) => b.deliveredOrders - a.deliveredOrders);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-success/20 text-success border-success/30">Disponible</Badge>;
      case "busy":
        return <Badge className="bg-warning/20 text-warning border-warning/30">En livraison</Badge>;
      case "offline":
        return <Badge variant="secondary">Hors ligne</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Performance Livreurs
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {deliveryStats?.length || 0} livreurs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : deliveryStats?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun livreur actif
          </div>
        ) : (
          deliveryStats?.map((dp) => {
            const deliveryRate = dp.totalOrders > 0 
              ? Math.round((dp.deliveredOrders / dp.totalOrders) * 100) 
              : 0;

            return (
              <div
                key={dp.id}
                className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{dp.name}</h4>
                    <p className="text-sm text-muted-foreground">{dp.zone || "Zone non définie"}</p>
                  </div>
                  {getStatusBadge(dp.status)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taux de livraison</span>
                    <span className="font-medium">{deliveryRate}%</span>
                  </div>
                  <Progress value={deliveryRate} className="h-2" />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="text-center p-2 rounded-lg bg-secondary/30">
                    <p className="text-lg font-bold">{dp.totalOrders}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-success/10">
                    <p className="text-lg font-bold text-success">{dp.deliveredOrders}</p>
                    <p className="text-xs text-muted-foreground">Livrées</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-warning/10">
                    <p className="text-lg font-bold text-warning">{dp.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground">En cours</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-destructive/10">
                    <p className="text-lg font-bold text-destructive">{dp.cancelledOrders}</p>
                    <p className="text-xs text-muted-foreground">Annulées</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Montant encaissé</span>
                    <span className="font-bold text-success">{formatCurrency(dp.dailyAmount)} FCFA</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
