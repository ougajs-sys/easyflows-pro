import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UsersTable } from '@/components/admin/UsersTable';
import { UserStats } from '@/components/admin/UserStats';
import { Search, Crown, Shield, Truck, Phone } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export default function Admin() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs et leurs rôles d'accès
          </p>
        </div>

        <UserStats />

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="administrateur">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-red-500" />
                  Administrateurs
                </div>
              </SelectItem>
              <SelectItem value="superviseur">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Superviseurs
                </div>
              </SelectItem>
              <SelectItem value="livreur">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-500" />
                  Livreurs
                </div>
              </SelectItem>
              <SelectItem value="appelant">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-amber-500" />
                  Appelants
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <UsersTable searchQuery={searchQuery} roleFilter={roleFilter} />
      </div>
    </DashboardLayout>
  );
}
