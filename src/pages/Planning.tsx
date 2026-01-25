import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSchedules } from "@/hooks/useSchedules";
import { useUsers } from "@/hooks/useUsers";
import { useOrders } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Truck, Phone, Package, Clock, MapPin, User, Trash2 } from "lucide-react";

const Planning = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'delivery' | 'caller'>('delivery');
  const { toast } = useToast();

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;
  const { schedules, isLoading, createSchedule, deleteSchedule } = useSchedules(dateStr);
  const { users } = useUsers();
  const { orders } = useOrders();

  // Filter orders for selected date
  const scheduledOrders = orders?.filter(order => {
    if (!order.scheduled_at || !selectedDate) return false;
    return format(parseISO(order.scheduled_at), "yyyy-MM-dd") === dateStr;
  }) || [];

  const deliverySchedules = schedules.filter(s => s.type === 'delivery');
  const callerSchedules = schedules.filter(s => s.type === 'caller');

  const [newSchedule, setNewSchedule] = useState({
    user_id: "",
    start_time: "09:00",
    end_time: "18:00",
    zone: "",
    notes: "",
  });

  const handleCreateSchedule = async () => {
    if (!newSchedule.user_id || !selectedDate) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    try {
      await createSchedule.mutateAsync({
        user_id: newSchedule.user_id,
        type: scheduleType,
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        zone: newSchedule.zone || null,
        notes: newSchedule.notes || null,
        status: 'scheduled',
      });
      toast({ title: "Succès", description: "Planning créé avec succès" });
      setIsDialogOpen(false);
      setNewSchedule({ user_id: "", start_time: "09:00", end_time: "18:00", zone: "", notes: "" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule.mutateAsync(id);
      toast({ title: "Succès", description: "Planning supprimé" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planification</h1>
            <p className="text-muted-foreground mt-1">Gérez les plannings des livreurs et appelants</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau planning
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un planning</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type de planning</Label>
                  <Select value={scheduleType} onValueChange={(v: 'delivery' | 'caller') => setScheduleType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Livreur</SelectItem>
                      <SelectItem value="caller">Appelant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employé</Label>
                  <Select value={newSchedule.user_id} onValueChange={(v) => setNewSchedule({ ...newSchedule, user_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.profile?.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heure début</Label>
                    <Input 
                      type="time" 
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure fin</Label>
                    <Input 
                      type="time" 
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Zone (optionnel)</Label>
                  <Input 
                    placeholder="Ex: Casablanca Centre"
                    value={newSchedule.zone}
                    onChange={(e) => setNewSchedule({ ...newSchedule, zone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea 
                    placeholder="Notes additionnelles..."
                    value={newSchedule.notes}
                    onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateSchedule} disabled={createSchedule.isPending}>
                  {createSchedule.isPending ? "Création..." : "Créer le planning"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Calendrier</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={fr}
                className="rounded-md border"
              />
              {selectedDate && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedules */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                Plannings du {selectedDate ? format(selectedDate, "d MMMM", { locale: fr }) : "jour"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="delivery" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="delivery" className="gap-2">
                    <Truck className="h-4 w-4" />
                    Livreurs ({deliverySchedules.length})
                  </TabsTrigger>
                  <TabsTrigger value="caller" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Appelants ({callerSchedules.length})
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="gap-2">
                    <Package className="h-4 w-4" />
                    Livraisons ({scheduledOrders.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="delivery" className="space-y-3">
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-4">Chargement...</p>
                  ) : deliverySchedules.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Aucun planning de livreur pour ce jour</p>
                  ) : (
                    deliverySchedules.map(schedule => (
                      <div key={schedule.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{schedule.profiles?.full_name || "Utilisateur"}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </span>
                              {schedule.zone && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {schedule.zone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status === 'scheduled' && 'Planifié'}
                            {schedule.status === 'in_progress' && 'En cours'}
                            {schedule.status === 'completed' && 'Terminé'}
                            {schedule.status === 'cancelled' && 'Annulé'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="caller" className="space-y-3">
                  {isLoading ? (
                    <p className="text-muted-foreground text-center py-4">Chargement...</p>
                  ) : callerSchedules.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Aucun planning d'appelant pour ce jour</p>
                  ) : (
                    callerSchedules.map(schedule => (
                      <div key={schedule.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                            <Phone className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">{schedule.profiles?.full_name || "Utilisateur"}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status === 'scheduled' && 'Planifié'}
                            {schedule.status === 'in_progress' && 'En cours'}
                            {schedule.status === 'completed' && 'Terminé'}
                            {schedule.status === 'cancelled' && 'Annulé'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="orders" className="space-y-3">
                  {scheduledOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Aucune livraison planifiée pour ce jour</p>
                  ) : (
                    scheduledOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                            <Package className="h-5 w-5 text-warning" />
                          </div>
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.client?.full_name} • {order.delivery_address || 'Adresse non spécifiée'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{order.total_amount?.toFixed(2)} DH</p>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Planning;
