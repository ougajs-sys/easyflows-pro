import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Crown, Shield, Truck, Phone } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';

export function UserStats() {
  const { users } = useUsers();

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'administrateur').length,
    supervisors: users.filter((u) => u.role === 'superviseur').length,
    deliverers: users.filter((u) => u.role === 'livreur').length,
    callers: users.filter((u) => u.role === 'appelant').length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">utilisateurs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
          <Crown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.admins}</div>
          <p className="text-xs text-muted-foreground">accès complet</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Superviseurs</CardTitle>
          <Shield className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.supervisors}</div>
          <p className="text-xs text-muted-foreground">gestion équipe</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Livreurs</CardTitle>
          <Truck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.deliverers}</div>
          <p className="text-xs text-muted-foreground">sur le terrain</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appelants</CardTitle>
          <Phone className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.callers}</div>
          <p className="text-xs text-muted-foreground">téléopérateurs</p>
        </CardContent>
      </Card>
    </div>
  );
}
