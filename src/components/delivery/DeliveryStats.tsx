import { Package, CheckCircle, Clock, Truck, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DeliveryStatsProps {
  assignedCount: number;
  completedToday: number;
  inTransitCount: number;
  todayRevenue: number;
  status: 'available' | 'busy' | 'offline';
}

export function DeliveryStats({
  assignedCount,
  completedToday,
  inTransitCount,
  todayRevenue,
  status,
}: DeliveryStatsProps) {
  const stats = [
    {
      label: "En attente",
      value: assignedCount,
      icon: Package,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "En cours",
      value: inTransitCount,
      icon: Truck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Livrées aujourd'hui",
      value: completedToday,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Revenus du jour",
      value: `${todayRevenue.toLocaleString()} F`,
      icon: Banknote,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const statusLabels = {
    available: { label: "Disponible", color: "bg-success" },
    busy: { label: "Occupé", color: "bg-warning" },
    offline: { label: "Hors ligne", color: "bg-muted-foreground" },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Status Card */}
      <Card className="p-4 glass">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Statut</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  statusLabels[status].color
                )}
              />
              <span className="font-semibold text-foreground">
                {statusLabels[status].label}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-4 glass">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <Icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
