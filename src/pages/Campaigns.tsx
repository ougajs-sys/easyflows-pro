import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Plus, 
  MessageSquare, 
  Send, 
  Users, 
  CheckCircle, 
  XCircle,
  Clock,
  Megaphone,
  TrendingUp,
  UserCheck,
  Bell,
  Edit,
  Calendar,
  CalendarClock
} from "lucide-react";

const Campaigns = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { campaigns, isLoading, createCampaign, updateCampaign, sendCampaign } = useCampaigns();

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "sms" as 'sms' | 'whatsapp',
    category: "promotion" as 'promotion' | 'relance' | 'notification' | 'custom',
    message: "",
    segment: "all" as 'all' | 'new' | 'regular' | 'vip' | 'inactive',
    status: "draft" as 'draft' | 'scheduled',
    total_recipients: 0,
    scheduled_at: "",
  });

  const handleCreateCampaign = async (sendNow: boolean = false) => {
    if (!newCampaign.name || !newCampaign.message) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    if (!sendNow && newCampaign.status === 'scheduled' && !newCampaign.scheduled_at) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une date/heure de planification", variant: "destructive" });
      return;
    }

    try {
      const campaignData = {
        name: newCampaign.name,
        type: newCampaign.type,
        category: newCampaign.category,
        message: newCampaign.message,
        segment: newCampaign.segment,
        status: sendNow ? "draft" as const : newCampaign.status,
        total_recipients: 0,
        created_by: user?.id || null,
        scheduled_at: !sendNow && newCampaign.status === 'scheduled' && newCampaign.scheduled_at 
          ? new Date(newCampaign.scheduled_at).toISOString() 
          : null,
      };

      const created = await createCampaign.mutateAsync(campaignData);
      
      if (sendNow && created) {
        await sendCampaign.mutateAsync(created.id);
        toast({ title: "Succès", description: "Campagne créée et envoyée avec succès" });
      } else if (newCampaign.status === 'scheduled') {
        toast({ title: "Succès", description: `Campagne planifiée pour le ${format(new Date(newCampaign.scheduled_at), "dd/MM/yyyy à HH:mm", { locale: fr })}` });
      } else {
        toast({ title: "Succès", description: "Campagne créée comme brouillon" });
      }
      
      setIsDialogOpen(false);
      setNewCampaign({
        name: "",
        type: "sms",
        category: "promotion",
        message: "",
        segment: "all",
        status: "draft",
        total_recipients: 0,
        scheduled_at: "",
      });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleScheduleCampaign = async (campaignId: string) => {
    setSelectedCampaign(campaigns.find(c => c.id === campaignId) || null);
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      await sendCampaign.mutateAsync(campaignId);
      toast({ title: "Succès", description: "Campagne envoyée avec succès" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'completed').length,
    pending: campaigns.filter(c => c.status === 'draft' || c.status === 'scheduled').length,
    totalSent: campaigns.reduce((acc, c) => acc + c.sent_count, 0),
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'promotion': return <Megaphone className="h-4 w-4" />;
      case 'relance': return <TrendingUp className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'promotion': return 'Promotion';
      case 'relance': return 'Relance';
      case 'notification': return 'Notification';
      case 'custom': return 'Personnalisé';
      default: return category;
    }
  };

  const getSegmentLabel = (segment: string | null) => {
    switch (segment) {
      case 'all': return 'Tous les clients';
      case 'new': return 'Nouveaux clients';
      case 'regular': return 'Clients réguliers';
      case 'vip': return 'Clients VIP';
      case 'inactive': return 'Clients inactifs';
      default: return 'Non défini';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-muted text-muted-foreground">Brouillon</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Planifiée</Badge>;
      case 'sending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">En cours</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Terminée</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campagnes SMS/WhatsApp</h1>
            <p className="text-muted-foreground mt-1">Gérez vos campagnes marketing via MESSENGER360</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle campagne
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer une campagne</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom de la campagne</Label>
                  <Input 
                    placeholder="Ex: Promo été 2024"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Select 
                      value={newCampaign.type} 
                      onValueChange={(v: 'sms' | 'whatsapp') => setNewCampaign({ ...newCampaign, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select 
                      value={newCampaign.category} 
                      onValueChange={(v: 'promotion' | 'relance' | 'notification' | 'custom') => setNewCampaign({ ...newCampaign, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="relance">Relance clients</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Segment cible</Label>
                  <Select 
                    value={newCampaign.segment} 
                    onValueChange={(v: 'all' | 'new' | 'regular' | 'vip' | 'inactive') => setNewCampaign({ ...newCampaign, segment: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les clients</SelectItem>
                      <SelectItem value="new">Nouveaux clients</SelectItem>
                      <SelectItem value="regular">Clients réguliers</SelectItem>
                      <SelectItem value="vip">Clients VIP</SelectItem>
                      <SelectItem value="inactive">Clients inactifs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea 
                    placeholder="Rédigez votre message ici..."
                    rows={4}
                    value={newCampaign.message}
                    onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{newCampaign.message.length}/160 caractères</p>
                </div>
                
                {/* Scheduling options */}
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Planification</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={newCampaign.status === 'draft' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCampaign({ ...newCampaign, status: 'draft', scheduled_at: '' })}
                      className="justify-start"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Brouillon
                    </Button>
                    <Button
                      type="button"
                      variant={newCampaign.status === 'scheduled' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewCampaign({ ...newCampaign, status: 'scheduled' })}
                      className="justify-start"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Planifier
                    </Button>
                  </div>
                  
                  {newCampaign.status === 'scheduled' && (
                    <div className="space-y-2">
                      <Label>Date et heure d'envoi</Label>
                      <Input 
                        type="datetime-local"
                        value={newCampaign.scheduled_at}
                        onChange={(e) => setNewCampaign({ ...newCampaign, scheduled_at: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => handleCreateCampaign(false)} 
                    disabled={createCampaign.isPending}
                  >
                    {newCampaign.status === 'scheduled' ? (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Planifier l'envoi
                      </>
                    ) : (
                      "Enregistrer brouillon"
                    )}
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => handleCreateCampaign(true)} 
                    disabled={createCampaign.isPending || sendCampaign.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer maintenant
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Campagnes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                  <p className="text-sm text-muted-foreground">Envoyées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Send className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSent}</p>
                  <p className="text-sm text-muted-foreground">Messages envoyés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Toutes les campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement...</p>
            ) : campaigns.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune campagne créée</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campagne</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Envoyés</TableHead>
                    <TableHead className="text-center">Échecs</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(campaign => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {campaign.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {campaign.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(campaign.category)}
                          <span>{getCategoryLabel(campaign.category)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getSegmentLabel(campaign.segment)}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-400">{campaign.sent_count}</span>
                        {campaign.total_recipients > 0 && (
                          <span className="text-muted-foreground">/{campaign.total_recipients}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-red-400">
                        {campaign.failed_count}
                      </TableCell>
                      <TableCell>
                        {campaign.status === 'scheduled' && campaign.scheduled_at ? (
                          <div className="flex items-center gap-1 text-blue-400">
                            <CalendarClock className="h-3 w-3" />
                            {format(new Date(campaign.scheduled_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </div>
                        ) : campaign.sent_at ? (
                          format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })
                        ) : (
                          format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: fr })
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {campaign.status === 'draft' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleScheduleCampaign(campaign.id)}
                            >
                              <Calendar className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              className="gap-1"
                              onClick={() => handleSendCampaign(campaign.id)}
                              disabled={sendCampaign.isPending}
                            >
                              <Send className="h-3 w-3" />
                              Envoyer
                            </Button>
                          </>
                        )}
                        {campaign.status === 'scheduled' && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                            <Clock className="h-3 w-3 mr-1" />
                            Programmée
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Campaigns;
