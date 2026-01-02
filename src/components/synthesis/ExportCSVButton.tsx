import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ExportCSVButtonProps {
  dateRange: { from: Date; to: Date };
}

export function ExportCSVButton({ dateRange }: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const fromISO = dateRange.from.toISOString();
      const toISO = new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, total_amount, amount_paid, quantity, unit_price, created_at, delivered_at,
          clients (full_name, phone, city, zone),
          products (name, price),
          delivery_persons (user_id)
        `)
        .gte("created_at", fromISO)
        .lt("created_at", toISO)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch delivery person profiles
      const deliveryUserIds = [...new Set(orders?.map(o => o.delivery_persons?.user_id).filter(Boolean))] as string[];
      let deliveryProfiles: Record<string, string> = {};
      
      if (deliveryUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", deliveryUserIds);
        
        deliveryProfiles = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || "";
          return acc;
        }, {} as Record<string, string>);
      }

      // Status labels
      const statusLabels: Record<string, string> = {
        pending: "En attente",
        confirmed: "Confirmée",
        in_transit: "En livraison",
        delivered: "Livrée",
        partial: "Partielle",
        cancelled: "Annulée",
        reported: "Reportée",
      };

      // CSV headers
      const headers = [
        "N° Commande",
        "Date Création",
        "Date Livraison",
        "Client",
        "Téléphone",
        "Ville",
        "Zone",
        "Produit",
        "Quantité",
        "Prix Unitaire",
        "Montant Total",
        "Montant Payé",
        "Reste à Payer",
        "Statut",
        "Livreur"
      ];

      // CSV rows
      const rows = orders?.map(order => [
        order.order_number || "",
        format(new Date(order.created_at), "dd/MM/yyyy HH:mm"),
        order.delivered_at ? format(new Date(order.delivered_at), "dd/MM/yyyy HH:mm") : "",
        order.clients?.full_name || "",
        order.clients?.phone || "",
        order.clients?.city || "",
        order.clients?.zone || "",
        order.products?.name || "",
        order.quantity || 1,
        order.unit_price || 0,
        order.total_amount || 0,
        order.amount_paid || 0,
        (Number(order.total_amount) || 0) - (Number(order.amount_paid) || 0),
        statusLabels[order.status] || order.status,
        order.delivery_persons?.user_id ? deliveryProfiles[order.delivery_persons.user_id] || "" : ""
      ]) || [];

      // Build CSV content
      const csvContent = [
        headers.join(";"),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      ].join("\n");

      // Add BOM for Excel compatibility with French characters
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `synthese-pipeline-${format(dateRange.from, "yyyy-MM-dd")}-${format(dateRange.to, "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export CSV réussi",
        description: "Le fichier CSV a été téléchargé.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les données",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline" className="gap-2">
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      Exporter CSV
    </Button>
  );
}
