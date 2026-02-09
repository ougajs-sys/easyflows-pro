import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Package, User, MapPin, Phone, Truck, ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/formatCurrency";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderDetail {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: string | null;
  delivery_person_id: string | null;
  assigned_to: string | null;
  clients: { full_name: string; phone: string } | null;
  products: { name: string } | null;
  deliveryPersonName: string | null;
  deliveryPersonPhone?: string | null;
  assignedCallerName: string | null;
  assignedCallerPhone?: string | null;
}

interface DeliveryPerson {
  id: string;
  name: string;
  phone: string | null;
  zone: string | null;
  status: string;
  pendingOrders: number;
}

const statusOptions: { value: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "pending", label: "En attente", icon: <AlertCircle className="w-4 h-4" />, color: "text-warning" },
  { value: "confirmed", label: "Confirmée", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-primary" },
  { value: "in_transit", label: "En transit", icon: <Truck className="w-4 h-4" />, color: "text-blue-500" },
  { value: "delivered", label: "Livrée", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-success" },
  { value: "cancelled", label: "Annulée", icon: <XCircle className="w-4 h-4" />, color: "text-destructive" },
  { value: "reported", label: "Reportée", icon: <AlertCircle className="w-4 h-4" />, color: "text-muted-foreground" },
];

export function RecentOrders() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("");
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

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
          delivery_person_id,
          assigned_to,
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
      const assignedCallerIds = data
        ?.filter(o => o.assigned_to)
        .map(o => o.assigned_to!) || [];
      const profileIds = Array.from(new Set([...deliveryPersonIds, ...assignedCallerIds]));

      let profiles: Record<string, { name: string; phone: string | null }> = {};
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", profileIds);

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
        assignedCallerName: order.assigned_to
          ? profiles[order.assigned_to]?.name || "Inconnu"
          : null,
        assignedCallerPhone: order.assigned_to
          ? profiles[order.assigned_to]?.phone
          : null,
      }));
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
      const deliveryPersonsData = dps ?? [];
      if (deliveryPersonsData.length === 0) return [];

      // Get profiles
      const userIds = deliveryPersonsData.map(dp => dp.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get pending orders count per delivery person
      const { data: pendingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id, delivery_person_id")
        .in("delivery_person_id", deliveryPersonsData.map(dp => dp.id))
        .in("status", ["confirmed", "in_transit"]);

      if (ordersError) throw ordersError;

      const result: DeliveryPerson[] = deliveryPersonsData.map(dp => {
        const profile = profiles?.find(p => p.id === dp.user_id);
        const dpPendingOrders = pendingOrders?.filter(o => o.delivery_person_id === dp.id) || [];
        return {
          id: dp.id,
          name: profile?.full_name || "Inconnu",
          phone: profile?.phone || null,
          zone: dp.zone,
          status: dp.status,
          pendingOrders: dpPendingOrders.length,
        };
      });

      return result.sort((a, b) => a.pendingOrders - b.pendingOrders);
    },
    refetchInterval: 30000,
  });

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    
    setIsUpdatingStatus(true);
    try {
      const updateData: { status: OrderStatus; delivered_at?: string } = { status: newStatus };
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Update local state
      setSelectedOrder({ ...selectedOrder, status: newStatus });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["recent-orders-supervisor"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      toast({
        title: "Statut mis à jour",
        description: `La commande ${selectedOrder.order_number} est maintenant "${statusOptions.find(s => s.value === newStatus)?.label}"`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const invalidateAssignmentQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });
    queryClient.invalidateQueries({ queryKey: ["recent-orders-supervisor"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["delivery-orders"] });
    queryClient.invalidateQueries({ queryKey: ["available-delivery-persons"] });
  };

  const handleUnassignDeliveryPerson = async () => {
    if (!selectedOrder?.delivery_person_id) return;

    setIsUpdatingAssignment(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_person_id: null })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              delivery_person_id: null,
              deliveryPersonName: null,
              deliveryPersonPhone: null,
            }
          : prev
      );
      setSelectedDeliveryPerson("");
      invalidateAssignmentQueries();

      toast({
        title: "Livreur désassigné",
        description: `Le livreur a été désassigné de la commande ${selectedOrder.order_number}.`,
      });
    } catch (error) {
      console.error("Error unassigning delivery person:", error);
      toast({
        title: "Erreur",
        description: "Impossible de désassigner le livreur",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const handleAssignDeliveryPerson = async (deliveryPersonId: string) => {
    if (!selectedOrder || !deliveryPersonId) return;
    if (deliveryPersonId === selectedOrder.delivery_person_id) return;

    const wasAssigned = Boolean(selectedOrder.delivery_person_id);
    setIsUpdatingAssignment(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_person_id: deliveryPersonId })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      const assignedDeliveryPerson = deliveryPersons?.find((dp) => dp.id === deliveryPersonId);
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              delivery_person_id: deliveryPersonId,
              deliveryPersonName: assignedDeliveryPerson?.name || "Inconnu",
              deliveryPersonPhone: assignedDeliveryPerson?.phone || null,
            }
          : prev
      );
      setSelectedDeliveryPerson(deliveryPersonId);
      invalidateAssignmentQueries();

      toast({
        title: wasAssigned ? "Livreur réassigné" : "Livreur assigné",
        description: `La commande ${selectedOrder.order_number} a été assignée à ${assignedDeliveryPerson?.name || "le livreur sélectionné"}.`,
      });
    } catch (error) {
      console.error("Error assigning delivery person:", error);
      toast({
        title: "Erreur",
        description: "Impossible de réassigner le livreur",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const handleUnassignCaller = async () => {
    if (!selectedOrder?.assigned_to) return;

    setIsUpdatingAssignment(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ assigned_to: null })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              assigned_to: null,
              assignedCallerName: null,
              assignedCallerPhone: null,
            }
          : prev
      );
      invalidateAssignmentQueries();

      toast({
        title: "Appelant désassigné",
        description: `La commande ${selectedOrder.order_number} n'a plus d'appelant assigné.`,
      });
    } catch (error) {
      console.error("Error unassigning caller:", error);
      toast({
        title: "Erreur",
        description: "Impossible de désassigner l'appelant",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

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

  // Mobile card view
  const MobileOrderCard = ({ order }: { order: OrderDetail }) => (
    <div
      onClick={() => {
        setSelectedOrder(order);
        setSelectedDeliveryPerson(order.delivery_person_id || "");
      }}
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
      onClick={() => {
        setSelectedOrder(order);
        setSelectedDeliveryPerson(order.delivery_person_id || "");
      }}
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
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => {
          setSelectedOrder(null);
          setSelectedDeliveryPerson("");
        }}
      >
        <DialogContent className="max-w-md mx-4 rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono">{selectedOrder.order_number}</span>
              {getStatusBadge(selectedOrder.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Change Section */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-4 h-4" />
                Changer le statut
              </h4>
              <Select
                value={selectedOrder.status}
                onValueChange={(value) => handleStatusChange(value as OrderStatus)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className={option.color}>{option.icon}</span>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isUpdatingStatus && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mise à jour en cours...
                </div>
              )}
            </div>

            {/* Delivery Assignment Section */}
            <div className="p-4 rounded-lg border space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Assignation Livreur
              </h4>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Livreur actuel</p>
                  <p className="font-medium">
                    {selectedOrder.deliveryPersonName || "Aucun livreur assigné"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassignDeliveryPerson}
                  disabled={!selectedOrder.delivery_person_id || isUpdatingAssignment}
                >
                  {isUpdatingAssignment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Désassigner"
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Réassigner</p>
                {dpLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement des livreurs...
                  </div>
                ) : !deliveryPersons?.length ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun livreur disponible
                  </p>
                ) : (
                  <Select
                    value={selectedDeliveryPerson}
                    onValueChange={handleAssignDeliveryPerson}
                    disabled={isUpdatingAssignment}
                  >
                    <SelectTrigger className="w-full bg-background">
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
            </div>

            {/* Caller Assignment Section */}
            <div className="p-4 rounded-lg border space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Assignation Appelant
              </h4>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Appelant actuel</p>
                  <p className="font-medium">
                    {selectedOrder.assignedCallerName || "Aucun appelant assigné"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassignCaller}
                  disabled={!selectedOrder.assigned_to || isUpdatingAssignment}
                >
                  {isUpdatingAssignment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Désassigner"
                  )}
                </Button>
              </div>
            </div>

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
              onClick={() => {
                setSelectedOrder(null);
                setSelectedDeliveryPerson("");
              }}
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
