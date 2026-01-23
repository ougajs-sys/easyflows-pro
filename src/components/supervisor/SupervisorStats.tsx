import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Package, Truck, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

export function SupervisorStats() {
  const { data: stats } = useQuery({
    queryKey: ["supervisor-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get today's orders
      const { data: todayOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, total_amount")
        .gte("created_at", todayISO);

      if (ordersError) throw ordersError;

      // Get active delivery persons
      const { data: deliveryPersons, error: dpError } = await supabase
        .from("delivery_persons")
        .select("id, status")
        .eq("is_active", true);

      if (dpError) throw dpError;

      // Get today's deliveries
      const { data: deliveries, error: delError } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "delivered")
        .gte("delivered_at", todayISO);

      if (delError) throw delError;

      // Get active callers (users with role appelant)
      const { data: callers, error: callersError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "appelant");

      if (callersError) throw callersError;

      const totalRevenue = todayOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const deliveredCount = todayOrders?.filter(o => o.status === "delivered").length || 0;
      const deliveryRate = todayOrders?.length ? Math.round((deliveredCount / todayOrders.length) * 100) : 0;

      return {
        ordersToday: todayOrders?.length || 0,
        deliveredToday: deliveries?.length || 0,
        activeDeliveryPersons: deliveryPersons?.filter(dp => dp.status === "available" || dp.status === "busy").length || 0,
        totalDeliveryPersons: deliveryPersons?.length || 0,
        totalCallers: callers?.length || 0,
        revenue: totalRevenue,
        deliveryRate,
      };
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Commandes Aujourd'hui"
        value={stats?.ordersToday || 0}
        change={stats?.deliveryRate || 0}
        icon={<Package className="w-5 h-5" />}
        color="primary"
      />
      <StatCard
        title="Livraisons Effectuées"
        value={stats?.deliveredToday || 0}
        icon={<Truck className="w-5 h-5" />}
        color="success"
      />
      <StatCard
        title="Livreurs Actifs"
        value={`${stats?.activeDeliveryPersons || 0}/${stats?.totalDeliveryPersons || 0}`}
        icon={<Truck className="w-5 h-5" />}
        color="warning"
      />
      <StatCard
        title="Chiffre du Jour"
        value={`${formatCurrency(stats?.revenue || 0)} FCFA`}
        icon={<TrendingUp className="w-5 h-5" />}
        color="primary"
      />
    </div>
  );
}
