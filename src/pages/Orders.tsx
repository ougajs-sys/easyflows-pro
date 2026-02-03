import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderForm } from '@/components/orders/OrderForm';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderStats } from '@/components/orders/OrderStats';
import { ConfirmedOrdersDispatch } from '@/components/supervisor/ConfirmedOrdersDispatch';
import { RecentOrders } from '@/components/supervisor/RecentOrders';
import { Plus, Search, Send, Clock, List } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type OrderStatus = Database['public']['Enums']['order_status'];

export default function Orders() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('dispatch');
  const { role } = useAuth();

  const isSupervisor = role === 'superviseur' || role === 'administrateur';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isSupervisor ? 'Gestion des Commandes' : 'Commandes'}
            </h1>
            <p className="text-muted-foreground">
              {isSupervisor 
                ? 'Distribuez et gérez les commandes en temps réel' 
                : 'Gérez les commandes et suivez les livraisons'}
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle commande
          </Button>
        </div>

        {/* Statistiques */}
        <OrderStats />

        {/* Onglets pour superviseurs */}
        {isSupervisor ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dispatch" className="gap-2">
                <Send className="w-4 h-4" />
                À Distribuer
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-2">
                <Clock className="w-4 h-4" />
                Récentes
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <List className="w-4 h-4" />
                Toutes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dispatch" className="mt-6">
              <ConfirmedOrdersDispatch />
            </TabsContent>

            <TabsContent value="recent" className="mt-6">
              <RecentOrders />
            </TabsContent>

            <TabsContent value="all" className="mt-6 space-y-4">
              {/* Filtres */}
              <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une commande..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmées</SelectItem>
                    <SelectItem value="in_transit">En livraison</SelectItem>
                    <SelectItem value="delivered">Livrées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                    <SelectItem value="reported">Reportées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <OrdersTable searchQuery={searchQuery} statusFilter={statusFilter} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Vue standard pour les appelants */
          <>
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une commande..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmées</SelectItem>
                  <SelectItem value="in_transit">En livraison</SelectItem>
                  <SelectItem value="delivered">Livrées</SelectItem>
                  <SelectItem value="cancelled">Annulées</SelectItem>
                  <SelectItem value="reported">Reportées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <OrdersTable searchQuery={searchQuery} statusFilter={statusFilter} />
          </>
        )}

        <OrderForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      </div>
    </DashboardLayout>
  );
}
