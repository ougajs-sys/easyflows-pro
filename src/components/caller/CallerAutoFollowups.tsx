import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bell, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Phone,
  MessageSquare,
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format, isToday, isPast, addHours } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduledFollowup {
  id: string;
  order_id: string;
  client_id: string;
  scheduled_at: string;
  followup_type: string;
  status: string;
  sms_content: string | null;
  attempts: number;
  created_at: string;
  orders: {
    order_number: string;
    total_amount: number;
    status: string;
  } | null;
  clients: {
    full_name: string;
    phone: string;
  } | null;
}

interface OrderForFollowup {
  id: string;
  order_number: string;
  total_amount: number;
  client_id: string;
  clients: {
    full_name: string;
    phone: string;
  } | null;
}

export function CallerAutoFollowups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [followupType, setFollowupType] = useState<string>("call");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [smsContent, setSmsContent] = useState<string>("");

  // Fetch scheduled followups
  const { data: followups, isLoading } = useQuery({
    queryKey: ["scheduled-followups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_followups")
        .select(`
          *,
          orders:order_id(order_number, total_amount, status),
          clients:client_id(full_name, phone)
        `)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as ScheduledFollowup[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch orders eligible for followup (reported, cancelled, partial)
  const { data: eligibleOrders } = useQuery({
    queryKey: ["orders-for-followup", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          total_amount,
          client_id,
          clients:client_id(full_name, phone)
        `)
        .eq("created_by", user.id)
        .in("status", ["reported", "cancelled", "partial", "pending"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as OrderForFollowup[];
    },
    enabled: !!user?.id,
  });

  // Create followup mutation
  const createFollowupMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedOrder) throw new Error("Missing data");

      const order = eligibleOrders?.find((o) => o.id === selectedOrder);
      if (!order) throw new Error("Order not found");

      const { error } = await supabase.from("scheduled_followups").insert({
        order_id: selectedOrder,
        client_id: order.client_id,
        scheduled_at: scheduledTime || addHours(new Date(), 1).toISOString(),
        followup_type: followupType,
        sms_content: followupType === "sms" ? smsContent : null,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-followups"] });
      toast.success("Relance programmée !");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Erreur lors de la création");
    },
  });

  // Complete followup mutation
  const completeFollowupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_followups")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-followups"] });
      toast.success("Relance marquée comme terminée");
    },
  });

  // Cancel followup mutation
  const cancelFollowupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_followups")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-followups"] });
      toast.success("Relance annulée");
    },
  });

  // Trigger manual processing
  const triggerProcessingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("process-auto-followups");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-followups"] });
      toast.success("Traitement des relances lancé");
    },
    onError: () => {
      toast.error("Erreur lors du traitement");
    },
  });

  const resetForm = () => {
    setSelectedOrder("");
    setFollowupType("call");
    setScheduledTime("");
    setSmsContent("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingFollowups = followups?.filter((f) => f.status === "pending") || [];
  const sentFollowups = followups?.filter((f) => f.status === "sent") || [];
  const completedFollowups = followups?.filter((f) => f.status === "completed") || [];

  const overdueCount = pendingFollowups.filter((f) => isPast(new Date(f.scheduled_at))).length;
  const todayCount = pendingFollowups.filter((f) => isToday(new Date(f.scheduled_at))).length;

  const getStatusBadge = (followup: ScheduledFollowup) => {
    if (followup.status === "completed") {
      return <Badge className="bg-success/15 text-success">Terminée</Badge>;
    }
    if (followup.status === "sent") {
      return <Badge className="bg-blue-500/15 text-blue-500">Envoyée</Badge>;
    }
    if (followup.status === "cancelled") {
      return <Badge className="bg-destructive/15 text-destructive">Annulée</Badge>;
    }
    if (isPast(new Date(followup.scheduled_at))) {
      return <Badge className="bg-destructive/15 text-destructive">En retard</Badge>;
    }
    if (isToday(new Date(followup.scheduled_at))) {
      return <Badge className="bg-warning/15 text-warning">Aujourd'hui</Badge>;
    }
    return <Badge variant="outline">Programmée</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relances Automatiques</h1>
          <p className="text-muted-foreground">Programmez et suivez vos relances clients</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => triggerProcessingMutation.mutate()}
            disabled={triggerProcessingMutation.isPending}
          >
            {triggerProcessingMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Traiter maintenant
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle relance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programmer une relance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Commande</label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une commande" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleOrders?.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - {order.clients?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Type de relance</label>
                  <Select value={followupType} onValueChange={setFollowupType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Appel
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          SMS
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Date et heure</label>
                  <Input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>

                {followupType === "sms" && (
                  <div>
                    <label className="text-sm font-medium">Message SMS</label>
                    <Textarea
                      value={smsContent}
                      onChange={(e) => setSmsContent(e.target.value)}
                      placeholder="Contenu du SMS..."
                      rows={3}
                    />
                  </div>
                )}

                <Button 
                  className="w-full"
                  onClick={() => createFollowupMutation.mutate()}
                  disabled={!selectedOrder || createFollowupMutation.isPending}
                >
                  {createFollowupMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  Programmer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={cn(overdueCount > 0 && "border-destructive/30 bg-destructive/5")}>
          <CardContent className="p-4 text-center">
            <AlertCircle className={cn("w-6 h-6 mx-auto mb-2", overdueCount > 0 ? "text-destructive" : "text-muted-foreground")} />
            <p className="text-2xl font-bold">{overdueCount}</p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </CardContent>
        </Card>
        <Card className={cn(todayCount > 0 && "border-warning/30 bg-warning/5")}>
          <CardContent className="p-4 text-center">
            <Clock className={cn("w-6 h-6 mx-auto mb-2", todayCount > 0 ? "text-warning" : "text-muted-foreground")} />
            <p className="text-2xl font-bold">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{pendingFollowups.length}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Followups Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            En attente ({pendingFollowups.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1">
            Envoyées ({sentFollowups.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Terminées ({completedFollowups.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingFollowups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucune relance en attente</p>
              </CardContent>
            </Card>
          ) : (
            pendingFollowups.map((followup) => (
              <Card key={followup.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        followup.followup_type === "sms" ? "bg-blue-500/10" : "bg-primary/10"
                      )}>
                        {followup.followup_type === "sms" ? (
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Phone className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{followup.clients?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {followup.orders?.order_number} - {followup.clients?.phone}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(followup.scheduled_at), "PPP 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(followup)}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => completeFollowupMutation.mutate(followup.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelFollowupMutation.mutate(followup.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4 space-y-3">
          {sentFollowups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucune relance envoyée</p>
              </CardContent>
            </Card>
          ) : (
            sentFollowups.map((followup) => (
              <Card key={followup.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{followup.clients?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {followup.orders?.order_number}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => completeFollowupMutation.mutate(followup.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Terminer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedFollowups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucune relance terminée</p>
              </CardContent>
            </Card>
          ) : (
            completedFollowups.slice(0, 10).map((followup) => (
              <Card key={followup.id} className="bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <div>
                        <p className="font-medium">{followup.clients?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {followup.orders?.order_number}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-success">Terminée</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
