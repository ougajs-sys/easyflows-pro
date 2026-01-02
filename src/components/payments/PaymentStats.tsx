import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';

export function PaymentStats() {
  const { payments, pendingOrders, isLoading } = usePayments();

  const stats = {
    totalReceived: payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0),
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    completedToday: payments.filter(p => {
      const today = new Date().toDateString();
      return p.status === 'completed' && new Date(p.created_at).toDateString() === today;
    }).length,
    totalDue: pendingOrders.reduce((sum, o) => sum + Number(o.amount_due || 0), 0),
  };

  const statCards = [
    {
      title: 'Total reçu',
      value: `${stats.totalReceived.toLocaleString()} DH`,
      icon: CreditCard,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Paiements complétés (Auj.)',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'En attente',
      value: stats.pendingPayments,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Montant dû total',
      value: `${stats.totalDue.toLocaleString()} DH`,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
