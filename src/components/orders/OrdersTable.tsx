import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Truck, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type OrderStatus = Database['public']['Enums']['order_status'];

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'En attente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: 'Confirmée', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  in_transit: { label: 'En livraison', variant: 'outline', icon: <Truck className="h-3 w-3" /> },
  delivered: { label: 'Livrée', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Annulée', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  reported: { label: 'Reportée', variant: 'secondary', icon: <AlertTriangle className="h-3 w-3" /> },
  partial: { label: 'Partielle', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
};

interface OrdersTableProps {
  searchQuery: string;
  statusFilter: OrderStatus | 'all';
}

export function OrdersTable({ searchQuery, statusFilter }: OrdersTableProps) {
  const { orders, isLoading, updateOrderStatus } = useOrders();
  const { toast } = useToast();

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status: newStatus });
      toast({
        title: 'Statut mis à jour',
        description: `La commande a été mise à jour.`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Livreur</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Aucune commande trouvée
              </TableCell>
            </TableRow>
          ) : (
            filteredOrders.map((order: any) => {
              const status = statusConfig[order.status as OrderStatus];
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.order_number || '-'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.client?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{order.client?.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{order.product?.name}</div>
                      <div className="text-sm text-muted-foreground">x{order.quantity}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <div className="font-medium">{Number(order.total_amount).toLocaleString()} FCFA</div>
                      {Number(order.amount_due) > 0 && (
                        <div className="text-sm text-destructive">
                          Dû: {Number(order.amount_due).toLocaleString()} FCFA
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      {status.icon}
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.delivery_person?.full_name || (
                      <span className="text-muted-foreground text-sm">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'confirmed')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'in_transit')}>
                          <Truck className="h-4 w-4 mr-2" />
                          En livraison
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'delivered')}>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          Livrée
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'reported')}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Reporter
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
