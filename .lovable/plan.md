
# Plan : Reorganisation du Tableau de Bord Superviseur et de l'Espace Commandes

## Objectif

Transformer l'architecture des pages superviseur :
- **Tableau de bord** : Espace de suivi des indicateurs (KPI, performances, statistiques)
- **Espace Commandes** : Espace operationnel (distribution, gestion, actions sur les commandes)

## Corrections Prealables

### Erreur de Build a Corriger

Le fichier `src/hooks/useOrders.tsx` contient une erreur de typage :

```text
error TS2352: Type 'delivery_person.profile' is incompatible
"could not find the relation between delivery_persons and profiles"
```

**Cause** : La table `delivery_persons` n'a pas de relation directe avec `profiles` dans la base de donnees. La requete imbriquee `profile:profiles(full_name)` echoue.

**Solution** : Modifier la requete pour recuperer les profils separement, comme fait dans `ConfirmedOrdersDispatch.tsx` et `RecentOrders.tsx`.

---

## Modifications a Effectuer

### 1. Fichier `src/hooks/useOrders.tsx`

**Avant (ligne 28-39)** :
```typescript
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    client:clients(id, full_name, phone),
    product:products(id, name, price),
    delivery_person:delivery_persons(id, user_id, status, profile:profiles(full_name))
  `)
```

**Apres** :
```typescript
// Etape 1: Recuperer les commandes avec delivery_persons (sans profiles)
const { data: ordersData, error } = await supabase
  .from('orders')
  .select(`
    *,
    client:clients(id, full_name, phone),
    product:products(id, name, price),
    delivery_person:delivery_persons(id, user_id, status)
  `)
  .order('created_at', { ascending: false });

if (error) throw error;

// Etape 2: Recuperer les profils des livreurs separement
const deliveryUserIds = ordersData
  ?.filter(o => o.delivery_person?.user_id)
  .map(o => o.delivery_person!.user_id) || [];

let profilesMap: Record<string, string> = {};
if (deliveryUserIds.length > 0) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', [...new Set(deliveryUserIds)]);

  profilesMap = profiles?.reduce((acc, p) => {
    acc[p.id] = p.full_name || 'Inconnu';
    return acc;
  }, {} as Record<string, string>) || {};
}

// Etape 3: Fusionner les donnees
return ordersData?.map(order => ({
  ...order,
  delivery_person: order.delivery_person ? {
    ...order.delivery_person,
    profile: order.delivery_person.user_id 
      ? { full_name: profilesMap[order.delivery_person.user_id] || null }
      : null
  } : null
})) as OrderWithRelations[];
```

---

### 2. Fichier `src/pages/SupervisorDashboard.tsx`

**Retirer les composants operationnels** :
- Supprimer `ConfirmedOrdersDispatch`
- Supprimer `RecentOrders`

**Nouvelle structure** :
```typescript
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeliveryPerformance } from "@/components/supervisor/DeliveryPerformance";
import { CallerPerformance } from "@/components/supervisor/CallerPerformance";
import { SalesSummary } from "@/components/supervisor/SalesSummary";
import { SupervisorStats } from "@/components/supervisor/SupervisorStats";
import { DeliveryStatus } from "@/components/dashboard/DeliveryStatus";
import { StockOverviewPanel } from "@/components/supervisor/StockOverviewPanel";
import { ConnectedWorkers } from "@/components/supervisor/ConnectedWorkers";

export default function SupervisorDashboard() {
  return (
    <DashboardLayout>
      {/* En-tete */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Tableau de Bord</span> Superviseur
        </h1>
        <p className="text-muted-foreground">
          Suivi des indicateurs et performances
        </p>
      </div>

      {/* Statistiques */}
      <SupervisorStats />

      {/* Travailleurs connectes */}
      <div className="mt-6">
        <ConnectedWorkers />
      </div>

      {/* Vue Stock */}
      <div className="mt-6">
        <StockOverviewPanel />
      </div>

      {/* Grille Performances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DeliveryPerformance />
        <DeliveryStatus />
      </div>

      {/* Performance Appelants */}
      <div className="mt-6">
        <CallerPerformance />
      </div>

      {/* Resume Ventes */}
      <div className="mt-6">
        <SalesSummary />
      </div>
    </DashboardLayout>
  );
}
```

---

### 3. Fichier `src/pages/Orders.tsx`

**Ajouter les composants operationnels deplacent du tableau de bord** :
- Ajouter `ConfirmedOrdersDispatch` (commandes a distribuer)
- Ajouter `RecentOrders` (commandes recentes avec actions rapides)

**Nouvelle structure** :
```typescript
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
        {/* En-tete */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isSupervisor ? 'Gestion des Commandes' : 'Commandes'}
            </h1>
            <p className="text-muted-foreground">
              {isSupervisor 
                ? 'Distribuez et gerez les commandes en temps reel' 
                : 'Gerez les commandes et suivez les livraisons'}
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
                A Distribuer
              </TabsTrigger>
              <TabsTrigger value="recent" className="gap-2">
                <Clock className="w-4 h-4" />
                Recentes
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
                    <SelectItem value="confirmed">Confirmees</SelectItem>
                    <SelectItem value="in_transit">En livraison</SelectItem>
                    <SelectItem value="delivered">Livrees</SelectItem>
                    <SelectItem value="cancelled">Annulees</SelectItem>
                    <SelectItem value="reported">Reportees</SelectItem>
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
                  <SelectItem value="confirmed">Confirmees</SelectItem>
                  <SelectItem value="in_transit">En livraison</SelectItem>
                  <SelectItem value="delivered">Livrees</SelectItem>
                  <SelectItem value="cancelled">Annulees</SelectItem>
                  <SelectItem value="reported">Reportees</SelectItem>
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
```

---

## Resume des Changements

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useOrders.tsx` | Corriger la requete pour recuperer les profils livreurs separement (fix erreur de build) |
| `src/pages/SupervisorDashboard.tsx` | Retirer `ConfirmedOrdersDispatch` et `RecentOrders` - focus sur les indicateurs |
| `src/pages/Orders.tsx` | Ajouter onglets avec `ConfirmedOrdersDispatch`, `RecentOrders`, et table complete pour superviseurs |

---

## Nouvelle Architecture

```text
TABLEAU DE BORD SUPERVISEUR (/supervisor)
+------------------------------------------+
|  Indicateurs (SupervisorStats)           |
|  Travailleurs connectes                  |
|  Vue Stock                               |
|  Performances Livreurs / Statut          |
|  Performances Appelants                  |
|  Resume Ventes                           |
+------------------------------------------+

ESPACE COMMANDES (/orders) - SUPERVISEUR
+------------------------------------------+
|  [A Distribuer] [Recentes] [Toutes]      |
|                                          |
|  Onglet 1: Commandes confirmees          |
|            a assigner aux livreurs       |
|                                          |
|  Onglet 2: Commandes recentes            |
|            avec actions rapides          |
|                                          |
|  Onglet 3: Tableau complet               |
|            avec recherche/filtres        |
+------------------------------------------+

ESPACE COMMANDES (/orders) - APPELANT
+------------------------------------------+
|  Statistiques                            |
|  Recherche + Filtres                     |
|  Tableau des commandes                   |
+------------------------------------------+
```

---

## Impact

1. **Tableau de bord** devient un espace de monitoring pur (KPIs, graphiques, performances)
2. **Espace Commandes** devient le centre operationnel pour la distribution et la gestion
3. **Experience utilisateur** amelioree avec des onglets dedies pour chaque action
4. **Erreur de build** corrigee en modifiant la requete Supabase
