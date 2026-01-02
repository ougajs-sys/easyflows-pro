import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, Bell } from "lucide-react";

export function StockAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, stock, is_active")
        .eq("is_active", true)
        .lte("stock", 10)
        .order("stock", { ascending: true });

      if (error) throw error;

      return products || [];
    },
  });

  if (isLoading) {
    return (
      <Card className="glass border-warning/30">
        <CardContent className="p-4">
          <div className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="glass border-success/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-success">
            <Bell className="w-5 h-5" />
            <span className="font-medium">Aucune alerte de stock - Tous les produits sont en stock suffisant</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const outOfStock = alerts.filter(p => p.stock === 0);
  const lowStock = alerts.filter(p => p.stock > 0);

  return (
    <Card className="glass border-warning/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Alertes de Stock
          <Badge variant="destructive" className="ml-2">
            {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Out of Stock */}
          {outOfStock.length > 0 && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="font-medium text-destructive">Rupture de Stock ({outOfStock.length})</span>
              </div>
              <div className="space-y-2">
                {outOfStock.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded bg-background/50"
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge variant="destructive" className="text-xs">
                      0 unité
                    </Badge>
                  </div>
                ))}
                {outOfStock.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{outOfStock.length - 5} autres produits
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Low Stock */}
          {lowStock.length > 0 && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="font-medium text-warning">Stock Faible ({lowStock.length})</span>
              </div>
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded bg-background/50"
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                      {product.stock} unité{product.stock > 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{lowStock.length - 5} autres produits
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
