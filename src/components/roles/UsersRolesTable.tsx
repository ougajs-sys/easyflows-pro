import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Users,
  ShieldCheck,
  Eye,
  Truck,
  Phone,
  UserX,
  Loader2,
  CheckCircle2,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  administrateur: { label: 'Administrateur', icon: ShieldCheck, color: 'text-red-500', badgeVariant: 'destructive' },
  superviseur: { label: 'Superviseur', icon: Eye, color: 'text-purple-500', badgeVariant: 'secondary' },
  livreur: { label: 'Livreur', icon: Truck, color: 'text-blue-500', badgeVariant: 'default' },
  appelant: { label: 'Appelant', icon: Phone, color: 'text-green-500', badgeVariant: 'outline' },
};

export function UsersRolesTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const { users, isLoading, updateRole } = useUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    // Activation = role assigned/confirmed by admin (any role)
    const isActivated = !!user.role;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'activated' && isActivated) ||
      (statusFilter === 'pending' && !isActivated);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      await updateRole.mutateAsync({ userId, newRole });
      toast({
        title: 'Rôle mis à jour',
        description: `Le rôle a été changé en ${roleConfig[newRole].label}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le rôle',
        variant: 'destructive',
      });
    }
  };

  const handleActivateUser = async (userId: string, role: AppRole) => {
    try {
      await updateRole.mutateAsync({ userId, newRole: role });
      setActivatingUserId(null); // Close dialog
      toast({
        title: 'Compte activé',
        description: `L'utilisateur a été activé en tant que ${roleConfig[role].label}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'activer le compte',
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

  // Count users by activation status
  const pendingCount = users.filter((u) => !u.role).length;
  const activatedCount = users.filter((u) => !!u.role).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des Utilisateurs
        </CardTitle>
        <CardDescription>
          Activez les comptes et gérez les rôles des utilisateurs du système
        </CardDescription>
        
        {/* Status Summary */}
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Activés: {activatedCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span className="text-muted-foreground">En attente: {pendingCount}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par nom ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="activated">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Activés
                </div>
              </SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  En attente
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="administrateur">Administrateurs</SelectItem>
              <SelectItem value="superviseur">Superviseurs</SelectItem>
              <SelectItem value="livreur">Livreurs</SelectItem>
              <SelectItem value="appelant">Appelants</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <UserX className="h-12 w-12 mb-2" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Rôle actuel</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const config = user.role ? roleConfig[user.role] : null;
                  const RoleIcon = config?.icon || UserX;
                  const isActivated = !!user.role;
                  const isPending = !user.role;

                  return (
                    <TableRow key={user.id} className={isPending ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(user.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            {isActivated && (
                              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.profile?.full_name || 'Utilisateur'}
                            </p>
                            {user.id === currentUser?.id && (
                              <Badge variant="outline" className="text-xs">Vous</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.profile?.phone || '-'}
                      </TableCell>
                      <TableCell>
                        {isActivated ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Activé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-400 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            En attente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {config ? (
                          <Badge variant={config.badgeVariant} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Non défini
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Quick Activate Button for pending users */}
                          {isPending && user.id !== currentUser?.id && (
                            <AlertDialog 
                              open={activatingUserId === user.id} 
                              onOpenChange={(open) => setActivatingUserId(open ? user.id : null)}
                            >
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="default" className="gap-1">
                                  <UserCheck className="h-4 w-4" />
                                  Activer
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Activer le compte</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Choisissez le rôle pour activer le compte de{' '}
                                    <strong>{user.profile?.full_name || 'cet utilisateur'}</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid grid-cols-2 gap-3 py-4">
                                  <Button
                                    variant="outline"
                                    className="flex flex-col items-center gap-2 h-auto py-4 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950"
                                    onClick={() => handleActivateUser(user.id, 'superviseur')}
                                    disabled={updateRole.isPending}
                                  >
                                    <Eye className="h-6 w-6 text-purple-500" />
                                    <span>Superviseur</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="flex flex-col items-center gap-2 h-auto py-4 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    onClick={() => handleActivateUser(user.id, 'livreur')}
                                    disabled={updateRole.isPending}
                                  >
                                    <Truck className="h-6 w-6 text-blue-500" />
                                    <span>Livreur</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="flex flex-col items-center gap-2 h-auto py-4 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 col-span-2"
                                    onClick={() => handleActivateUser(user.id, 'appelant')}
                                    disabled={updateRole.isPending}
                                  >
                                    <Phone className="h-6 w-6 text-green-500" />
                                    <span>Appelant (Confirmé)</span>
                                  </Button>
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Role Change Dropdown */}
                          <Select
                            value={user.role || ''}
                            onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                            disabled={user.id === currentUser?.id || updateRole.isPending}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Changer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="administrateur">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-red-500" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="superviseur">
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-purple-500" />
                                  Superviseur
                                </div>
                              </SelectItem>
                              <SelectItem value="livreur">
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-blue-500" />
                                  Livreur
                                </div>
                              </SelectItem>
                              <SelectItem value="appelant">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-green-500" />
                                  Appelant
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
  );
}
