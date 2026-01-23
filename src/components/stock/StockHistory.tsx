import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Package, TrendingUp, TrendingDown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatCurrency";

interface StockHistoryProps {
  productId: string | null;
}

export function StockHistory({ productId }: StockHistoryProps) {
  const { data: product } = useQuery({
    queryKey: ["stock-product-detail", productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, price, description, is_active")
        .eq("id", productId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["stock-product-orders", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          quantity,
          status,
          created_at,
          clients (full_name)
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });

  if (!productId) {
    return (
      <Card className="glass h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-5 h-5 text-primary" />
            Détails du Produit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-30" />
            <p>Sélectionnez un produit</p>
            <p className="text-sm">pour voir ses détails et historique</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-5 h-5 text-primary" />
          Détails du Produit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Info */}
        {product && (
          <div className="p-4 rounded-lg bg-card/50 border">
            <h3 className="font-bold text-lg mb-2">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Prix unitaire</p>
                <p className="font-bold">{formatCurrency(Number(product.price))} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock actuel</p>
                <p className={`font-bold ${
                  product.stock === 0 ? "text-destructive" :
                  product.stock <= 10 ? "text-warning" : "text-success"
                }`}>
                  {product.stock} unités
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Valeur du stock</p>
              <p className="font-bold text-primary">
                {formatCurrency(product.stock * Number(product.price))} FCFA
              </p>
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            Dernières sorties
          </h4>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm"
                >
                  <div>
                    <p className="font-medium">{order.clients?.full_name || "Client"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">-{order.quantity}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        order.status === "delivered" ? "text-success" :
                        order.status === "cancelled" ? "text-destructive" : ""
                      }`}
                    >
                      {order.status === "delivered" ? "Livré" :
                       order.status === "cancelled" ? "Annulé" :
                       order.status === "pending" ? "En attente" :
                       order.status === "confirmed" ? "Confirmé" : order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune commande récente
            </p>
          )}
        </div>

        {/* Stock Stats */}
        {recentOrders && recentOrders.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Ventes récentes (10 dernières)</p>
            <p className="font-bold">
              {recentOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + o.quantity, 0)} unités vendues
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
