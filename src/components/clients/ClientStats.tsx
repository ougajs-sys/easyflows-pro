import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Crown, UserX } from 'lucide-react';
import { useClients } from '@/hooks/useClients';

export function ClientStats() {
  const { clients, isLoading } = useClients();

  const stats = {
    total: clients.length,
    new: clients.filter(c => c.segment === 'new').length,
    regular: clients.filter(c => c.segment === 'regular').length,
    vip: clients.filter(c => c.segment === 'vip').length,
    inactive: clients.filter(c => c.segment === 'inactive').length,
    totalSpent: clients.reduce((sum, c) => sum + Number(c.total_spent), 0),
  };

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Nouveaux',
      value: stats.new,
      icon: UserCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Réguliers',
      value: stats.regular,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'VIP',
      value: stats.vip,
      icon: Crown,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
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
              <div className="h-8 bg-muted rounded w-16" />
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
