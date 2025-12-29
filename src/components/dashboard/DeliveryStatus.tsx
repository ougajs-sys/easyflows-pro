import { Truck, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const deliveries = [
  { id: 1, name: "Jean K.", zone: "Cocody", orders: 8, completed: 5, status: "active" },
  { id: 2, name: "Fatou S.", zone: "Yopougon", orders: 12, completed: 10, status: "active" },
  { id: 3, name: "Moussa D.", zone: "Marcory", orders: 6, completed: 6, status: "completed" },
  { id: 4, name: "Awa B.", zone: "Plateau", orders: 4, completed: 2, status: "active" },
];

export function DeliveryStatus() {
  return (
    <div className="glass rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Livreurs Actifs</h3>
        <span className="text-sm text-muted-foreground">4 en ligne</span>
      </div>

      <div className="space-y-3">
        {deliveries.map((delivery, index) => {
          const progress = (delivery.completed / delivery.orders) * 100;
          const isCompleted = delivery.status === "completed";

          return (
            <div
              key={delivery.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isCompleted
                  ? "bg-success/5 border-success/20"
                  : "bg-secondary/30 border-border hover:border-primary/30"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isCompleted ? "bg-success/20" : "bg-primary/20"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <Truck className="w-5 h-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate">{delivery.name}</p>
                    <span className="text-xs text-muted-foreground">{delivery.zone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted ? "bg-success" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {delivery.completed}/{delivery.orders}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
