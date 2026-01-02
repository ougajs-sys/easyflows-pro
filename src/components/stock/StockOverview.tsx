import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, CheckCircle, XCircle, TrendingDown } from "lucide-react";

export function StockOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stock-overview"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, stock, is_active");

      if (error) throw error;

      const activeProducts = products?.filter(p => p.is_active) || [];
      const totalProducts = activeProducts.length;
      const outOfStock = activeProducts.filter(p => p.stock === 0).length;
      const lowStock = activeProducts.filter(p => p.stock > 0 && p.stock <= 10).length;
      const healthyStock = activeProducts.filter(p => p.stock > 10).length;
      const totalUnits = activeProducts.reduce((sum, p) => sum + (p.stock || 0), 0);

      return {
        totalProducts,
        outOfStock,
        lowStock,
        healthyStock,
        totalUnits,
      };
    },
  });

  const statCards = [
    {
      label: "Total Produits",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Stock Total",
      value: `${stats?.totalUnits || 0} unités`,
      icon: Package,
      color: "text-foreground",
      bgColor: "bg-secondary",
    },
    {
      label: "Stock Sain",
      value: stats?.healthyStock || 0,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Stock Faible",
      value: stats?.lowStock || 0,
      icon: TrendingDown,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Rupture",
      value: stats?.outOfStock || 0,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
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
