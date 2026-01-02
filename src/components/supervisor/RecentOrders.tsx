import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Package, User, MapPin, Phone, Truck, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderDetail {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: string | null;
  clients: { full_name: string; phone: string } | null;
  products: { name: string } | null;
  deliveryPersonName: string | null;
  deliveryPersonPhone?: string | null;
}

export function RecentOrders() {
  const isMobile = useIsMobile();
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

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

      let profiles: Record<string, { name: string; phone: string | null }> = {};
      if (deliveryPersonIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", deliveryPersonIds);

        profiles = profilesData?.reduce((acc, p) => {
          acc[p.id] = { name: p.full_name || "Inconnu", phone: p.phone };
          return acc;
        }, {} as Record<string, { name: string; phone: string | null }>) || {};
      }

      return data?.map(order => ({
        ...order,
        deliveryPersonName: order.delivery_persons?.user_id 
          ? profiles[order.delivery_persons.user_id]?.name || "Inconnu"
          : null,
        deliveryPersonPhone: order.delivery_persons?.user_id 
          ? profiles[order.delivery_persons.user_id]?.phone
          : null,
      }));
    },
    refetchInterval: 30000,
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

  // Mobile card view
  const MobileOrderCard = ({ order }: { order: OrderDetail }) => (
    <div
      onClick={() => setSelectedOrder(order)}
      className="p-4 rounded-xl border bg-card/60 hover:bg-card/90 transition-all cursor-pointer active:scale-[0.98] shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm font-bold">{order.order_number}</span>
        {getStatusBadge(order.status)}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <User className="w-4 h-4 text-primary" />
          <span className="font-medium">{order.clients?.full_name || "Client inconnu"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-4 h-4" />
          <span>{order.products?.name || "Produit"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="font-bold text-primary">{formatCurrency(Number(order.total_amount || 0))} FCFA</span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
    </div>
  );

  // Desktop row view
  const DesktopOrderRow = ({ order }: { order: OrderDetail }) => (
    <div
      onClick={() => setSelectedOrder(order)}
      className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-all cursor-pointer"
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
  );

  // Order detail popup
  const OrderDetailDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md mx-4 rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono">{selectedOrder.order_number}</span>
              {getStatusBadge(selectedOrder.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order Info */}
            <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-bold text-lg text-primary">
                  {formatCurrency(Number(selectedOrder.total_amount || 0))} FCFA
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Produit</span>
                <span className="font-medium">{selectedOrder.products?.name || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="text-sm">
                  {format(new Date(selectedOrder.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </span>
              </div>
            </div>

            {/* Client Section */}
            <div className="p-4 rounded-lg border space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Client
              </h4>
              <p className="font-medium">{selectedOrder.clients?.full_name || "Inconnu"}</p>
              
              {selectedOrder.clients?.phone && (
                <a 
                  href={`tel:${selectedOrder.clients.phone}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span className="font-medium">{selectedOrder.clients.phone}</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
              )}
            </div>

            {/* Delivery Address */}
            {selectedOrder.delivery_address && (
              <div className="p-4 rounded-lg border space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Adresse de livraison
                </h4>
                <p className="text-sm text-muted-foreground">{selectedOrder.delivery_address}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedOrder.delivery_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Ouvrir dans Maps</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
              </div>
            )}

            {/* Delivery Person Section */}
            {selectedOrder.deliveryPersonName && (
              <div className="p-4 rounded-lg border space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  Livreur
                </h4>
                <p className="font-medium">{selectedOrder.deliveryPersonName}</p>
                
                {selectedOrder.deliveryPersonPhone && (
                  <a 
                    href={`tel:${selectedOrder.deliveryPersonPhone}`}
                    className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">{selectedOrder.deliveryPersonPhone}</span>
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </a>
                )}
              </div>
            )}

            {/* Close Button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setSelectedOrder(null)}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
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
            <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'space-y-3'}`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`${isMobile ? 'h-32' : 'h-16'} bg-secondary/30 rounded-lg animate-pulse`} />
              ))}
            </div>
          ) : recentOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune commande récente
            </div>
          ) : isMobile ? (
            <div className="grid grid-cols-1 gap-3">
              {recentOrders?.map((order) => (
                <MobileOrderCard key={order.id} order={order as OrderDetail} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders?.map((order) => (
                <DesktopOrderRow key={order.id} order={order as OrderDetail} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog />
    </>
  );
}