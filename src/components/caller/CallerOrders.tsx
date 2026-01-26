import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Phone, 
  Package, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard,
  Loader2,
  ExternalLink,
  User
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import type { PostgrestError } from "@supabase/supabase-js";
import { CancelledOrdersSidebar } from "./CancelledOrdersSidebar";

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

const statusConfig = {
  pending: { label: "À traiter", class: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  confirmed: { label: "Confirmée", class: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  partial: { label: "Paiement en attente", class: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: CreditCard },
  reported: { label: "Reporté", class: "bg-muted text-muted-foreground border-border", icon: Clock },
  cancelled: { label: "Annulé", class: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  in_transit: { label: "En transit", class: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Package },
  delivered: { label: "Livrée", class: "bg-primary/15 text-primary border-primary/30", icon: CheckCircle2 },
};

export function CallerOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["caller-orders", user?.id],
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status, amount_paid }: { 
      id: string; 
      status: OrderStatus;
      amount_paid?: number;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (amount_paid !== undefined) updateData.amount_paid = amount_paid;
      if (status === "delivered") updateData.delivered_at = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["caller-stats"] });
      queryClient.invalidateQueries({ queryKey: ["caller-cancelled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });
      setSelectedOrder(null);
    },
  });

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderMutation.mutateAsync({ id: orderId, status: newStatus });
      toast({
        title: "Statut mis à jour",
        description: `Commande marquée comme "${statusConfig[newStatus]?.label}"`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedOrder) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    try {
      const newAmountPaid = Number(selectedOrder.amount_paid) + amount;
      
      // Guard against division by zero
      const totalAmount = Number(selectedOrder.total_amount);
      if (totalAmount <= 0) {
        toast({
          title: "Erreur",
          description: "Montant total invalide",
          variant: "destructive",
        });
        return;
      }
      
      // Any payment recorded should set status to confirmed
      let newStatus: OrderStatus = "confirmed";
      
      // Keep current status if already in transit or delivered
      if (selectedOrder.status === "in_transit" || selectedOrder.status === "delivered") {
        newStatus = selectedOrder.status;
      }

      // Generate payment reference for the note
      const paymentRef = `PAY-${Date.now()}`;
      const paymentDate = format(new Date(), "yyyy-MM-dd");
      
      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        order_id: selectedOrder.id,
        amount: amount,
        method: "cash",
        status: "completed",
        reference: paymentRef,
        notes: `Paiement enregistré le ${paymentDate} - Référence: ${paymentRef} - Montant: ${formatCurrency(amount)} FCFA - Commande: ${selectedOrder.order_number}`,
      });

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        throw new Error(`Erreur lors de la création du paiement: ${paymentError.message} (Code: ${paymentError.code || 'N/A'})`);
      }

      await updateOrderMutation.mutateAsync({
        id: selectedOrder.id,
        status: newStatus,
        amount_paid: newAmountPaid,
      });

      toast({
        title: "Paiement enregistré",
        description: `Paiement de ${formatCurrency(amount)} FCFA enregistré. Commande confirmée.`,
      });

      setPaymentAmount("");
      setShowPaymentInput(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      
      // Extract detailed error message
      let errorMessage = "Impossible d'enregistrer le paiement";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const pgError = error as PostgrestError;
        if (pgError.message) {
          errorMessage = `Erreur: ${pgError.message}`;
          if (pgError.code) {
            errorMessage += ` (Code: ${pgError.code})`;
          }
          if (pgError.details) {
            errorMessage += ` - ${pgError.details}`;
          }
        }
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const filterOrders = (status: string) => {
    if (!orders) return [];
    switch (status) {
      case "pending":
        return orders.filter((o) => o.status === "pending");
      case "confirmed":
        return orders.filter((o) => o.status === "confirmed" || o.status === "in_transit");
      case "partial":
        // Filter by amount_due > 0, excluding pending (no payment yet), cancelled, and delivered orders
        return orders.filter((o) => 
          Number(o.amount_due || 0) > 0 && 
          o.status !== "pending" && 
          o.status !== "cancelled" && 
          o.status !== "delivered"
        );
      case "reported":
        return orders.filter((o) => o.status === "reported");
      case "cancelled":
        return orders.filter((o) => o.status === "cancelled");
      default:
        return orders;
    }
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const StatusIcon = statusConfig[order.status]?.icon || Package;
    const isAssigned = order.assigned_to === user?.id && order.created_by !== user?.id;
    
    return (
      <Card 
        className="cursor-pointer hover:border-primary/30 transition-colors"
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
            <Badge className={cn("border", statusConfig[order.status]?.class)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig[order.status]?.label}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>{order.product?.name} x{order.quantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{formatCurrency(Number(order.total_amount))} FCFA</span>
              {Number(order.amount_due) > 0 && (
                <span className="text-destructive text-xs">
                  Dû: {formatCurrency(Number(order.amount_due))} FCFA
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>

          {/* Quick Call Button */}
          {order.client?.phone && (
            <a
              href={`tel:${order.client.phone}`}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">Appeler</span>
            </a>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commandes</h1>
          <p className="text-muted-foreground">Gérez vos commandes et appelez les clients</p>
        </div>
        <CancelledOrdersSidebar />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative text-xs sm:text-sm">
            À traiter
            {filterOrders("pending").length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full bg-warning text-warning-foreground flex items-center justify-center">
                {filterOrders("pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs sm:text-sm">Confirmée</TabsTrigger>
          <TabsTrigger value="partial" className="relative text-xs sm:text-sm">
            Paiement en attente
            {filterOrders("partial").length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full bg-orange-500 text-white flex items-center justify-center">
                {filterOrders("partial").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reported" className="text-xs sm:text-sm">Reporté</TabsTrigger>
        </TabsList>

        {["pending", "confirmed", "partial", "reported"].map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            <div className="grid gap-3">
              {filterOrders(status).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucune commande</p>
                  </CardContent>
                </Card>
              ) : (
                filterOrders(status).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono">{selectedOrder?.order_number}</span>
              {selectedOrder && (
                <Badge className={cn("border", statusConfig[selectedOrder.status]?.class)}>
                  {statusConfig[selectedOrder.status]?.label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Status Change */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <h4 className="font-semibold text-primary">Changer le statut</h4>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) => handleStatusChange(selectedOrder.id, value as OrderStatus)}
                  disabled={updateOrderMutation.isPending}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">À traiter</SelectItem>
                    <SelectItem value="confirmed">Confirmée</SelectItem>
                    <SelectItem value="partial">Paiement en attente</SelectItem>
                    <SelectItem value="reported">Reporté</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Section */}
              {(selectedOrder.status === "pending" || selectedOrder.status === "partial") && Number(selectedOrder.amount_due) > 0 && (
                <div className="p-4 rounded-lg border border-success/20 bg-success/5 space-y-3">
                  <h4 className="font-semibold text-success flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Enregistrer un paiement
                  </h4>
                  <div className="flex items-center justify-between text-sm">
                    <span>Montant dû:</span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(Number(selectedOrder.amount_due))} FCFA
                    </span>
                  </div>
                  
                  {showPaymentInput ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Montant reçu (FCFA)</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 5000"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="bg-background"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setShowPaymentInput(false);
                            setPaymentAmount("");
                          }}
                        >
                          Annuler
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={handleRecordPayment}
                          disabled={updateOrderMutation.isPending || !paymentAmount}
                        >
                          {updateOrderMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Confirmer"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowPaymentInput(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Enregistrer un dépôt
                    </Button>
                  )}
                </div>
              )}

              {/* Order Info */}
              <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
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
              <div className="p-4 rounded-lg border space-y-3">
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
                    <ExternalLink className="w-4 h-4 ml-auto" />
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
                <div className="p-4 rounded-lg border space-y-3">
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
    </div>
  );
}
