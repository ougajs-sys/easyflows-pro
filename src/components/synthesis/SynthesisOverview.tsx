import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, CreditCard, Users, TrendingUp, Target, XCircle, Clock } from "lucide-react";

interface SynthesisOverviewProps {
  dateRange: { from: Date; to: Date };
}

export function SynthesisOverview({ dateRange }: SynthesisOverviewProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["synthesis-overview", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const fromISO = dateRange.from.toISOString();
      const toISO = new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // Get orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, total_amount, amount_paid")
        .gte("created_at", fromISO)
        .lt("created_at", toISO);

      if (ordersError) throw ordersError;

      // Get clients created in date range
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .gte("created_at", fromISO)
        .lt("created_at", toISO);

      if (clientsError) throw clientsError;

      // Get payments in date range
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, status")
        .gte("created_at", fromISO)
        .lt("created_at", toISO);

      if (paymentsError) throw paymentsError;

      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter(o => o.status === "delivered").length || 0;
      const cancelledOrders = orders?.filter(o => o.status === "cancelled").length || 0;
      const pendingOrders = orders?.filter(o => !["delivered", "cancelled"].includes(o.status)).length || 0;

      const totalRevenue = orders
        ?.filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

      const totalCollected = payments
        ?.filter(p => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      const totalPending = orders
        ?.filter(o => o.status !== "cancelled")
        .reduce((sum, o) => sum + (Number(o.total_amount || 0) - Number(o.amount_paid || 0)), 0) || 0;

      const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
      const avgOrderValue = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

      return {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        pendingOrders,
        totalRevenue,
        totalCollected,
        totalPending,
        newClients: clients?.length || 0,
        deliveryRate,
        avgOrderValue,
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      label: "Total Commandes",
      value: stats?.totalOrders || 0,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Commandes Livrées",
      value: stats?.deliveredOrders || 0,
      icon: Truck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Taux de Livraison",
      value: `${stats?.deliveryRate || 0}%`,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Commandes Annulées",
      value: stats?.cancelledOrders || 0,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Chiffre d'Affaires",
      value: `${formatCurrency(stats?.totalRevenue || 0)} FCFA`,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
      large: true,
    },
    {
      label: "Montant Encaissé",
      value: `${formatCurrency(stats?.totalCollected || 0)} FCFA`,
      icon: CreditCard,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Montant en Attente",
      value: `${formatCurrency(stats?.totalPending || 0)} FCFA`,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Nouveaux Clients",
      value: stats?.newClients || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-24 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`glass ${stat.large ? "md:col-span-2" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
