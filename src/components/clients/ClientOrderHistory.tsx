import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Package, Calendar, Truck, CreditCard, MapPin, Phone, User, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

interface ClientOrderHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const statusLabels: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'outline' },
  confirmed: { label: 'Confirmée', variant: 'secondary' },
  in_transit: { label: 'En livraison', variant: 'default' },
  delivered: { label: 'Livrée', variant: 'default' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
  reported: { label: 'Reportée', variant: 'destructive' },
  partial: { label: 'Partielle', variant: 'secondary' },
};

const segmentLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'text-blue-500' },
  regular: { label: 'Régulier', color: 'text-green-500' },
  vip: { label: 'VIP', color: 'text-yellow-500' },
  inactive: { label: 'Inactif', color: 'text-muted-foreground' },
};

export function ClientOrderHistory({ open, onOpenChange, client }: ClientOrderHistoryProps) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['client-orders', client?.id],
    queryFn: async () => {
      if (!client) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(name)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!client,
  });

  if (!client) return null;

  const segment = segmentLabels[client.segment] || segmentLabels.new;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {client.full_name}
            {client.segment === 'vip' && <Crown className="h-4 w-4 text-yellow-500" />}
          </DialogTitle>
          <DialogDescription>
            Historique des commandes et informations client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info Card */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                  {client.phone_secondary && (
                    <span className="text-muted-foreground">/ {client.phone_secondary}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={segment.color}>
                    {segment.label}
                  </Badge>
                </div>
                {client.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{client.city}{client.zone && ` - ${client.zone}`}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{client.total_orders} commandes</span>
                </div>
              </div>
              {client.address && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <strong>Adresse :</strong> {client.address}
                </div>
              )}
              {client.notes && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <strong>Notes :</strong> {client.notes}
                </div>
              )}
              <Separator className="my-3" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total dépensé</span>
                <span className="text-lg font-bold text-primary">
                  {Number(client.total_spent).toLocaleString()} DH
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <div>
            <h3 className="font-semibold mb-3">Historique des commandes</h3>
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune commande pour ce client
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Card key={order.id} className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{order.order_number}</span>
                              <Badge variant={statusLabels[order.status].variant}>
                                {statusLabels[order.status].label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {order.product?.name || 'Produit inconnu'}
                              </span>
                              <span>x{order.quantity}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{Number(order.total_amount).toLocaleString()} DH</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                              <CreditCard className="h-3 w-3" />
                              Payé: {Number(order.amount_paid).toLocaleString()} DH
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
