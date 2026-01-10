import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Package, Truck, Clock, CheckCircle, XCircle, 
  ArrowRight, PackageCheck, Send 
} from 'lucide-react';
import { useSupplyRequests } from '@/hooks/useSupplyRequests';
import { useProducts } from '@/hooks/useProducts';
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

interface SupplyRequestsPanelProps {
  isDeliveryPerson?: boolean;
  deliveryPersonId?: string;
}

export function SupplyRequestsPanel({ isDeliveryPerson = false, deliveryPersonId }: SupplyRequestsPanelProps) {
  const { 
    requests, 
    isLoading, 
    createRequest, 
    reviewRequest, 
    fulfillRequest,
    cancelRequest,
    pendingCount,
    approvedCount 
  } = useSupplyRequests();
  const { products } = useProducts();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    productId: '',
    quantity: 1,
    reason: '',
  });
  const [reviewData, setReviewData] = useState<{
    requestId: string;
    quantityApproved: number;
    notes: string;
  } | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const historyRequests = requests.filter(r => r.status === 'fulfilled' || r.status === 'rejected');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Rejetée</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30"><PackageCheck className="h-3 w-3 mr-1" />Exécutée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateRequest = () => {
    createRequest.mutate({
      productId: newRequest.productId,
      requesterType: isDeliveryPerson ? 'delivery_person' : 'warehouse',
      deliveryPersonId: deliveryPersonId,
      quantityRequested: newRequest.quantity,
      reason: newRequest.reason,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setNewRequest({ productId: '', quantity: 1, reason: '' });
      }
    });
  };

  const handleReview = (status: 'approved' | 'rejected') => {
    if (reviewData) {
      reviewRequest.mutate({
        requestId: reviewData.requestId,
        status,
        quantityApproved: status === 'approved' ? reviewData.quantityApproved : undefined,
        notes: reviewData.notes,
      }, {
        onSuccess: () => setReviewData(null)
      });
    }
  };

  if (isLoading) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Demandes d'approvisionnement
            </CardTitle>
            <CardDescription>
              {isDeliveryPerson 
                ? 'Demandez du stock au bureau' 
                : 'Gérez les demandes de réapprovisionnement'
              }
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {pendingCount} en attente
              </Badge>
            )}
            {approvedCount > 0 && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {approvedCount} à exécuter
              </Badge>
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle demande d'approvisionnement</DialogTitle>
                  <DialogDescription>
                    Sélectionnez le produit et la quantité souhaitée
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
                            {product.name} (Stock: {product.stock})
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
                      placeholder="Ex: Stock épuisé, forte demande..."
                    />
                  </div>
                  <Button
                    onClick={handleCreateRequest}
                    disabled={!newRequest.productId || createRequest.isPending}
                    className="w-full"
                  >
                    Envoyer la demande
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              À exécuter ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ScrollArea className="h-[350px]">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune demande en attente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {request.requester_type === 'warehouse' ? (
                            <Package className="h-5 w-5 mt-0.5 text-primary" />
                          ) : (
                            <Truck className="h-5 w-5 mt-0.5 text-success" />
                          )}
                          <div>
                            <h4 className="font-medium">{request.product?.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Quantité demandée: <span className="font-semibold text-foreground">{request.quantity_requested}</span>
                            </p>
                            {request.reason && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Raison: {request.reason}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(request.status)}
                          {!isDeliveryPerson ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReviewData({
                                    requestId: request.id,
                                    quantityApproved: request.quantity_requested,
                                    notes: '',
                                  })}
                                >
                                  Traiter
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Traiter la demande</DialogTitle>
                                  <DialogDescription>
                                    {request.product?.name} - {request.quantity_requested} unités
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Quantité approuvée</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={request.product?.stock}
                                      value={reviewData?.quantityApproved || request.quantity_requested}
                                      onChange={(e) => setReviewData(prev => prev ? {
                                        ...prev,
                                        quantityApproved: parseInt(e.target.value) || 0,
                                      } : null)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Stock disponible: {request.product?.stock}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                      value={reviewData?.notes || ''}
                                      onChange={(e) => setReviewData(prev => prev ? {
                                        ...prev,
                                        notes: e.target.value,
                                      } : null)}
                                      placeholder="Notes optionnelles..."
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleReview('approved')}
                                      disabled={reviewRequest.isPending}
                                      className="flex-1"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approuver
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleReview('rejected')}
                                      disabled={reviewRequest.isPending}
                                      className="flex-1"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Rejeter
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelRequest.mutate(request.id)}
                              disabled={cancelRequest.isPending}
                            >
                              Annuler
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="approved">
            <ScrollArea className="h-[350px]">
              {approvedRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune demande à exécuter</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvedRequests.map((request) => (
                    <div key={request.id} className="p-4 rounded-lg border border-success/30 bg-success/5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <ArrowRight className="h-5 w-5 mt-0.5 text-success" />
                          <div>
                            <h4 className="font-medium">{request.product?.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Quantité approuvée: <span className="font-semibold text-success">{request.quantity_approved || request.quantity_requested}</span>
                            </p>
                            {request.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Notes: {request.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Approuvée {formatDistanceToNow(new Date(request.reviewed_at || request.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                        {!isDeliveryPerson && (
                          <Button
                            size="sm"
                            onClick={() => fulfillRequest.mutate(request.id)}
                            disabled={fulfillRequest.isPending}
                          >
                            <PackageCheck className="h-4 w-4 mr-2" />
                            Exécuter
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[350px]">
              {historyRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <PackageCheck className="h-12 w-12 mb-4 opacity-50" />
                  <p>Aucun historique</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyRequests.slice(0, 20).map((request) => (
                    <div key={request.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {request.requester_type === 'warehouse' ? (
                            <Package className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          ) : (
                            <Truck className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          )}
                          <div>
                            <h4 className="font-medium">{request.product?.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {request.status === 'fulfilled' 
                                ? `${request.quantity_approved || request.quantity_requested} unités transférées`
                                : 'Demande rejetée'
                              }
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(request.fulfilled_at || request.reviewed_at || request.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
