import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { format, eachDayOfInterval, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Users } from "lucide-react";

interface SynthesisChartsProps {
  dateRange: { from: Date; to: Date };
}

export function SynthesisCharts({ dateRange }: SynthesisChartsProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["synthesis-charts", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const fromISO = dateRange.from.toISOString();
      const toISO = new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // Get orders with details
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, status, total_amount, created_at, created_by,
          products (name),
          delivery_persons (user_id)
        `)
        .gte("created_at", fromISO)
        .lt("created_at", toISO);

      if (ordersError) throw ordersError;

      // Daily data
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const dailyData = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayOrders = orders?.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= dayStart && orderDate < dayEnd;
        }) || [];

        const delivered = dayOrders.filter(o => o.status === "delivered");
        
        return {
          date: format(day, "dd/MM", { locale: fr }),
          fullDate: format(day, "dd MMM", { locale: fr }),
          commandes: dayOrders.length,
          livrees: delivered.length,
          revenue: delivered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        };
      });

      // Status distribution
      const statusCounts = {
        delivered: orders?.filter(o => o.status === "delivered").length || 0,
        pending: orders?.filter(o => o.status === "pending").length || 0,
        confirmed: orders?.filter(o => o.status === "confirmed").length || 0,
        in_transit: orders?.filter(o => o.status === "in_transit").length || 0,
        cancelled: orders?.filter(o => o.status === "cancelled").length || 0,
        reported: orders?.filter(o => o.status === "reported").length || 0,
      };

      // Top products
      const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      orders?.forEach(o => {
        const productName = o.products?.name || "Inconnu";
        if (!productCounts[productName]) {
          productCounts[productName] = { name: productName, count: 0, revenue: 0 };
        }
        productCounts[productName].count++;
        if (o.status === "delivered") {
          productCounts[productName].revenue += Number(o.total_amount || 0);
        }
      });

      const topProducts = Object.values(productCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top callers performance
      const callerStats: Record<string, { id: string; orders: number; delivered: number }> = {};
      orders?.forEach(o => {
        if (!o.created_by) return;
        if (!callerStats[o.created_by]) {
          callerStats[o.created_by] = { id: o.created_by, orders: 0, delivered: 0 };
        }
        callerStats[o.created_by].orders++;
        if (o.status === "delivered") {
          callerStats[o.created_by].delivered++;
        }
      });

      // Get caller names
      const callerIds = Object.keys(callerStats);
      let topCallers: { name: string; orders: number; delivered: number; rate: number }[] = [];
      
      if (callerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", callerIds);

        topCallers = Object.values(callerStats)
          .map(c => ({
            name: profiles?.find(p => p.id === c.id)?.full_name || "Inconnu",
            orders: c.orders,
            delivered: c.delivered,
            rate: c.orders > 0 ? Math.round((c.delivered / c.orders) * 100) : 0,
          }))
          .sort((a, b) => b.delivered - a.delivered)
          .slice(0, 5);
      }

      return {
        dailyData,
        statusCounts,
        topProducts,
        topCallers,
      };
    },
  });

  const statusPieData = chartData ? [
    { name: "Livrées", value: chartData.statusCounts.delivered, color: "hsl(var(--success))" },
    { name: "En attente", value: chartData.statusCounts.pending, color: "hsl(var(--warning))" },
    { name: "Confirmées", value: chartData.statusCounts.confirmed, color: "hsl(var(--primary))" },
    { name: "En transit", value: chartData.statusCounts.in_transit, color: "hsl(142 76% 36%)" },
    { name: "Annulées", value: chartData.statusCounts.cancelled, color: "hsl(var(--destructive))" },
    { name: "Reportées", value: chartData.statusCounts.reported, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0) : [];

  const chartConfig = {
    commandes: { label: "Commandes", color: "hsl(var(--primary))" },
    livrees: { label: "Livrées", color: "hsl(var(--success))" },
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-72 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Trend */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Évolution du Chiffre d'Affaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-56">
            <AreaChart data={chartData?.dailyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Orders vs Delivered */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-primary" />
            Commandes vs Livrées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-56">
            <BarChart data={chartData?.dailyData}>
              <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="commandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="livrees" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Répartition des Statuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {statusPieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-primary" />
            Top Produits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData?.topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                  {index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.count} commandes • {new Intl.NumberFormat("fr-FR").format(product.revenue)} FCFA
                  </p>
                </div>
                <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(product.count / (chartData.topProducts[0]?.count || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {(!chartData?.topProducts || chartData.topProducts.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Aucun produit sur cette période
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Callers */}
      <Card className="glass lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            Performance des Appelants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {chartData?.topCallers.map((caller, index) => (
              <div key={caller.name} className="p-4 rounded-lg bg-card/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                  <span className="font-medium text-sm truncate">{caller.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{caller.orders}</p>
                    <p className="text-xs text-muted-foreground">Commandes</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-success">{caller.delivered}</p>
                    <p className="text-xs text-muted-foreground">Livrées</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taux</span>
                    <span className="font-medium">{caller.rate}%</span>
                  </div>
                </div>
              </div>
            ))}
            {(!chartData?.topCallers || chartData.topCallers.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-4 col-span-full">
                Aucun appelant sur cette période
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
