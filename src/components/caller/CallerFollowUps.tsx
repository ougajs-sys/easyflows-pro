import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Loader2,
  Bell
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FollowUp {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  order: {
    id: string;
    order_number: string | null;
    status: string;
    total_amount: number;
  } | null;
  client: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
}

export function CallerFollowUps() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: followUps, isLoading } = useQuery({
    queryKey: ["caller-followups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("follow_ups")
        .select(`
          id,
          scheduled_at,
          status,
          notes,
          created_at,
          completed_at,
          order:orders (id, order_number, status, total_amount),
          client:clients (id, full_name, phone)
        `)
        .eq("created_by", user.id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as FollowUp[];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caller-followups"] });
      toast({
        title: "Relance complétée",
        description: "Le suivi a été marqué comme terminé",
      });
    },
  });

  const cancelFollowUpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caller-followups"] });
      toast({
        title: "Relance annulée",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filterFollowUps = (status: string) => {
    if (!followUps) return [];
    switch (status) {
      case "pending":
        return followUps.filter((f) => f.status === "pending");
      case "today":
        return followUps.filter((f) => f.status === "pending" && isToday(new Date(f.scheduled_at)));
      case "overdue":
        return followUps.filter((f) => f.status === "pending" && isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at)));
      case "completed":
        return followUps.filter((f) => f.status === "completed");
      default:
        return followUps;
    }
  };

  const todayCount = filterFollowUps("today").length;
  const overdueCount = filterFollowUps("overdue").length;
  const pendingCount = filterFollowUps("pending").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Relances</h1>
        <p className="text-muted-foreground">Système de relance automatique des clients</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={cn(overdueCount > 0 && "border-destructive/30 bg-destructive/5")}>
          <CardContent className="p-4 text-center">
            <AlertCircle className={cn("w-6 h-6 mx-auto mb-1", overdueCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            <p className="text-2xl font-bold">{overdueCount}</p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </CardContent>
        </Card>

        <Card className={cn(todayCount > 0 && "border-warning/30 bg-warning/5")}>
          <CardContent className="p-4 text-center">
            <Bell className={cn("w-6 h-6 mx-auto mb-1", todayCount > 0 ? "text-warning" : "text-muted-foreground")} />
            <p className="text-2xl font-bold">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Alert */}
      {overdueCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {overdueCount} relance{overdueCount > 1 ? "s" : ""} en retard
                </p>
                <p className="text-sm text-muted-foreground">
                  Ces clients attendent votre appel
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            En attente
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="relative">
            En retard
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                {overdueCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Terminées</TabsTrigger>
        </TabsList>

        {["pending", "overdue", "completed"].map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            <div className="space-y-3">
              {filterFollowUps(status).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <RefreshCw className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucune relance</p>
                  </CardContent>
                </Card>
              ) : (
                filterFollowUps(status).map((followUp) => {
                  const isOverdue = isPast(new Date(followUp.scheduled_at)) && followUp.status === "pending";
                  const isScheduledToday = isToday(new Date(followUp.scheduled_at));

                  return (
                    <Card 
                      key={followUp.id}
                      className={cn(
                        "transition-colors",
                        isOverdue && "border-destructive/30",
                        isScheduledToday && !isOverdue && "border-warning/30"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{followUp.client?.full_name || "Client inconnu"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {followUp.order?.order_number && (
                                <Badge variant="outline" className="text-xs">
                                  <Package className="w-3 h-3 mr-1" />
                                  {followUp.order.order_number}
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge className="bg-destructive/15 text-destructive text-xs">
                                  En retard
                                </Badge>
                              )}
                              {isScheduledToday && !isOverdue && (
                                <Badge className="bg-warning/15 text-warning text-xs">
                                  Aujourd'hui
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-sm font-medium",
                              isOverdue ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {format(new Date(followUp.scheduled_at), "dd MMM HH:mm", { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(followUp.scheduled_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>

                        {followUp.notes && (
                          <p className="text-sm text-muted-foreground mb-3 p-2 rounded bg-secondary/30">
                            {followUp.notes}
                          </p>
                        )}

                        {followUp.order && (
                          <div className="text-sm text-muted-foreground mb-3">
                            Montant: <span className="font-medium text-foreground">
                              {formatCurrency(Number(followUp.order.total_amount))} FCFA
                            </span>
                          </div>
                        )}

                        {followUp.status === "pending" && (
                          <div className="flex gap-2">
                            {followUp.client?.phone && (
                              <a
                                href={`tel:${followUp.client.phone}`}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                <span className="text-sm font-medium">Appeler</span>
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => completeFollowUpMutation.mutate(followUp.id)}
                              disabled={completeFollowUpMutation.isPending}
                            >
                              {completeFollowUpMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Terminé
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {followUp.status === "completed" && followUp.completed_at && (
                          <div className="flex items-center gap-2 text-sm text-success">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Complété le {format(new Date(followUp.completed_at), "dd MMM yyyy HH:mm", { locale: fr })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
