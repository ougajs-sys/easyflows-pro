import { Package, CreditCard, Truck, MessageSquare, UserPlus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "order",
    message: "Nouvelle commande CMD-006 créée",
    time: "Il y a 2 min",
    icon: Package,
    color: "text-primary bg-primary/15",
  },
  {
    id: 2,
    type: "payment",
    message: "Paiement reçu pour CMD-001",
    time: "Il y a 5 min",
    icon: CreditCard,
    color: "text-success bg-success/15",
  },
  {
    id: 3,
    type: "delivery",
    message: "CMD-003 livrée avec succès",
    time: "Il y a 12 min",
    icon: Truck,
    color: "text-blue-400 bg-blue-500/15",
  },
  {
    id: 4,
    type: "sms",
    message: "Campagne SMS envoyée - 150 clients",
    time: "Il y a 25 min",
    icon: MessageSquare,
    color: "text-violet-400 bg-violet-500/15",
  },
  {
    id: 5,
    type: "client",
    message: "Nouveau client ajouté: Traoré A.",
    time: "Il y a 1h",
    icon: UserPlus,
    color: "text-amber-400 bg-amber-500/15",
  },
  {
    id: 6,
    type: "alert",
    message: "Stock faible: Pack Premium",
    time: "Il y a 2h",
    icon: Bell,
    color: "text-warning bg-warning/15",
  },
];

export function RecentActivity() {
  return (
    <div className="glass rounded-xl p-5 animate-fade-in">
      <h3 className="font-semibold text-lg mb-4">Activité Récente</h3>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  activity.color
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {activity.message}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
