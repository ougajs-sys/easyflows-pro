import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatCurrency";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  AlertTriangle,
  Clock,
  Edit3,
  Save,
  X,
} from "lucide-react";

interface DailyReportOrderCardProps {
  order: any;
}

const STATUS_TRANSITIONS: Record<string, { label: string; target: string; icon: any; color: string }[]> = {
  pending: [
    { label: "Confirmer", target: "confirmed", icon: CheckCircle2, color: "text-success" },
    { label: "Annuler", target: "cancelled", icon: XCircle, color: "text-destructive" },
    { label: "Reporter", target: "reported", icon: AlertTriangle, color: "text-warning" },
  ],
  confirmed: [
    { label: "En livraison", target: "in_transit", icon: Truck, color: "text-primary" },
    { label: "Annuler", target: "cancelled", icon: XCircle, color: "text-destructive" },
    { label: "Reporter", target: "reported", icon: AlertTriangle, color: "text-warning" },
  ],
  in_transit: [
    { label: "Livrée", target: "delivered", icon: CheckCircle2, color: "text-success" },
    { label: "Reporter", target: "reported", icon: AlertTriangle, color: "text-warning" },
  ],
  reported: [
    { label: "Confirmer", target: "confirmed", icon: CheckCircle2, color: "text-success" },
    { label: "Annuler", target: "cancelled", icon: XCircle, color: "text-destructive" },
  ],
  cancelled: [
    { label: "Remettre en attente", target: "pending", icon: Clock, color: "text-muted-foreground" },
  ],
  delivered: [],
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "En attente", variant: "outline" },
    confirmed: { label: "Confirmée", variant: "secondary" },
    in_transit: { label: "En livraison", variant: "default" },
    delivered: { label: "Livrée", variant: "default" },
    cancelled: { label: "Annulée", variant: "destructive" },
    reported: { label: "Reportée", variant: "outline" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

export function DailyReportOrderCard({ order }: DailyReportOrderCardProps) {
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(order.delivery_notes || "");

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report-detail"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const updateNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_notes: notes })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["daily-report-detail"] });
      toast.success("Notes mises à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const transitions = STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="border rounded-lg p-4 space-y-2 bg-card hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">
          #{order.order_number || order.id.slice(0, 8)}
        </span>
        {statusBadge(order.status)}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{order.client?.full_name || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{order.client?.phone || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{order.product?.name || "—"} × {order.quantity}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{order.delivery_address || order.client?.city || "—"}</span>
        </div>
      </div>

      {/* Financial */}
      <div className="flex items-center justify-between text-sm pt-1 border-t">
        <span className="font-medium">{formatCurrency(order.total_amount)} FCFA</span>
        <span className="text-muted-foreground text-xs">
          Payé: {formatCurrency(order.amount_paid)} FCFA
        </span>
      </div>

      {/* Notes */}
      {editingNotes ? (
        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes de livraison..."
            className="text-xs min-h-[60px]"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditingNotes(false); setNotes(order.delivery_notes || ""); }}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => updateNotes.mutate()}
              disabled={updateNotes.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Sauvegarder
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-start gap-1.5 text-xs bg-muted/50 p-2 rounded text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors group"
          onClick={() => setEditingNotes(true)}
        >
          <Edit3 className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span>{order.delivery_notes || "Ajouter des notes..."}</span>
        </div>
      )}

      {/* Action buttons */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          {transitions.map((t) => (
            <Button
              key={t.target}
              size="sm"
              variant={t.target === "cancelled" ? "destructive" : "outline"}
              className="text-xs h-7 px-2"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: order.id, status: t.target })}
            >
              <t.icon className={`w-3.5 h-3.5 mr-1 ${t.target !== "cancelled" ? t.color : ""}`} />
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
