import { 
  Package, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Banknote,
  ExternalLink,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeliveryDashboardProps {
  receivedCount: number;
  deliveredCount: number;
  reportedCount: number;
  cancelledCount: number;
  deliveryFee: number;
  todayRevenue: number;
  amountToReturn: number;
}

const WAVE_PAYMENT_LINK = "https://pay.wave.com/m/M_ci_vNYXDd3MiHes/c/ci/";

export function DeliveryDashboard({
  receivedCount,
  deliveredCount,
  reportedCount,
  cancelledCount,
  deliveryFee,
  todayRevenue,
  amountToReturn,
}: DeliveryDashboardProps) {
  const stats = [
    {
      label: "Commandes reçues",
      value: receivedCount,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Livrées",
      value: deliveredCount,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Reportées",
      value: reportedCount,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Annulées",
      value: cancelledCount,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  const delivererRevenue = deliveredCount * deliveryFee;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon espace</h2>
        <p className="text-muted-foreground">Vue d'ensemble de vos activités du jour</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Your Revenue */}
        <Card className="glass border-success/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-success" />
              Votre revenu du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Livraisons effectuées</span>
                <span className="font-medium text-foreground">{deliveredCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Frais par livraison</span>
                <span className="font-medium text-foreground">{deliveryFee.toLocaleString()} F</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total à percevoir</span>
                  <span className="text-2xl font-bold text-success">{delivererRevenue.toLocaleString()} F</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount to Return */}
        <Card className="glass border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="w-5 h-5 text-warning" />
              Recettes à reverser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Montants collectés</span>
                <span className="font-medium text-foreground">{todayRevenue.toLocaleString()} F</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Votre commission</span>
                <span className="font-medium text-success">-{delivererRevenue.toLocaleString()} F</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">À reverser</span>
                  <span className="text-2xl font-bold text-warning">{amountToReturn.toLocaleString()} F</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Button */}
      <Card className="glass bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Versement des recettes</h3>
              <p className="text-sm text-muted-foreground">
                Effectuez votre versement journalier via Wave
              </p>
            </div>
            <Button
              size="lg"
              className="w-full md:w-auto gap-2"
              onClick={() => window.open(WAVE_PAYMENT_LINK, "_blank")}
            >
              <Banknote className="w-5 h-5" />
              Verser mes recettes journalières
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
