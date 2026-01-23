import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

interface SynthesisTableProps {
  dateRange: { from: Date; to: Date };
}

export function SynthesisTable({ dateRange }: SynthesisTableProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["synthesis-table", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const fromISO = dateRange.from.toISOString();
      const toISO = new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total_amount,
          amount_paid,
          created_at,
          clients (full_name, phone),
          products (name),
          delivery_persons (user_id)
        `)
        .gte("created_at", fromISO)
        .lt("created_at", toISO)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get delivery person names
      const dpUserIds = data?.filter(o => o.delivery_persons?.user_id).map(o => o.delivery_persons!.user_id) || [];
      let dpNames: Record<string, string> = {};
      
      if (dpUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", dpUserIds);

        dpNames = profiles?.reduce((acc, p) => {
          acc[p.id] = p.full_name || "Inconnu";
          return acc;
        }, {} as Record<string, string>) || {};
      }

      return data?.map(order => ({
        ...order,
        deliveryPersonName: order.delivery_persons?.user_id
          ? dpNames[order.delivery_persons.user_id]
          : null,
      }));
    },
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

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Détail des Commandes
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {orders?.length || 0} commandes (max 50)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune commande sur cette période
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Commande</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Livreur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{order.clients?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{order.clients?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{order.products?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{order.deliveryPersonName || "—"}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(order.total_amount || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={Number(order.amount_paid) >= Number(order.total_amount) ? "text-success" : "text-warning"}>
                        {formatCurrency(Number(order.amount_paid || 0))}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
