import { Plus, Send, FileText, UserPlus, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Nouvelle Commande", icon: Plus, variant: "glow" as const },
  { label: "Envoyer SMS", icon: Send, variant: "outline" as const },
  { label: "Générer Rapport", icon: FileText, variant: "outline" as const },
  { label: "Ajouter Client", icon: UserPlus, variant: "outline" as const },
  { label: "Stock Update", icon: Package, variant: "outline" as const },
  { label: "Sync UTB", icon: RefreshCw, variant: "outline" as const },
];

export function QuickActions() {
  return (
    <div className="glass rounded-xl p-5 animate-fade-in">
      <h3 className="font-semibold text-lg mb-4">Actions Rapides</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className="h-auto py-4 flex-col gap-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
