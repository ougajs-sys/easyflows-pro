import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Eye, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { OrderDetailPopup } from "./OrderDetailPopup";
import { Database } from "@/integrations/supabase/types";

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

const statusMap: Record<string, { label: string; class: string }> = {
  confirmed: { label: "Confirmé", class: "bg-success/15 text-success border-success/30" },
  pending: { label: "En attente", class: "bg-warning/15 text-warning border-warning/30" },
  delivered: { label: "Livré", class: "bg-primary/15 text-primary border-primary/30" },
  in_transit: { label: "En cours", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  partial: { label: "Partiel", class: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  cancelled: { label: "Annulé", class: "bg-destructive/15 text-destructive border-destructive/30" },
  reported: { label: "Reporté", class: "bg-muted text-muted-foreground border-border" },
};

export function OrdersTable() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["dashboard-orders"],
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
          delivery_address,
          delivery_notes,
          client:clients (full_name, phone, phone_secondary, address, zone),
          product:products (name, price)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-8 animate-fade-in flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="glass rounded-xl p-8 animate-fade-in">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Aucune commande récente</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-xl overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Commandes Récentes</h3>
            <p className="text-sm text-muted-foreground">Cliquez sur une commande pour voir les détails</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  N°
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Produit
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Montant
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr
                  key={order.id}
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="p-4">
                    <span className="font-mono text-sm text-primary">{order.order_number || "-"}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-sm">{order.client?.full_name || "Inconnu"}</p>
                      <p className="text-xs text-muted-foreground">{order.client?.phone}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{order.product?.name || "-"}</span>
                    <span className="text-xs text-muted-foreground ml-1">x{order.quantity}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <span className="font-semibold text-sm">{formatCurrency(Number(order.total_amount))} FCFA</span>
                      {Number(order.amount_due) > 0 && (
                        <p className="text-xs text-destructive">Dû: {formatCurrency(Number(order.amount_due))} FCFA</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                        statusMap[order.status]?.class || "bg-secondary"
                      )}
                    >
                      {statusMap[order.status]?.label || order.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailPopup
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </>
  );
}
