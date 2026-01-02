import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UserCheck, 
  Clock, 
  Check, 
  X, 
  Loader2, 
  ShieldCheck, 
  Eye, 
  Truck, 
  Phone,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useRoleRequests, RoleRequest } from '@/hooks/useRoleRequests';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  administrateur: { label: 'Administrateur', icon: ShieldCheck, color: 'text-red-500' },
  superviseur: { label: 'Superviseur', icon: Eye, color: 'text-purple-500' },
  livreur: { label: 'Livreur', icon: Truck, color: 'text-blue-500' },
  appelant: { label: 'Appelant', icon: Phone, color: 'text-green-500' },
};

export function RoleRequestsPanel() {
  const { allRequests, isLoading, reviewRequest } = useRoleRequests();
  const { toast } = useToast();

  const pendingRequests = allRequests?.filter(r => r.status === 'pending') || [];
  const processedRequests = allRequests?.filter(r => r.status !== 'pending') || [];

  const handleReview = async (request: RoleRequest, status: 'approved' | 'rejected') => {
    try {
      await reviewRequest.mutateAsync({ 
        requestId: request.id, 
        status,
        userId: request.user_id,
        requestedRole: request.requested_role,
      });
      toast({
        title: status === 'approved' ? 'Demande approuvée' : 'Demande rejetée',
        description: status === 'approved' 
          ? `L'utilisateur a reçu le rôle ${roleConfig[request.requested_role].label}`
          : 'La demande a été rejetée',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la demande',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Demandes en Attente
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Demandes de changement de rôle en attente d'approbation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mb-2 text-green-500" />
              <p>Aucune demande en attente</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle demandé</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => {
                    const config = roleConfig[request.requested_role];
                    const RoleIcon = config.icon;

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={request.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(request.profile?.full_name || null)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {request.profile?.full_name || 'Utilisateur'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.profile?.phone || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${config.color}`}>
                            <RoleIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {request.reason || 'Aucune raison fournie'}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleReview(request, 'approved')}
                              disabled={reviewRequest.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReview(request, 'rejected')}
                              disabled={reviewRequest.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Historique des Demandes
          </CardTitle>
          <CardDescription>
            Demandes traitées (approuvées ou rejetées)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2" />
              <p>Aucun historique disponible</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle demandé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de demande</TableHead>
                    <TableHead>Date de traitement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.slice(0, 10).map((request) => {
                    const config = roleConfig[request.requested_role];
                    const RoleIcon = config.icon;

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={request.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(request.profile?.full_name || null)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {request.profile?.full_name || 'Utilisateur'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${config.color}`}>
                            <RoleIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.status === 'approved' ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approuvée
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejetée
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(request.created_at), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {request.reviewed_at 
                            ? format(new Date(request.reviewed_at), 'dd MMM yyyy', { locale: fr })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
