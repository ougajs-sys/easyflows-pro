import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoleRequests, RoleRequest } from '@/hooks/useRoleRequests';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Truck, Phone, Crown, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  administrateur: { label: 'Administrateur', icon: <Crown className="h-3 w-3" />, color: 'text-red-500' },
  superviseur: { label: 'Superviseur', icon: <Shield className="h-3 w-3" />, color: 'text-blue-500' },
  livreur: { label: 'Livreur', icon: <Truck className="h-3 w-3" />, color: 'text-green-500' },
  appelant: { label: 'Appelant', icon: <Phone className="h-3 w-3" />, color: 'text-amber-500' },
};

export function RoleRequestsTable() {
  const { pendingRequests, isLoading, reviewRequest } = useRoleRequests();
  const { toast } = useToast();

  const handleReview = async (request: RoleRequest, status: 'approved' | 'rejected') => {
    try {
      await reviewRequest.mutateAsync({
        requestId: request.id,
        status,
        userId: request.user_id,
        requestedRole: request.requested_role,
      });
      toast({
        title: status === 'approved' ? 'Demande approuvée' : 'Demande refusée',
        description: status === 'approved' 
          ? `L'utilisateur a été promu ${roleConfig[request.requested_role].label}.`
          : 'La demande a été refusée.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la demande.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Aucune demande en attente</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Rôle demandé</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingRequests.map((request) => {
            const roleInfo = roleConfig[request.requested_role];
            
            return (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        {getInitials(request.profile?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {request.profile?.full_name || 'Utilisateur'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.profile?.phone || '-'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    <span className={roleInfo.color}>{roleInfo.icon}</span>
                    {roleInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="text-sm text-muted-foreground truncate">
                    {request.reason || '-'}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleReview(request, 'approved')}
                      disabled={reviewRequest.isPending}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReview(request, 'rejected')}
                      disabled={reviewRequest.isPending}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
