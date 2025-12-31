import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Shield, Truck, Phone, Crown } from 'lucide-react';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
  administrateur: { label: 'Administrateur', variant: 'destructive', icon: <Crown className="h-3 w-3" />, color: 'text-red-500' },
  superviseur: { label: 'Superviseur', variant: 'default', icon: <Shield className="h-3 w-3" />, color: 'text-blue-500' },
  livreur: { label: 'Livreur', variant: 'secondary', icon: <Truck className="h-3 w-3" />, color: 'text-green-500' },
  appelant: { label: 'Appelant', variant: 'outline', icon: <Phone className="h-3 w-3" />, color: 'text-amber-500' },
};

interface UsersTableProps {
  searchQuery: string;
  roleFilter: AppRole | 'all';
}

export function UsersTable({ searchQuery, roleFilter }: UsersTableProps) {
  const { users, isLoading, updateRole } = useUsers();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profile?.phone?.includes(searchQuery);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      await updateRole.mutateAsync({ userId, newRole });
      toast({
        title: 'Rôle mis à jour',
        description: `L'utilisateur a été promu ${roleConfig[newRole].label}.`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le rôle.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Rôle actuel</TableHead>
            <TableHead>Date d'inscription</TableHead>
            <TableHead>Changer le rôle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => {
              const roleInfo = user.role ? roleConfig[user.role] : null;
              const isCurrentUser = user.id === currentUser?.id;
              
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10">
                          {getInitials(user.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.profile?.full_name || 'Utilisateur'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(vous)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.profile?.phone || '-'}
                  </TableCell>
                  <TableCell>
                    {roleInfo ? (
                      <Badge variant={roleInfo.variant} className="gap-1">
                        {roleInfo.icon}
                        {roleInfo.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Aucun rôle</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role || ''}
                      onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                      disabled={isCurrentUser || updateRole.isPending}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Choisir un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appelant">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-amber-500" />
                            Appelant
                          </div>
                        </SelectItem>
                        <SelectItem value="livreur">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-500" />
                            Livreur
                          </div>
                        </SelectItem>
                        <SelectItem value="superviseur">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            Superviseur
                          </div>
                        </SelectItem>
                        <SelectItem value="administrateur">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-red-500" />
                            Administrateur
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
