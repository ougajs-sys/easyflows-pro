import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  User, 
  Package, 
  MapPin, 
  Phone, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Truck,
  CreditCard,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import { usePayments } from "@/hooks/usePayments";
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
  delivery_address: string | null;
  delivery_notes: string | null;
  client: {
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

interface OrderDetailPopupProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions: { value: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "pending", label: "En attente", icon: <AlertCircle className="w-4 h-4" />, color: "text-warning" },
  { value: "confirmed", label: "Confirmée", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-primary" },
  { value: "in_transit", label: "En transit", icon: <Truck className="w-4 h-4" />, color: "text-blue-500" },
  { value: "delivered", label: "Livrée", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-success" },
  { value: "cancelled", label: "Annulée", icon: <XCircle className="w-4 h-4" />, color: "text-destructive" },
  { value: "reported", label: "Reportée", icon: <AlertCircle className="w-4 h-4" />, color: "text-muted-foreground" },
  { value: "partial", label: "Partielle", icon: <CreditCard className="w-4 h-4" />, color: "text-warning" },
];

export function OrderDetailPopup({ order, isOpen, onClose }: OrderDetailPopupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createPayment } = usePayments();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  if (!order) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "En attente", className: "bg-warning/20 text-warning border-warning/30" },
      confirmed: { label: "Confirmée", className: "bg-primary/20 text-primary border-primary/30" },
      in_transit: { label: "En transit", className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
      delivered: { label: "Livrée", className: "bg-success/20 text-success border-success/30" },
      cancelled: { label: "Annulée", className: "bg-destructive/20 text-destructive border-destructive/30" },
      reported: { label: "Reportée", className: "bg-muted text-muted-foreground" },
      partial: { label: "Partielle", className: "bg-warning/20 text-warning border-warning/30" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-secondary" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      const updateData: { status: OrderStatus; delivered_at?: string } = { status: newStatus };
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id);

      if (error) {
        console.error("Error updating order status:", error);
        throw new Error(`${error.message} (Code: ${error.code || 'N/A'})`);
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });

      toast({
        title: "Statut mis à jour",
        description: `La commande ${order.order_number} est maintenant "${statusOptions.find(s => s.value === newStatus)?.label}"`,
      });

      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
      
      let errorMessage = "Impossible de mettre à jour le statut";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const newAmountPaid = Number(order.amount_paid) + amount;
      const newAmountDue = Number(order.total_amount) - newAmountPaid;
      
      // Determine new status based on payment
      let newStatus: OrderStatus = order.status;
      if (newAmountDue <= 0) {
        // Full payment received - mark as confirmed if pending/partial
        if (order.status === "pending" || order.status === "partial") {
          newStatus = "confirmed";
        }
      } else if (amount > 0) {
        // Partial payment - mark as partial if was pending
        if (order.status === "pending") {
          newStatus = "partial";
        }
      }

      // First update order status and amounts
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          status: newStatus,
        })
        .eq("id", order.id);

      if (orderError) {
        // Log detailed error for debugging
        console.error("Error updating order:", orderError);
        throw new Error(`Erreur lors de la mise à jour de la commande: ${orderError.message} (Code: ${orderError.code || 'N/A'})`);
      }

      // Then create payment record using the hook
      await createPayment.mutateAsync({
        order_id: order.id,
        amount: amount,
        method: "cash",
        status: "completed",
        reference: `PAY-${Date.now()}`,
        notes: `Paiement enregistré depuis le popup de détail`,
      });

      // Note: The createPayment mutation already invalidates 'orders' and 'payments' queries
      // We only need to invalidate dashboard-specific queries
      queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });

      toast({
        title: "Paiement enregistré",
        description: newAmountDue <= 0 
          ? `Paiement complet reçu. Commande confirmée.`
          : `Dépôt de ${formatCurrency(amount)} FCFA enregistré. Reste: ${formatCurrency(newAmountDue)} FCFA`,
      });

      setPaymentAmount("");
      setShowPaymentInput(false);
      onClose();
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
          if (pgError.hint) {
            errorMessage += ` (Astuce: ${pgError.hint})`;
          }
        }
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="font-mono">{order.order_number}</span>
            {getStatusBadge(order.status)}
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
              value={order.status}
              onValueChange={(value) => handleStatusChange(value as OrderStatus)}
              disabled={isUpdating}
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
          </div>

          {/* Payment Section for pending orders with amount due */}
          {(order.status === "pending" || order.status === "partial") && Number(order.amount_due) > 0 && (
            <div className="p-4 rounded-lg border border-success/20 bg-success/5 space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-success">
                <CreditCard className="w-4 h-4" />
                Enregistrer un paiement
              </h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Montant dû:</span>
                <span className="font-bold text-destructive">{formatCurrency(Number(order.amount_due))} FCFA</span>
              </div>
              
              {showPaymentInput ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Montant reçu (FCFA)</Label>
                    <Input
                      id="payment-amount"
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
                      disabled={isUpdating || !paymentAmount}
                    >
                      {isUpdating ? (
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
              <span className="font-medium">{order.product?.name || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quantité</span>
              <span className="font-medium">{order.quantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Montant total</span>
              <span className="font-bold text-lg text-primary">
                {formatCurrency(Number(order.total_amount || 0))} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Déjà payé</span>
              <span className="font-medium text-success">
                {formatCurrency(Number(order.amount_paid || 0))} FCFA
              </span>
            </div>
            {Number(order.amount_due) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reste à payer</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(Number(order.amount_due))} FCFA
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="text-sm">
                {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
              </span>
            </div>
          </div>

          {/* Client Section */}
          <div className="p-4 rounded-lg border space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Client
            </h4>
            <p className="font-medium">{order.client?.full_name || "Inconnu"}</p>
            
            {order.client?.phone && (
              <a 
                href={`tel:${order.client.phone}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span className="font-medium">{order.client.phone}</span>
                <ExternalLink className="w-4 h-4 ml-auto" />
              </a>
            )}

            {order.client?.phone_secondary && (
              <a 
                href={`tel:${order.client.phone_secondary}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span className="font-medium">{order.client.phone_secondary}</span>
                <span className="text-xs text-muted-foreground">(secondaire)</span>
                <ExternalLink className="w-4 h-4 ml-auto" />
              </a>
            )}
          </div>

          {/* Delivery Address */}
          {(order.delivery_address || order.client?.address) && (
            <div className="p-4 rounded-lg border space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Adresse de livraison
              </h4>
              <p className="text-sm text-muted-foreground">
                {order.delivery_address || order.client?.address}
              </p>
              {order.client?.zone && (
                <p className="text-xs text-muted-foreground">Zone: {order.client.zone}</p>
              )}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || order.client?.address || "")}`}
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

          {/* Notes */}
          {order.delivery_notes && (
            <div className="p-4 rounded-lg border space-y-2">
              <h4 className="font-semibold text-sm">Notes de livraison</h4>
              <p className="text-sm text-muted-foreground">{order.delivery_notes}</p>
            </div>
          )}

          {/* Close Button */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
