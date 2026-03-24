import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function OrderStats() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    enabled: !!user,
    queryFn: async () => {
      const [totalRes, pendingRes, inTransitRes, deliveredRes, cancelledRes, revenueRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'in_transit'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('orders').select('amount_paid').eq('status', 'delivered'),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((sum, o) => sum + Number(o.amount_paid), 0);

      return {
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        inDelivery: inTransitRes.count || 0,
        delivered: deliveredRes.count || 0,
        cancelled: cancelledRes.count || 0,
        totalRevenue,
      };
    },
    refetchInterval: 30000,
  });

  const s = stats || { total: 0, pending: 0, inDelivery: 0, delivered: 0, cancelled: 0, totalRevenue: 0 };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.total.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">commandes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En attente</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.pending.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">à traiter</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En livraison</CardTitle>
          <Truck className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.inDelivery.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">en cours</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Livrées</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.delivered.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">complétées</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenus</CardTitle>
          <CheckCircle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{s.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">FCFA encaissés</p>
        </CardContent>
      </Card>
    </div>
  );
}
