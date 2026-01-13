import { useState } from "react";
import { MapPin, Phone, Package, User, Clock, ChevronDown, ChevronUp, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { ReportOrderDialog } from "./ReportOrderDialog";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface DeliveryOrderCardProps {
  order: {
    id: string;
    order_number: string | null;
    quantity: number;
    total_amount: number;
    amount_paid: number;
    amount_due: number | null;
    delivery_address: string | null;
    delivery_notes: string | null;
    status: OrderStatus;
    created_at: string;
    client: {
      full_name: string;
      phone: string;
      phone_secondary: string | null;
      address: string | null;
      zone: string | null;
    } | null;
    product: {
      name: string;
    } | null;
  };
  onUpdateStatus: (orderId: string, status: OrderStatus, amountPaid?: number, scheduledAt?: Date, reason?: string) => void;
  isUpdating: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-warning text-warning-foreground" },
  confirmed: { label: "Confirmée", color: "bg-primary text-primary-foreground" },
  in_transit: { label: "En livraison", color: "bg-primary text-primary-foreground" },
  delivered: { label: "Livrée", color: "bg-success text-success-foreground" },
  partial: { label: "Partielle", color: "bg-warning text-warning-foreground" },
  cancelled: { label: "Annulée", color: "bg-destructive text-destructive-foreground" },
  reported: { label: "Reportée", color: "bg-muted text-muted-foreground" },
};

export function DeliveryOrderCard({ order, onUpdateStatus, isUpdating }: DeliveryOrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [amountCollected, setAmountCollected] = useState(order.amount_due?.toString() || order.total_amount.toString());

  const handleStartDelivery = () => {
    onUpdateStatus(order.id, "in_transit");
  };

  const handleCompleteDelivery = () => {
    const collected = parseFloat(amountCollected) || 0;
    const newAmountPaid = order.amount_paid + collected;
    
    if (newAmountPaid >= order.total_amount) {
      onUpdateStatus(order.id, "delivered", newAmountPaid);
    } else {
      onUpdateStatus(order.id, "partial", newAmountPaid);
    }
    setShowDeliveryDialog(false);
  };

  const handleReportOrder = (scheduledAt: Date, reason: string) => {
    onUpdateStatus(order.id, "reported", undefined, scheduledAt, reason);
    setShowReportDialog(false);
  };

  const amountDue = order.amount_due ?? (order.total_amount - order.amount_paid);

  return (
    <>
      <Card className="glass overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {order.order_number || order.id.slice(0, 8)}
                </span>
                <Badge className={cn("text-xs", statusConfig[order.status].color)}>
                  {statusConfig[order.status].label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                {format(new Date(order.created_at), "d MMM, HH:mm", { locale: fr })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Client Info */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{order.client?.full_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${order.client?.phone}`} className="text-primary hover:underline">
                {order.client?.phone}
              </a>
              {order.client?.phone_secondary && (
                <a href={`tel:${order.client.phone_secondary}`} className="text-primary hover:underline">
                  / {order.client.phone_secondary}
                </a>
              )}
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-foreground">
                {order.delivery_address || order.client?.address || "Adresse non spécifiée"}
                {order.client?.zone && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {order.client.zone}
                  </Badge>
                )}
              </span>
            </div>
          </div>

          {/* Product & Amount */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {order.product?.name} x{order.quantity}
              </span>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{order.total_amount.toLocaleString()} F</p>
              {amountDue > 0 && (
                <p className="text-xs text-warning">Reste: {amountDue.toLocaleString()} F</p>
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {order.delivery_notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="text-foreground mt-1">{order.delivery_notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Montant payé:</span>
                  <p className="font-medium text-foreground">{order.amount_paid.toLocaleString()} F</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Reste à payer:</span>
                  <p className="font-medium text-warning">{amountDue.toLocaleString()} F</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            {order.status === "confirmed" && (
              <Button
                onClick={handleStartDelivery}
                disabled={isUpdating}
                className="flex-1"
              >
                Démarrer la livraison
              </Button>
            )}
            {order.status === "in_transit" && (
              <>
                <Button
                  onClick={() => setShowDeliveryDialog(true)}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Confirmer livraison
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReportDialog(true)}
                  disabled={isUpdating}
                >
                  Reporter
                </Button>
              </>
            )}
            {order.status === "pending" && (
              <p className="text-sm text-muted-foreground text-center w-full">
                En attente de confirmation par le centre d'appels
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Delivery Confirmation Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la livraison</DialogTitle>
            <DialogDescription>
              Entrez le montant collecté auprès du client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Banknote className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Montant à collecter</p>
                <p className="font-bold text-foreground">{amountDue.toLocaleString()} F</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Montant collecté</Label>
              <Input
                id="amount"
                type="number"
                value={amountCollected}
                onChange={(e) => setAmountCollected(e.target.value)}
                placeholder="Montant en FCFA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCompleteDelivery} disabled={isUpdating}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Order Dialog */}
      <ReportOrderDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        onConfirm={handleReportOrder}
        isLoading={isUpdating}
        orderNumber={order.order_number || undefined}
      />
    </>
  );
}
