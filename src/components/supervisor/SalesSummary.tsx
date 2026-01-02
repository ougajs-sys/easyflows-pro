import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Package, CreditCard, Users, Target } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function SalesSummary() {
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["sales-summary"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get orders from last 7 days
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, total_amount, amount_paid, created_at, product_id")
        .gte("created_at", weekAgo.toISOString());

      if (ordersError) throw ordersError;

      // Get today's orders
      const todayOrders = orders?.filter(o => new Date(o.created_at) >= today) || [];
      const yesterdayStart = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayOrders = orders?.filter(o => {
        const date = new Date(o.created_at);
        return date >= yesterdayStart && date < today;
      }) || [];

      // Calculate daily stats for chart
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const dayOrders = orders?.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= date && orderDate < nextDate;
        }) || [];

        const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });
        dailyStats.push({
          name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          commandes: dayOrders.length,
          revenue: dayOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        });
      }

      // Status breakdown for pie chart
      const statusCounts = {
        delivered: orders?.filter(o => o.status === "delivered").length || 0,
        pending: orders?.filter(o => o.status === "pending").length || 0,
        confirmed: orders?.filter(o => o.status === "confirmed").length || 0,
        in_transit: orders?.filter(o => o.status === "in_transit").length || 0,
        cancelled: orders?.filter(o => o.status === "cancelled").length || 0,
        reported: orders?.filter(o => o.status === "reported").length || 0,
      };

      // Calculate totals
      const todayRevenue = todayOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const yesterdayRevenue = yesterdayOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const weekRevenue = orders?.filter(o => o.status === "delivered").reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const totalPending = orders?.filter(o => o.status !== "delivered" && o.status !== "cancelled").reduce((sum, o) => sum + (Number(o.total_amount || 0) - Number(o.amount_paid || 0)), 0) || 0;

      const revenueChange = yesterdayRevenue > 0 
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : 0;

      return {
        dailyStats,
        statusCounts,
        todayRevenue,
        weekRevenue,
        totalPending,
        revenueChange,
        todayOrdersCount: todayOrders.length,
        deliveryRate: todayOrders.length > 0 
          ? Math.round((todayOrders.filter(o => o.status === "delivered").length / todayOrders.length) * 100)
          : 0,
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pieData = salesData ? [
    { name: "Livrées", value: salesData.statusCounts.delivered, color: "hsl(var(--success))" },
    { name: "En attente", value: salesData.statusCounts.pending, color: "hsl(var(--warning))" },
    { name: "Confirmées", value: salesData.statusCounts.confirmed, color: "hsl(var(--primary))" },
    { name: "En transit", value: salesData.statusCounts.in_transit, color: "hsl(var(--info, 200 80% 50%))" },
    { name: "Annulées", value: salesData.statusCounts.cancelled, color: "hsl(var(--destructive))" },
    { name: "Reportées", value: salesData.statusCounts.reported, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0) : [];

  const chartConfig = {
    commandes: {
      label: "Commandes",
      color: "hsl(var(--primary))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--success))",
    },
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Synthèse des Ventes
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            7 derniers jours
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 bg-secondary/30 rounded-lg animate-pulse" />
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Aujourd'hui</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(salesData?.todayRevenue || 0)}</p>
                <p className="text-xs text-muted-foreground">FCFA</p>
                {salesData?.revenueChange !== 0 && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${salesData?.revenueChange! > 0 ? "text-success" : "text-destructive"}`}>
                    {salesData?.revenueChange! > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{Math.abs(salesData?.revenueChange || 0)}% vs hier</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Semaine</span>
                </div>
                <p className="text-xl font-bold text-success">{formatCurrency(salesData?.weekRevenue || 0)}</p>
                <p className="text-xs text-muted-foreground">FCFA total</p>
              </div>

              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-warning" />
                  <span className="text-sm text-muted-foreground">En attente</span>
                </div>
                <p className="text-xl font-bold text-warning">{formatCurrency(salesData?.totalPending || 0)}</p>
                <p className="text-xs text-muted-foreground">FCFA à encaisser</p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-muted-foreground">Taux livraison</span>
                </div>
                <p className="text-xl font-bold">{salesData?.deliveryRate || 0}%</p>
                <p className="text-xs text-muted-foreground">{salesData?.todayOrdersCount || 0} commandes</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Daily Orders */}
              <div className="p-4 rounded-lg bg-card/50 border">
                <h4 className="text-sm font-medium mb-4">Commandes par jour</h4>
                <ChartContainer config={chartConfig} className="h-48">
                  <BarChart data={salesData?.dailyStats}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="commandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Pie Chart - Status Distribution */}
              <div className="p-4 rounded-lg bg-card/50 border">
                <h4 className="text-sm font-medium mb-4">Répartition des statuts</h4>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
