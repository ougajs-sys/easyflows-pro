import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExportPDFButtonProps {
  dateRange: { from: Date; to: Date };
}

export function ExportPDFButton({ dateRange }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const fromISO = dateRange.from.toISOString();
      const toISO = new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, total_amount, amount_paid, created_at,
          clients (full_name, phone),
          products (name)
        `)
        .gte("created_at", fromISO)
        .lt("created_at", toISO)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter(o => o.status === "delivered").length || 0;
      const cancelledOrders = orders?.filter(o => o.status === "cancelled").length || 0;
      const totalRevenue = orders
        ?.filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const totalCollected = orders
        ?.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0) || 0;
      const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

      // Generate HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Synthèse - Pipeline</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .header h1 { color: #3b82f6; font-size: 28px; margin-bottom: 8px; }
            .header p { color: #666; font-size: 14px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
            .stat-card h3 { font-size: 24px; color: #3b82f6; margin-bottom: 4px; }
            .stat-card p { font-size: 12px; color: #666; }
            .section { margin-bottom: 32px; }
            .section h2 { font-size: 18px; color: #333; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f1f5f9; text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .status-delivered { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-cancelled { background: #fee2e2; color: #991b1b; }
            .status-confirmed { background: #dbeafe; color: #1e40af; }
            .text-right { text-align: right; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Synthèse Pipeline</h1>
            <p>Période: ${format(dateRange.from, "dd MMMM yyyy", { locale: fr })} → ${format(dateRange.to, "dd MMMM yyyy", { locale: fr })}</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <h3>${totalOrders}</h3>
              <p>Total Commandes</p>
            </div>
            <div class="stat-card">
              <h3>${deliveredOrders}</h3>
              <p>Livrées</p>
            </div>
            <div class="stat-card">
              <h3>${deliveryRate}%</h3>
              <p>Taux de Livraison</p>
            </div>
            <div class="stat-card">
              <h3>${formatCurrency(totalRevenue)} FCFA</h3>
              <p>Chiffre d'Affaires</p>
            </div>
          </div>

          <div class="section">
            <h2>Détail des Commandes</h2>
            <table>
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Produit</th>
                  <th>Statut</th>
                  <th class="text-right">Montant</th>
                  <th class="text-right">Payé</th>
                </tr>
              </thead>
              <tbody>
                ${orders?.slice(0, 100).map(order => `
                  <tr>
                    <td>${order.order_number || "—"}</td>
                    <td>${format(new Date(order.created_at), "dd/MM/yy HH:mm")}</td>
                    <td>${order.clients?.full_name || "—"}</td>
                    <td>${order.products?.name || "—"}</td>
                    <td>
                      <span class="status status-${order.status}">
                        ${order.status === "delivered" ? "Livrée" : 
                          order.status === "pending" ? "En attente" :
                          order.status === "cancelled" ? "Annulée" :
                          order.status === "confirmed" ? "Confirmée" : order.status}
                      </span>
                    </td>
                    <td class="text-right">${formatCurrency(Number(order.total_amount || 0))}</td>
                    <td class="text-right">${formatCurrency(Number(order.amount_paid || 0))}</td>
                  </tr>
                `).join("") || ""}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Généré le ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}</p>
            <p>Pipeline - Gestion Automatique</p>
          </div>
        </body>
        </html>
      `;

      // Create and download
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `synthese-pipeline-${format(dateRange.from, "yyyy-MM-dd")}-${format(dateRange.to, "yyyy-MM-dd")}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier a été téléchargé. Ouvrez-le dans un navigateur et imprimez en PDF.",
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
    <Button onClick={handleExport} disabled={isExporting} className="gap-2">
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Exporter PDF
    </Button>
  );
}
