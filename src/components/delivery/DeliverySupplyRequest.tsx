import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Clock, CheckCircle, XCircle, PackageCheck, Send, AlertTriangle, Package 
} from 'lucide-react';
import { useSupplyRequests } from '@/hooks/useSupplyRequests';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { useProducts } from '@/hooks/useProducts';
import { useDeliveryPerson } from '@/hooks/useDeliveryPerson';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

export function DeliverySupplyRequest() {
  const { deliveryProfile } = useDeliveryPerson();
  const { alerts } = useStockAlerts('delivery_person');
  const { products } = useProducts();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    productId: '',
    quantity: 1,
    reason: '',
  });

  // Fetch requests for this delivery person
  useEffect(() => {
    if (!deliveryProfile) return;

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('supply_requests')
        .select(`
          *,
          product:products(id, name, price, stock)
        `)
        .eq('delivery_person_id', deliveryProfile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
      setIsLoading(false);
    };

    fetchRequests();

    // Realtime subscription
    const channel = supabase
      .channel('delivery-supply-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supply_requests',
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryProfile]);

  // Filter my alerts
  const myAlerts = alerts.filter(a => a.delivery_person_id === deliveryProfile?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Rejetée</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30"><PackageCheck className="h-3 w-3 mr-1" />Reçue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateRequest = async () => {
    if (!deliveryProfile) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('supply_requests')
      .insert({
        product_id: newRequest.productId,
        requested_by: user.id,
        requester_type: 'delivery_person',
        delivery_person_id: deliveryProfile.id,
        quantity_requested: newRequest.quantity,
        reason: newRequest.reason || null,
      });

    if (!error) {
      setIsCreateOpen(false);
      setNewRequest({ productId: '', quantity: 1, reason: '' });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    await supabase
      .from('supply_requests')
      .update({
        status: 'rejected',
        notes: 'Annulée par le livreur',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const recentHistory = requests.filter(r => r.status === 'fulfilled' || r.status === 'rejected').slice(0, 10);

  if (isLoading || !deliveryProfile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertes de stock personnel */}
      {myAlerts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alertes de stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.severity === 'critical' 
                      ? 'bg-destructive/10 border border-destructive/30' 
                      : 'bg-warning/10 border border-warning/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className={`h-4 w-4 ${
                      alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{alert.product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Reste: {alert.current_quantity} (seuil: {alert.threshold})
                      </p>
                    </div>
                  </div>
                  <Badge className={alert.severity === 'critical' ? 'bg-destructive' : 'bg-warning'}>
                    {alert.severity === 'critical' ? 'Critique' : 'Bas'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demandes d'approvisionnement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Mes demandes de stock
              </CardTitle>
              <CardDescription>
                Demandez des produits au bureau
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Demander
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demander du stock</DialogTitle>
                  <DialogDescription>
                    Envoyez une demande au bureau pour recevoir des produits
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Produit</Label>
                    <Select
                      value={newRequest.productId}
                      onValueChange={(v) => setNewRequest(prev => ({ ...prev, productId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantité demandée</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newRequest.quantity}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Raison (optionnel)</Label>
                    <Textarea
                      value={newRequest.reason}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Ex: Stock épuisé, forte demande zone..."
                    />
                  </div>
                  <Button
                    onClick={handleCreateRequest}
                    disabled={!newRequest.productId}
                    className="w-full"
                  >
                    Envoyer la demande
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {/* En attente */}
              {pendingRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">En attente</h3>
                  <div className="space-y-2">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{request.product?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {request.quantity_requested} unités • {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(request.status)}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelRequest(request.id)}
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approuvées */}
              {approvedRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-success mb-2">Approuvées (à récupérer)</h3>
                  <div className="space-y-2">
                    {approvedRequests.map((request) => (
                      <div key={request.id} className="p-3 rounded-lg border border-success/30 bg-success/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{request.product?.name}</p>
                            <p className="text-sm text-success">
                              {request.quantity_approved || request.quantity_requested} unités approuvées
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique */}
              {recentHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Historique récent</h3>
                  <div className="space-y-2">
                    {recentHistory.map((request) => (
                      <div key={request.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{request.product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.status === 'fulfilled' 
                                ? `${request.quantity_approved || request.quantity_requested} unités reçues`
                                : 'Rejetée'
                              }
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingRequests.length === 0 && approvedRequests.length === 0 && recentHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Send className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune demande</p>
                  <p className="text-sm">Créez votre première demande de stock</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
