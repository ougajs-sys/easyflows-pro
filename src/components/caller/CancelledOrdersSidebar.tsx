import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { XCircle, Package, Phone, MapPin, User, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string | null;
  status: OrderStatus;
  total_amount: number;
  amount_paid: number;
  amount_due: number | null;
  quantity: number;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  client: {
    id: string;
    full_name: string;
    phone: string;
    phone_secondary: string | null;
    address: string | null;
    zone: string | null;
  } | null;
  product: {
    name: string;
    price: number;
  } | null;
}

export function CancelledOrdersSidebar() {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: cancelledOrders, isLoading } = useQuery({
    queryKey: ["caller-cancelled-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total_amount,
          amount_paid,
          amount_due,
          quantity,
          created_at,
          created_by,
          assigned_to,
          delivery_address,
          delivery_notes,
          client:clients (id, full_name, phone, phone_secondary, address, zone),
          product:products (name, price)
        `)
        .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .eq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id && isOpen,
  });

  const cancelledCount = cancelledOrders?.length || 0;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="relative border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Commandes annulées
            {cancelledCount > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground">
                {cancelledCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Commandes annulées
              {cancelledCount > 0 && (
                <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                  {cancelledCount}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : cancelledOrders && cancelledOrders.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <XCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucune commande annulée</p>
                </CardContent>
              </Card>
            ) : (
              cancelledOrders?.map((order) => {
                const isAssigned = order.assigned_to === user?.id && order.created_by !== user?.id;
                
                return (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors bg-card border-border"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-mono text-sm text-primary">{order.order_number}</p>
                            <p className="font-medium">{order.client?.full_name || "Client inconnu"}</p>
                          </div>
                          {isAssigned && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                              Assignée
                            </Badge>
                          )}
                        </div>
                        <Badge className={cn("border bg-destructive/15 text-destructive border-destructive/30")}>
                          <XCircle className="w-3 h-3 mr-1" />
                          Annulée
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          <span>{order.product?.name} x{order.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{formatCurrency(Number(order.total_amount))} FCFA</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono">{selectedOrder?.order_number}</span>
              {selectedOrder && (
                <Badge className={cn("border bg-destructive/15 text-destructive border-destructive/30")}>
                  <XCircle className="w-3 h-3 mr-1" />
                  Annulée
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Produit</span>
                  <span className="font-medium">{selectedOrder.product?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quantité</span>
                  <span className="font-medium">{selectedOrder.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(Number(selectedOrder.total_amount))} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payé</span>
                  <span className="text-success">
                    {formatCurrency(Number(selectedOrder.amount_paid))} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-sm">
                    {format(new Date(selectedOrder.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </span>
                </div>
              </div>

              {/* Client Section */}
              <div className="p-4 rounded-lg border border-border space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Client
                </h4>
                <p className="font-medium">{selectedOrder.client?.full_name}</p>
                
                {selectedOrder.client?.phone && (
                  <a 
                    href={`tel:${selectedOrder.client.phone}`}
                    className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">{selectedOrder.client.phone}</span>
                  </a>
                )}

                {selectedOrder.client?.phone_secondary && (
                  <a 
                    href={`tel:${selectedOrder.client.phone_secondary}`}
                    className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{selectedOrder.client.phone_secondary}</span>
                    <span className="text-xs text-muted-foreground">(secondaire)</span>
                  </a>
                )}
              </div>

              {/* Address */}
              {(selectedOrder.delivery_address || selectedOrder.client?.address) && (
                <div className="p-4 rounded-lg border border-border space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Adresse
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.delivery_address || selectedOrder.client?.address}
                  </p>
                  {selectedOrder.client?.zone && (
                    <p className="text-xs text-muted-foreground">Zone: {selectedOrder.client.zone}</p>
                  )}
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => setSelectedOrder(null)}>
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
