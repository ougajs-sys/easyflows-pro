import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';

export function OrderStats() {
  const { orders } = useOrders();

  const stats = {
    total: orders.length,
    pending: orders.filter((o: any) => o.status === 'pending').length,
    inDelivery: orders.filter((o: any) => o.status === 'in_transit').length,
    delivered: orders.filter((o: any) => o.status === 'delivered').length,
    cancelled: orders.filter((o: any) => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter((o: any) => o.status === 'delivered')
      .reduce((sum: number, o: any) => sum + Number(o.amount_paid), 0),
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">commandes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En attente</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">à traiter</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En livraison</CardTitle>
          <Truck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.inDelivery}</div>
          <p className="text-xs text-muted-foreground">en cours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Livrées</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.delivered}</div>
          <p className="text-xs text-muted-foreground">complétées</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenus</CardTitle>
          <CheckCircle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">FCFA encaissés</p>
        </CardContent>
      </Card>
    </div>
  );
}
