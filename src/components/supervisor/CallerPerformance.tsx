import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, TrendingUp, Target, Users } from "lucide-react";

interface CallerStats {
  id: string;
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  conversionRate: number;
  clientsCreated: number;
}

export function CallerPerformance() {
  const { data: callerStats, isLoading } = useQuery({
    queryKey: ["caller-performance"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get all users with caller role
      const { data: callerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "appelant");

      if (rolesError) throw rolesError;

      const callerIds = callerRoles?.map(r => r.user_id) || [];

      // Get profiles for callers
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", callerIds);

      if (profilesError) throw profilesError;

      // Get orders created by callers today
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, created_by, total_amount")
        .in("created_by", callerIds)
        .gte("created_at", todayISO);

      if (ordersError) throw ordersError;

      // Get clients created by callers today
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, created_by")
        .in("created_by", callerIds)
        .gte("created_at", todayISO);

      if (clientsError) throw clientsError;

      const stats: CallerStats[] = profiles?.map(profile => {
        const callerOrders = orders?.filter(o => o.created_by === profile.id) || [];
        const callerClients = clients?.filter(c => c.created_by === profile.id) || [];
        const delivered = callerOrders.filter(o => o.status === "delivered");
        const cancelled = callerOrders.filter(o => o.status === "cancelled");

        return {
          id: profile.id,
          name: profile.full_name || "Inconnu",
          totalOrders: callerOrders.length,
          deliveredOrders: delivered.length,
          cancelledOrders: cancelled.length,
          totalRevenue: delivered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          conversionRate: callerOrders.length > 0 
            ? Math.round((delivered.length / callerOrders.length) * 100) 
            : 0,
          clientsCreated: callerClients.length,
        };
      }) || [];

      return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-success/20 text-success border-success/30">Excellent</Badge>;
    if (rate >= 60) return <Badge className="bg-primary/20 text-primary border-primary/30">Bon</Badge>;
    if (rate >= 40) return <Badge className="bg-warning/20 text-warning border-warning/30">Moyen</Badge>;
    return <Badge className="bg-destructive/20 text-destructive border-destructive/30">À améliorer</Badge>;
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Performance Appelants
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {callerStats?.length || 0} appelants
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : callerStats?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun appelant actif aujourd'hui
          </div>
        ) : (
          callerStats?.map((caller) => (
            <div
              key={caller.id}
              className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium">{caller.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {caller.clientsCreated} nouveau{caller.clientsCreated > 1 ? "x" : ""} client{caller.clientsCreated > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {getPerformanceBadge(caller.conversionRate)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taux de conversion</span>
                  <span className="font-medium">{caller.conversionRate}%</span>
                </div>
                <Progress value={caller.conversionRate} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <p className="text-lg font-bold">{caller.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Commandes</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-success/10">
                  <p className="text-lg font-bold text-success">{caller.deliveredOrders}</p>
                  <p className="text-xs text-muted-foreground">Livrées</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-destructive/10">
                  <p className="text-lg font-bold text-destructive">{caller.cancelledOrders}</p>
                  <p className="text-xs text-muted-foreground">Annulées</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chiffre généré</span>
                  <span className="font-bold text-primary">{formatCurrency(caller.totalRevenue)} FCFA</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
