import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Eye, Pencil, Trash2, Phone } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { ClientForm } from './ClientForm';
import { ClientOrderHistory } from './ClientOrderHistory';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientSegment = Database['public']['Enums']['client_segment'];

interface ClientsTableProps {
  searchQuery: string;
  segmentFilter: ClientSegment | 'all';
}

const segmentLabels: Record<ClientSegment, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Nouveau', variant: 'outline' },
  regular: { label: 'Régulier', variant: 'secondary' },
  vip: { label: 'VIP', variant: 'default' },
  inactive: { label: 'Inactif', variant: 'destructive' },
  problematic: { label: 'Problématique', variant: 'destructive' },
};

export function ClientsTable({ searchQuery, segmentFilter }: ClientsTableProps) {
  const { clients, isLoading, deleteClient } = useClients();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.zone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSegment = segmentFilter === 'all' || client.segment === segmentFilter;

    return matchesSearch && matchesSegment;
  });

  const handleDelete = async () => {
    if (!deletingClient) return;
    
    try {
      await deleteClient.mutateAsync(deletingClient.id);
      toast.success('Client supprimé avec succès');
      setDeletingClient(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression du client');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville / Zone</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Commandes</TableHead>
                  <TableHead className="text-right">Total dépensé</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun client trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {client.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{client.city || '-'}</div>
                          {client.zone && (
                            <div className="text-muted-foreground text-xs">{client.zone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={segmentLabels[client.segment].variant}>
                          {segmentLabels[client.segment].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{client.total_orders}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(client.total_spent).toLocaleString()} DH
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingClient(client)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir historique
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingClient(client)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingClient(client)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ClientForm
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        client={editingClient}
      />

      {/* Order History Dialog */}
      <ClientOrderHistory
        open={!!viewingClient}
        onOpenChange={(open) => !open && setViewingClient(null)}
        client={viewingClient}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client "{deletingClient?.full_name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
