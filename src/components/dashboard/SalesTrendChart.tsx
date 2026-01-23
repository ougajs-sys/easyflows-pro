import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatCurrency";

interface SalesData {
  date: string;
  total: number;
  orders: number;
}

export function SalesTrendChart() {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    async function fetchSalesData() {
      setLoading(true);
      
      const startDate = startOfDay(subDays(new Date(), period - 1));
      const endDate = endOfDay(new Date());

      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at, total_amount, status")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .in("status", ["delivered", "in_transit", "confirmed", "pending"]);

      if (error) {
        console.error("Error fetching sales data:", error);
        setLoading(false);
        return;
      }

      // Group by day
      const salesByDay: Record<string, { total: number; orders: number }> = {};
      
      // Initialize all days
      for (let i = 0; i < period; i++) {
        const date = format(subDays(new Date(), period - 1 - i), "yyyy-MM-dd");
        salesByDay[date] = { total: 0, orders: 0 };
      }

      // Aggregate orders
      orders?.forEach((order) => {
        const date = format(new Date(order.created_at), "yyyy-MM-dd");
        if (salesByDay[date]) {
          salesByDay[date].total += Number(order.total_amount) || 0;
          salesByDay[date].orders += 1;
        }
      });

      // Convert to array
      const chartData = Object.entries(salesByDay).map(([date, values]) => ({
        date: format(new Date(date), "dd MMM", { locale: fr }),
        fullDate: date,
        total: values.total,
        orders: values.orders,
      }));

      setData(chartData);
      setLoading(false);
    }

    fetchSalesData();
  }, [period]);

  const totalSales = data.reduce((sum, d) => sum + d.total, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Tendances des Ventes</CardTitle>
          </div>
          <div className="flex gap-1">
            {[7, 14, 30].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as 7 | 14 | 30)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {p}j
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalSales, { compact: true })} FCFA</p>
            <p className="text-xs text-muted-foreground">Ventes totales</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">Commandes</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-[250px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value.toLocaleString()} FCFA`, "Ventes"]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
