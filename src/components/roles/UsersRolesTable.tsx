import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, ShieldCheck, Eye, Truck, Phone, UserX, Loader2 } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const { users, isLoading, updateRole } = useUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
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

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des Utilisateurs
        </CardTitle>
        <CardDescription>
          Gérez les rôles et permissions des utilisateurs du système
        </CardDescription>
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
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
                  <TableHead>Rôle actuel</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead>Modifier le rôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const config = user.role ? roleConfig[user.role] : null;
                  const RoleIcon = config?.icon || UserX;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(user.profile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
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
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || ''}
                          onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                          disabled={user.id === currentUser?.id || updateRole.isPending}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Choisir un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrateur">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-red-500" />
                                Administrateur
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
