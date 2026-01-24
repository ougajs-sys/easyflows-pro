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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  User,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";
import type { PostgrestError } from "@supabase/supabase-js";

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
  scheduled_at: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  report_reason: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
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
  reported: { label: "Reporté", class: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Clock },
  cancelled: { label: "Annulé", class: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  in_transit: { label: "En transit", class: "bg-primary/15 text-primary border-primary/30", icon: Package },
  delivered: { label: "Livrée", class: "bg-green-600/15 text-green-500 border-green-500/30", icon: CheckCircle2 },
};

const CANCELLATION_REASONS = [
  "Client injoignable",
  "Adresse incorrecte",
  "Produit non disponible",
  "Client a changé d'avis",
  "Problème de prix",
  "Doublon de commande",
  "Autre",
];

export function CallerOrdersAll() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Report dialog state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportDate, setReportDate] = useState("");
  const [reportTime, setReportTime] = useState("10:00");
  const [reportReason, setReportReason] = useState("");
  
  // Cancellation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonOther, setCancelReasonOther] = useState("");

  // Fetch ALL orders, not just user's orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["all-orders-for-callers"],
    queryFn: async () => {
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
          scheduled_at,
          delivery_address,
          delivery_notes,
          report_reason,
          cancellation_reason,
          created_by,
          client:clients (id, full_name, phone, phone_secondary, address, zone),
          product:products (name, price)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      amount_paid, 
      scheduled_at,
      report_reason,
      cancellation_reason
    }: { 
      id: string; 
      status: OrderStatus;
      amount_paid?: number;
      scheduled_at?: string;
      report_reason?: string;
      cancellation_reason?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (amount_paid !== undefined) updateData.amount_paid = amount_paid;
      if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
      if (report_reason !== undefined) updateData.report_reason = report_reason;
      if (cancellation_reason !== undefined) updateData.cancellation_reason = cancellation_reason;
      if (status === "delivered") updateData.delivered_at = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders-for-callers"] });
      queryClient.invalidateQueries({ queryKey: ["caller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["caller-stats"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrder(null);
    },
  });

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === "reported") {
      setShowReportDialog(true);
      return;
    }
    if (newStatus === "cancelled") {
      setShowCancelDialog(true);
      return;
    }
    
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

  const handleReportOrder = async () => {
    if (!selectedOrder || !reportDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date de report",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${reportDate}T${reportTime}`).toISOString();

    try {
      await updateOrderMutation.mutateAsync({ 
        id: selectedOrder.id, 
        status: "reported",
        scheduled_at: scheduledAt,
        report_reason: reportReason || "Report demandé par le client"
      });
      toast({
        title: "Commande reportée",
        description: `Report prévu pour le ${format(new Date(scheduledAt), "d MMMM à HH:mm", { locale: fr })}`,
      });
      setShowReportDialog(false);
      setReportDate("");
      setReportTime("10:00");
      setReportReason("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de reporter la commande",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un motif d'annulation",
        variant: "destructive",
      });
      return;
    }

    const finalReason = cancelReason === "Autre" ? cancelReasonOther : cancelReason;

    try {
      await updateOrderMutation.mutateAsync({ 
        id: selectedOrder.id, 
        status: "cancelled",
        cancellation_reason: finalReason
      });
      toast({
        title: "Commande annulée",
        description: `Motif: ${finalReason}`,
      });
      setShowCancelDialog(false);
      setCancelReason("");
      setCancelReasonOther("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la commande",
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
        // Filter by amount_due > 0 instead of status === "partial"
        return orders.filter((o) => Number(o.amount_due || 0) > 0 && o.status !== "cancelled" && o.status !== "delivered");
      case "reported":
        return orders.filter((o) => o.status === "reported");
      case "delivered":
        // Kept for potential future use or external components
        return orders.filter((o) => o.status === "delivered");
      case "cancelled":
        return orders.filter((o) => o.status === "cancelled");
      default:
        return orders;
    }
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const StatusIcon = statusConfig[order.status]?.icon || Package;
    const isOwnOrder = order.created_by === user?.id;
    
    return (
      <Card 
        className={cn(
          "cursor-pointer hover:border-primary/30 transition-colors",
          isOwnOrder && "border-primary/20 bg-primary/5"
        )}
        onClick={() => setSelectedOrder(order)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-primary">{order.order_number}</p>
                {isOwnOrder && (
                  <Badge variant="outline" className="text-xs">Mon appel</Badge>
                )}
              </div>
              <p className="font-medium">{order.client?.full_name || "Client inconnu"}</p>
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
            {order.scheduled_at && order.status === "reported" && (
              <div className="flex items-center gap-2 text-blue-500 text-xs">
                <Calendar className="w-3 h-3" />
                Report prévu: {format(new Date(order.scheduled_at), "d MMM à HH:mm", { locale: fr })}
              </div>
            )}
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
      <div>
        <h1 className="text-2xl font-bold">Toutes les Commandes</h1>
        <p className="text-muted-foreground">Gérez toutes les commandes et appelez les clients</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Annulé</TabsTrigger>
        </TabsList>

        {["pending", "confirmed", "partial", "reported", "cancelled"].map((status) => (
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
      <Dialog open={!!selectedOrder && !showReportDialog && !showCancelDialog} onOpenChange={() => setSelectedOrder(null)}>
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
                  <span className="text-muted-foreground">Reste à payer</span>
                  <span className={Number(selectedOrder.amount_due) > 0 ? "text-destructive font-bold" : "text-success"}>
                    {formatCurrency(Number(selectedOrder.amount_due || 0))} FCFA
                  </span>
                </div>
              </div>

              {/* Client Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations client
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{selectedOrder.client?.full_name}</p>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${selectedOrder.client?.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {selectedOrder.client?.phone}
                    </a>
                    {selectedOrder.client?.phone_secondary && (
                      <a
                        href={`tel:${selectedOrder.client?.phone_secondary}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedOrder.client?.phone_secondary}
                      </a>
                    )}
                  </div>
                  {(selectedOrder.delivery_address || selectedOrder.client?.address) && (
                    <div className="flex items-start gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5" />
                      {selectedOrder.delivery_address || selectedOrder.client?.address}
                    </div>
                  )}
                </div>
              </div>

              {/* Report/Cancel Reason Display */}
              {selectedOrder.report_reason && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <h4 className="font-semibold text-blue-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Raison du report
                  </h4>
                  <p className="text-sm">{selectedOrder.report_reason}</p>
                  {selectedOrder.scheduled_at && (
                    <p className="text-sm text-muted-foreground">
                      Prévu le: {format(new Date(selectedOrder.scheduled_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  )}
                </div>
              )}
              {selectedOrder.cancellation_reason && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Raison de l'annulation
                  </h4>
                  <p className="text-sm">{selectedOrder.cancellation_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Reporter la commande
            </DialogTitle>
            <DialogDescription>
              Choisissez une nouvelle date de livraison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date de report *</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure prévue</Label>
              <Input
                type="time"
                value={reportTime}
                onChange={(e) => setReportTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Raison du report</Label>
              <Textarea
                placeholder="Ex: Client absent, demande de report..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleReportOrder} disabled={updateOrderMutation.isPending || !reportDate}>
              {updateOrderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Reporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Annuler la commande
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Veuillez préciser le motif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motif d'annulation *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un motif" />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cancelReason === "Autre" && (
              <div className="space-y-2">
                <Label>Précisez le motif *</Label>
                <Textarea
                  placeholder="Décrivez la raison de l'annulation..."
                  value={cancelReasonOther}
                  onChange={(e) => setCancelReasonOther(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Retour
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelOrder} 
              disabled={updateOrderMutation.isPending || !cancelReason || (cancelReason === "Autre" && !cancelReasonOther)}
            >
              {updateOrderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
