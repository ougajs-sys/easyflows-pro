import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowUpsTable } from '@/components/followups/FollowUpsTable';
import { FollowUpForm } from '@/components/followups/FollowUpForm';
import { FollowUpStats } from '@/components/followups/FollowUpStats';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Search, RefreshCw, Zap } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type FollowUpType = Database['public']['Enums']['followup_type'];
type FollowUpStatus = Database['public']['Enums']['followup_status'];

export default function FollowUps() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FollowUpType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'all'>('pending');
  const { generateAutoFollowUps } = useFollowUps();
  const { user } = useAuth();

  const handleGenerateFollowUps = async () => {
    if (!user) return;
    
    try {
      const result = await generateAutoFollowUps.mutateAsync(user.id);
      if (result.created > 0) {
        toast.success(`${result.created} relance(s) créée(s) automatiquement`);
      } else {
        toast.info('Aucune nouvelle relance à créer');
      }
    } catch (error) {
      toast.error('Erreur lors de la génération des relances');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relances</h1>
            <p className="text-muted-foreground">
              Gérez les relances clients pour paiements partiels et commandes reportées
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGenerateFollowUps}
              disabled={generateAutoFollowUps.isPending}
            >
              <Zap className="h-4 w-4 mr-2" />
              Générer auto
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle relance
            </Button>
          </div>
        </div>

        <FollowUpStats />

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Liste des relances</TabsTrigger>
            <TabsTrigger value="calendar">Vue calendrier</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FollowUpType | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="reminder">Rappel</SelectItem>
                  <SelectItem value="partial_payment">Paiement partiel</SelectItem>
                  <SelectItem value="rescheduled">Reportée</SelectItem>
                  <SelectItem value="retargeting">Retargeting</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FollowUpStatus | 'all')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="awaiting_validation">À valider</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Complétée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FollowUpsTable 
              searchQuery={searchQuery} 
              typeFilter={typeFilter}
              statusFilter={statusFilter}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <FollowUpCalendarView 
              searchQuery={searchQuery}
              typeFilter={typeFilter}
            />
          </TabsContent>
        </Tabs>

        <FollowUpForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      </div>
    </DashboardLayout>
  );
}

// Simple calendar view component
function FollowUpCalendarView({ searchQuery, typeFilter }: { searchQuery: string; typeFilter: string }) {
  const { followUps, isLoading } = useFollowUps();
  
  // Group by date
  const pendingFollowUps = followUps.filter(f => f.status === 'pending');
  const grouped = pendingFollowUps.reduce((acc, followUp) => {
    const date = new Date(followUp.scheduled_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(followUp);
    return acc;
  }, {} as Record<string, typeof followUps>);

  const sortedDates = Object.keys(grouped).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const today = new Date().toDateString();

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      {sortedDates.length === 0 ? (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          Aucune relance planifiée
        </div>
      ) : (
        sortedDates.map(date => {
          const isToday = date === today;
          const isPast = new Date(date) < new Date(today);
          
          return (
            <div 
              key={date} 
              className={`p-4 rounded-lg border ${
                isToday 
                  ? 'border-primary bg-primary/5' 
                  : isPast 
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-border'
              }`}
            >
              <h3 className={`font-semibold mb-3 ${isToday ? 'text-primary' : isPast ? 'text-destructive' : ''}`}>
                {isToday ? "Aujourd'hui" : new Date(date).toLocaleDateString('fr-FR', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
                {isPast && !isToday && <span className="text-xs ml-2">(En retard)</span>}
              </h3>
              <div className="space-y-2">
                {grouped[date].map(followUp => (
                  <div 
                    key={followUp.id} 
                    className="p-2 bg-background rounded border text-sm"
                  >
                    <div className="font-medium truncate">
                      {followUp.client?.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {followUp.client?.phone}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {grouped[date].length} relance(s)
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
