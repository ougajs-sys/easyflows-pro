import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, User, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function RecentOrders() {
  const { data: recentOrders, isLoading } = useQuery({
    queryKey: ["recent-orders-supervisor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          delivery_address,
          clients (full_name, phone),
          products (name),
          delivery_persons (
            id,
            user_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get profiles for delivery persons
      const deliveryPersonIds = data
        ?.filter(o => o.delivery_persons?.user_id)
        .map(o => o.delivery_persons!.user_id) || [];

      let profiles: Record<string, string> = {};
      if (deliveryPersonIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", deliveryPersonIds);

        profiles = profilesData?.reduce((acc, p) => {
          acc[p.id] = p.full_name || "Inconnu";
          return acc;
        }, {} as Record<string, string>) || {};
      }

      return data?.map(order => ({
        ...order,
        deliveryPersonName: order.delivery_persons?.user_id 
          ? profiles[order.delivery_persons.user_id] || "Inconnu"
          : null,
      }));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "En attente", className: "bg-warning/20 text-warning border-warning/30" },
      confirmed: { label: "Confirmée", className: "bg-primary/20 text-primary border-primary/30" },
      in_transit: { label: "En transit", className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
      delivered: { label: "Livrée", className: "bg-success/20 text-success border-success/30" },
      cancelled: { label: "Annulée", className: "bg-destructive/20 text-destructive border-destructive/30" },
      reported: { label: "Reportée", className: "bg-muted text-muted-foreground" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-secondary" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Commandes Récentes
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Temps réel
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentOrders?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune commande récente
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders?.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{order.clients?.full_name || "Client inconnu"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <span>{order.products?.name || "Produit"}</span>
                      </div>
                    </div>
                    {order.delivery_address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{order.delivery_address}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(Number(order.total_amount || 0))} FCFA</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                    </p>
                    {order.deliveryPersonName && (
                      <p className="text-xs text-primary mt-1">
                        🚚 {order.deliveryPersonName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
