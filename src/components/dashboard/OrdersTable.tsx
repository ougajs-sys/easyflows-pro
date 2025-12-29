import { cn } from "@/lib/utils";
import { MoreHorizontal, Eye, Edit, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const orders = [
  {
    id: "CMD-001",
    client: "Marie Dupont",
    phone: "+225 07 00 00 01",
    product: "Pack Premium",
    amount: "45 000 FCFA",
    status: "confirmed",
    livreur: "Jean K.",
    date: "29 Déc 2025",
  },
  {
    id: "CMD-002",
    client: "Kouassi Aya",
    phone: "+225 05 00 00 02",
    product: "Pack Standard",
    amount: "25 000 FCFA",
    status: "pending",
    livreur: "Non assigné",
    date: "29 Déc 2025",
  },
  {
    id: "CMD-003",
    client: "Bamba Moussa",
    phone: "+225 01 00 00 03",
    product: "Pack VIP",
    amount: "75 000 FCFA",
    status: "delivered",
    livreur: "Fatou S.",
    date: "28 Déc 2025",
  },
  {
    id: "CMD-004",
    client: "Diabaté Fanta",
    phone: "+225 07 00 00 04",
    product: "Pack Duo",
    amount: "50 000 FCFA",
    status: "in_transit",
    livreur: "Jean K.",
    date: "29 Déc 2025",
  },
  {
    id: "CMD-005",
    client: "Koné Ibrahim",
    phone: "+225 05 00 00 05",
    product: "Pack Standard",
    amount: "25 000 FCFA",
    status: "partial",
    livreur: "Fatou S.",
    date: "28 Déc 2025",
  },
];

const statusMap = {
  confirmed: { label: "Confirmé", class: "bg-success/15 text-success border-success/30" },
  pending: { label: "En attente", class: "bg-warning/15 text-warning border-warning/30" },
  delivered: { label: "Livré", class: "bg-primary/15 text-primary border-primary/30" },
  in_transit: { label: "En cours", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  partial: { label: "Partiel", class: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  cancelled: { label: "Annulé", class: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function OrdersTable() {
  return (
    <div className="glass rounded-xl overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Commandes Récentes</h3>
          <p className="text-sm text-muted-foreground">Suivi en temps réel des commandes</p>
        </div>
        <Button variant="outline" size="sm">
          Voir tout
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ID
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
                Livreur
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
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="p-4">
                  <span className="font-mono text-sm text-primary">{order.id}</span>
                </td>
                <td className="p-4">
                  <div>
                    <p className="font-medium text-sm">{order.client}</p>
                    <p className="text-xs text-muted-foreground">{order.phone}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm">{order.product}</span>
                </td>
                <td className="p-4">
                  <span className="font-semibold text-sm">{order.amount}</span>
                </td>
                <td className="p-4">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                      statusMap[order.status as keyof typeof statusMap].class
                    )}
                  >
                    {statusMap[order.status as keyof typeof statusMap].label}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">{order.livreur}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Truck className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
