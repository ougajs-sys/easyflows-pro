import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp,
  Target,
  Award,
  Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatCurrency";

export function CallerDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["caller-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all orders created by this caller
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("created_by", user.id);

      if (error) throw error;

      const todayOrders = orders?.filter(
        (o) => new Date(o.created_at) >= today
      ) || [];

      const total = orders?.length || 0;
      const confirmed = orders?.filter((o) => o.status === "confirmed" || o.status === "delivered" || o.status === "in_transit").length || 0;
      const reported = orders?.filter((o) => o.status === "reported").length || 0;
      const cancelled = orders?.filter((o) => o.status === "cancelled").length || 0;
      const pending = orders?.filter((o) => o.status === "pending" || o.status === "partial").length || 0;

      const todayTotal = todayOrders.length;
      const todayConfirmed = todayOrders.filter((o) => o.status === "confirmed" || o.status === "delivered" || o.status === "in_transit").length;
      const todayReported = todayOrders.filter((o) => o.status === "reported").length;
      const todayCancelled = todayOrders.filter((o) => o.status === "cancelled").length;

      const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
      const todayConversionRate = todayTotal > 0 ? Math.round((todayConfirmed / todayTotal) * 100) : 0;

      const totalRevenue = orders
        ?.filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      return {
        total,
        confirmed,
        reported,
        cancelled,
        pending,
        todayTotal,
        todayConfirmed,
        todayReported,
        todayCancelled,
        conversionRate,
        todayConversionRate,
        totalRevenue,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mon Espace</h1>
        <p className="text-muted-foreground">
          Visualisez vos performances en temps réel
        </p>
      </div>

      {/* Conversion Rate Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Target className="w-5 h-5" />
            Taux de conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-primary">{stats?.conversionRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Global</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{stats?.todayConversionRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              </div>
            </div>
            <Progress value={stats?.conversionRate || 0} className="h-3" />
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-muted-foreground">
                {stats?.confirmed || 0} confirmées sur {stats?.total || 0} commandes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Today */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Performance du jour
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayTotal || 0}</p>
                  <p className="text-xs text-muted-foreground">Reçues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayConfirmed || 0}</p>
                  <p className="text-xs text-muted-foreground">Confirmées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayReported || 0}</p>
                  <p className="text-xs text-muted-foreground">Reportées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.todayCancelled || 0}</p>
                  <p className="text-xs text-muted-foreground">Annulées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Grid - All time */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Statistiques globales</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total commandes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-success">{stats?.confirmed || 0}</p>
              <p className="text-sm text-muted-foreground">Confirmées</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-warning">{stats?.reported || 0}</p>
              <p className="text-sm text-muted-foreground">Reportées</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">{stats?.cancelled || 0}</p>
              <p className="text-sm text-muted-foreground">Annulées</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue Card */}
      <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Chiffre d'affaires généré</p>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(stats?.totalRevenue || 0)} FCFA
              </p>
            </div>
            <div className="p-4 rounded-full bg-success/10">
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders Alert */}
      {(stats?.pending || 0) > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold">
                  {stats?.pending} commande{(stats?.pending || 0) > 1 ? "s" : ""} en attente
                </p>
                <p className="text-sm text-muted-foreground">
                  Des clients attendent votre appel
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
