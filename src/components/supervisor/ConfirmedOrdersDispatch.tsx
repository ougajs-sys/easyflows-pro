import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  User, 
  MapPin, 
  Phone, 
  Truck, 
  Package,
  ExternalLink,
  Loader2,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfirmedOrder {
  id: string;
  order_number: string | null;
  total_amount: number;
  amount_due: number | null;
  created_at: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  client: { 
    full_name: string; 
    phone: string;
    zone: string | null;
    address: string | null;
  } | null;
  product: { name: string } | null;
  quantity: number;
}

interface DeliveryPerson {
  id: string;
  name: string;
  zone: string | null;
  status: string;
  pendingOrders: number;
}

export function ConfirmedOrdersDispatch() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<ConfirmedOrder | null>(null);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch confirmed orders without a delivery person assigned
  const { data: confirmedOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["confirmed-orders-to-dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          total_amount,
          amount_due,
          created_at,
          delivery_address,
          delivery_notes,
          quantity,
          client:clients (full_name, phone, zone, address),
          product:products (name)
        `)
        .eq("status", "confirmed")
        .is("delivery_person_id", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ConfirmedOrder[];
    },
    refetchInterval: 30000,
  });

  // Fetch available delivery persons
  const { data: deliveryPersons, isLoading: dpLoading } = useQuery({
    queryKey: ["available-delivery-persons"],
    queryFn: async () => {
      const { data: dps, error: dpError } = await supabase
        .from("delivery_persons")
        .select("id, user_id, zone, status")
        .eq("is_active", true)
        .in("status", ["available", "busy"]);

      if (dpError) throw dpError;

      // Get profiles
      const userIds = dps?.map(dp => dp.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get pending orders count per delivery person
      const { data: pendingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id, delivery_person_id")
        .in("delivery_person_id", dps?.map(dp => dp.id) || [])
        .in("status", ["confirmed", "in_transit"]);

      if (ordersError) throw ordersError;

      const result: DeliveryPerson[] = dps?.map(dp => {
        const profile = profiles?.find(p => p.id === dp.user_id);
        const dpPendingOrders = pendingOrders?.filter(o => o.delivery_person_id === dp.id) || [];
        return {
          id: dp.id,
          name: profile?.full_name || "Inconnu",
          zone: dp.zone,
          status: dp.status,
          pendingOrders: dpPendingOrders.length,
        };
      }) || [];

      return result.sort((a, b) => a.pendingOrders - b.pendingOrders);
    },
    refetchInterval: 30000,
  });

  const handleAssignDeliveryPerson = async () => {
    if (!selectedOrder || !selectedDeliveryPerson) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_person_id: selectedDeliveryPerson })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });
      queryClient.invalidateQueries({ queryKey: ["available-delivery-persons"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });

      toast({
        title: "Commande assignée",
        description: `La commande ${selectedOrder.order_number} a été assignée au livreur.`,
      });

      setSelectedOrder(null);
      setSelectedDeliveryPerson("");
    } catch (error) {
      console.error("Error assigning delivery person:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le livreur",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const OrderCard = ({ order }: { order: ConfirmedOrder }) => (
    <div
      onClick={() => setSelectedOrder(order)}
      className="p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm font-bold">{order.order_number}</span>
        <Badge className="bg-primary/20 text-primary border-primary/30">
          À distribuer
        </Badge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <User className="w-4 h-4 text-primary" />
          <span className="font-medium">{order.client?.full_name || "Client inconnu"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-4 h-4" />
          <span>{order.product?.name || "Produit"} x{order.quantity}</span>
        </div>
        {(order.delivery_address || order.client?.address || order.client?.zone) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="truncate">
              {order.delivery_address || order.client?.address || order.client?.zone}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="font-bold text-primary">{formatCurrency(Number(order.total_amount || 0))} FCFA</span>
        <Button size="sm" variant="outline" className="gap-1">
          <Send className="w-3 h-3" />
          Assigner
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card className="glass border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Commandes Confirmées à Distribuer
            </CardTitle>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              {confirmedOrders?.length || 0} en attente
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 bg-secondary/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : confirmedOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success opacity-50" />
              <p>Toutes les commandes confirmées ont été assignées</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {confirmedOrders?.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => {
        setSelectedOrder(null);
        setSelectedDeliveryPerson("");
      }}>
        <DialogContent className="max-w-md mx-4 rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Assigner un livreur
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">{selectedOrder.order_number}</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(Number(selectedOrder.total_amount || 0))} FCFA
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-primary" />
                  <span>{selectedOrder.client?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span>{selectedOrder.product?.name} x{selectedOrder.quantity}</span>
                </div>
                {(selectedOrder.delivery_address || selectedOrder.client?.address) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedOrder.delivery_address || selectedOrder.client?.address}</span>
                  </div>
                )}
              </div>

              {/* Client Contact */}
              {selectedOrder.client?.phone && (
                <a 
                  href={`tel:${selectedOrder.client.phone}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span className="font-medium">{selectedOrder.client.phone}</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
              )}

              {/* Delivery Person Selection */}
              <div className="space-y-3">
                <h4 className="font-semibold">Sélectionner un livreur</h4>
                {dpLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement des livreurs...
                  </div>
                ) : deliveryPersons?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun livreur disponible
                  </p>
                ) : (
                  <Select
                    value={selectedDeliveryPerson}
                    onValueChange={setSelectedDeliveryPerson}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un livreur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryPersons?.map((dp) => (
                        <SelectItem key={dp.id} value={dp.id}>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>{dp.name}</span>
                            {dp.zone && (
                              <span className="text-xs text-muted-foreground">({dp.zone})</span>
                            )}
                            <Badge variant="outline" className="text-xs ml-auto">
                              {dp.pendingOrders} en cours
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setSelectedOrder(null);
                    setSelectedDeliveryPerson("");
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handleAssignDeliveryPerson}
                  disabled={!selectedDeliveryPerson || isAssigning}
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assignation...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Assigner
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
