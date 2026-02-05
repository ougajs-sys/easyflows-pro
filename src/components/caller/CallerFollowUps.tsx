import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  RefreshCw, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Loader2,
  Bell,
  ChevronDown,
  XCircle,
  Truck,
  ShoppingCart,
  FileText
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/formatCurrency";

type OrderStatus = Database["public"]["Enums"]["order_status"];

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
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [showNotesDialog, setShowNotesDialog] = useState(false);

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
    refetchOnWindowFocus: true,
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
      queryClient.invalidateQueries({ queryKey: ["caller-stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["caller-stats"] });
      toast({
        title: "Relance annulée",
      });
    },
  });

  // Mutation pour mettre à jour les notes d'une relance
  const updateFollowUpNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caller-followups"] });
      setShowNotesDialog(false);
      setFollowUpNotes("");
      setSelectedFollowUp(null);
      toast({
        title: "Notes enregistrées",
        description: "Les notes de la relance ont été mises à jour",
      });
    },
    onError: (error) => {
      console.error("Error updating follow-up notes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les notes",
        variant: "destructive",
      });
    }
  });

  const handleAddNotes = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setFollowUpNotes(followUp.notes || "");
    setShowNotesDialog(true);
  };

  const handleSaveNotes = () => {
    if (!selectedFollowUp) return;
    updateFollowUpNotesMutation.mutate({
      id: selectedFollowUp.id,
      notes: followUpNotes
    });
  };

  // Mutation pour mettre à jour le statut de la commande
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, followUpId }: { orderId: string; status: OrderStatus; followUpId: string }) => {
      // Mettre à jour le statut de la commande
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Compléter automatiquement la relance
      const { error: followUpError } = await supabase
        .from("follow_ups")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", followUpId);

      if (followUpError) throw followUpError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caller-followups"] });
      queryClient.invalidateQueries({ queryKey: ["caller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["caller-stats"] });
      queryClient.invalidateQueries({ queryKey: ["caller-cancelled-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-orders-to-dispatch"] });
      
      const statusLabels: Record<OrderStatus, string> = {
        pending: "En attente",
        confirmed: "Confirmée",
        in_transit: "En cours de livraison",
        delivered: "Livrée",
        partial: "Partielle",
        cancelled: "Annulée",
        reported: "Signalée"
      };
      
      toast({
        title: "Commande mise à jour",
        description: `La commande a été marquée comme "${statusLabels[variables.status]}"`,
      });
    },
    onError: (error) => {
      console.error("Error updating order status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la commande",
        variant: "destructive",
      });
    }
  });

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
                          <div className="flex flex-col gap-2">
                            {/* Actions principales : Appeler */}
                            {followUp.client?.phone && (
                              <a
                                href={`tel:${followUp.client.phone}`}
                                className="flex items-center justify-center gap-2 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                                <span className="text-sm font-medium">Appeler</span>
                              </a>
                            )}

                            {/* Bouton pour ajouter/modifier des notes */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleAddNotes(followUp)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              {followUp.notes ? "Modifier notes" : "Ajouter notes"}
                            </Button>

                            {/* Actions sur la commande */}
                            {followUp.order && (
                              <div className="flex gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="flex-1 bg-primary hover:bg-primary/90"
                                      disabled={updateOrderStatusMutation.isPending}
                                    >
                                      {updateOrderStatusMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <ShoppingCart className="w-4 h-4 mr-1" />
                                          Statut commande
                                          <ChevronDown className="w-4 h-4 ml-1" />
                                        </>
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="center" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => updateOrderStatusMutation.mutate({
                                        orderId: followUp.order!.id,
                                        status: "confirmed",
                                        followUpId: followUp.id
                                      })}
                                      className="text-success"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Confirmer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updateOrderStatusMutation.mutate({
                                        orderId: followUp.order!.id,
                                        status: "pending",
                                        followUpId: followUp.id
                                      })}
                                      className="text-warning"
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      En attente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => updateOrderStatusMutation.mutate({
                                        orderId: followUp.order!.id,
                                        status: "in_transit",
                                        followUpId: followUp.id
                                      })}
                                      className="text-blue-500"
                                    >
                                      <Truck className="w-4 h-4 mr-2" />
                                      En livraison
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => updateOrderStatusMutation.mutate({
                                        orderId: followUp.order!.id,
                                        status: "cancelled",
                                        followUpId: followUp.id
                                      })}
                                      className="text-destructive"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Annuler
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => completeFollowUpMutation.mutate(followUp.id)}
                                  disabled={completeFollowUpMutation.isPending}
                                >
                                  {completeFollowUpMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            )}

                            {/* Si pas de commande liée, juste le bouton terminé */}
                            {!followUp.order && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
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
                            )}
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

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedFollowUp?.notes ? "Modifier les notes" : "Ajouter des notes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-notes">Notes / Observations</Label>
              <Textarea
                id="followup-notes"
                placeholder="Ex: Client préfère être contacté après 18h, demande un report..."
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                className="min-h-[120px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{followUpNotes.length}/500 caractères</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowNotesDialog(false);
                setFollowUpNotes("");
                setSelectedFollowUp(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateFollowUpNotesMutation.isPending}
            >
              {updateFollowUpNotesMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
