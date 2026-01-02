import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientStats } from '@/components/clients/ClientStats';
import { Plus, Search } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type ClientSegment = Database['public']['Enums']['client_segment'];

export default function Clients() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<ClientSegment | 'all'>('all');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">
              Gérez vos clients et suivez leur historique
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        </div>

        <ClientStats />

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={segmentFilter} onValueChange={(v) => setSegmentFilter(v as ClientSegment | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les segments</SelectItem>
              <SelectItem value="new">Nouveaux</SelectItem>
              <SelectItem value="regular">Réguliers</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ClientsTable searchQuery={searchQuery} segmentFilter={segmentFilter} />

        <ClientForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      </div>
    </DashboardLayout>
  );
}
