import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryPersonData {
  id: string;
  name: string;
  zone: string | null;
  status: string;
  totalOrders: number;
  completedOrders: number;
}

export function DeliveryStatus() {
  const { data: deliveryPersons, isLoading } = useQuery({
    queryKey: ["active-delivery-persons"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get active delivery persons
      const { data: dps, error: dpError } = await supabase
        .from("delivery_persons")
        .select("id, user_id, zone, status")
        .eq("is_active", true);

      if (dpError) throw dpError;

      // Get profiles
      const userIds = dps?.map(dp => dp.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get today's orders
      const dpIds = dps?.map(dp => dp.id) || [];
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, delivery_person_id")
        .in("delivery_person_id", dpIds)
        .gte("created_at", todayISO);

      if (ordersError) throw ordersError;

      const result: DeliveryPersonData[] = dps?.map(dp => {
        const profile = profiles?.find(p => p.id === dp.user_id);
        const dpOrders = orders?.filter(o => o.delivery_person_id === dp.id) || [];
        const completedOrders = dpOrders.filter(o => o.status === "delivered").length;

        return {
          id: dp.id,
          name: profile?.full_name || "Inconnu",
          zone: dp.zone,
          status: dp.status,
          totalOrders: dpOrders.length,
          completedOrders,
        };
      }) || [];

      // Sort: available first, then by completed orders
      return result.sort((a, b) => {
        if (a.status === "available" && b.status !== "available") return -1;
        if (a.status !== "available" && b.status === "available") return 1;
        return b.completedOrders - a.completedOrders;
      });
    },
    refetchInterval: 30000,
  });

  const onlineCount = deliveryPersons?.filter(dp => dp.status !== "offline").length || 0;

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Livreurs Actifs</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!deliveryPersons || deliveryPersons.length === 0) {
    return (
      <div className="glass rounded-xl p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Livreurs Actifs</h3>
          <span className="text-sm text-muted-foreground">0 en ligne</span>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun livreur actif</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Livreurs Actifs</h3>
        <span className="text-sm text-muted-foreground">{onlineCount} en ligne</span>
      </div>

      <div className="space-y-3">
        {deliveryPersons.map((delivery, index) => {
          const progress = delivery.totalOrders > 0 
            ? (delivery.completedOrders / delivery.totalOrders) * 100 
            : 0;
          const isCompleted = delivery.totalOrders > 0 && delivery.completedOrders === delivery.totalOrders;
          const isOffline = delivery.status === "offline";

          return (
            <div
              key={delivery.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isOffline
                  ? "bg-muted/30 border-border opacity-60"
                  : isCompleted
                    ? "bg-success/5 border-success/20"
                    : "bg-secondary/30 border-border hover:border-primary/30"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isOffline
                      ? "bg-muted"
                      : isCompleted 
                        ? "bg-success/20" 
                        : "bg-primary/20"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Truck className={cn(
                      "w-5 h-5",
                      isOffline ? "text-muted-foreground" : "text-primary"
                    )} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate">{delivery.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {delivery.zone || "Zone N/D"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted ? "bg-success" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {delivery.completedOrders}/{delivery.totalOrders}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
