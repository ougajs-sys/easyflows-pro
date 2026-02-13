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
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, CheckCircle, XCircle, Phone, Calendar, Package, Trash2, MessageSquare, UserCheck } from 'lucide-react';
import { useFollowUps } from '@/hooks/useFollowUps';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ValidateFollowUpDialog } from './ValidateFollowUpDialog';

type FollowUpType = Database['public']['Enums']['followup_type'];
type FollowUpStatus = Database['public']['Enums']['followup_status'];

interface FollowUpsTableProps {
  searchQuery: string;
  typeFilter: FollowUpType | 'all';
  statusFilter: FollowUpStatus | 'all';
}

const typeLabels: Record<FollowUpType, { label: string; color: string }> = {
  reminder: { label: 'Rappel', color: 'bg-blue-500/10 text-blue-500' },
  partial_payment: { label: 'Paiement partiel', color: 'bg-orange-500/10 text-orange-500' },
  rescheduled: { label: 'Reportée', color: 'bg-purple-500/10 text-purple-500' },
  retargeting: { label: 'Retargeting', color: 'bg-pink-500/10 text-pink-500' },
};

const statusLabels: Record<FollowUpStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  awaiting_validation: { label: 'À valider', variant: 'secondary' },
  pending: { label: 'En attente', variant: 'outline' },
  completed: { label: 'Complétée', variant: 'default' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
};

export function FollowUpsTable({ searchQuery, typeFilter, statusFilter }: FollowUpsTableProps) {
  const { followUps, isLoading, completeFollowUp, cancelFollowUp, deleteFollowUp } = useFollowUps();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingFollowUp, setCompletingFollowUp] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedForValidation, setSelectedForValidation] = useState<string[]>([]);
  const [showValidateDialog, setShowValidateDialog] = useState(false);

  const filteredFollowUps = followUps.filter((followUp) => {
    const clientName = followUp.client?.full_name || '';
    const clientPhone = followUp.client?.phone || '';
    const orderNumber = followUp.order?.order_number || '';
    
    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientPhone.includes(searchQuery) ||
      orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || followUp.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || followUp.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleComplete = async () => {
    if (!completingFollowUp) return;
    
    try {
      await completeFollowUp.mutateAsync({ 
        id: completingFollowUp, 
        notes: completionNotes || undefined 
      });
      toast.success('Relance marquée comme complétée');
      setCompletingFollowUp(null);
      setCompletionNotes('');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelFollowUp.mutateAsync(id);
      toast.success('Relance annulée');
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      await deleteFollowUp.mutateAsync(deletingId);
      toast.success('Relance supprimée');
      setDeletingId(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getDateBadge = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    if (isToday(date)) {
      return <Badge variant="default" className="bg-blue-500">Aujourd'hui</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary">Demain</Badge>;
    }
    if (isPast(date)) {
      return <Badge variant="destructive">En retard</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liste des relances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded" />
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
          <CardTitle>Liste des relances ({filteredFollowUps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date prévue</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Commande</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucune relance trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFollowUps.map((followUp) => (
                    <TableRow key={followUp.id} className={
                      followUp.status === 'pending' && isPast(new Date(followUp.scheduled_at)) && !isToday(new Date(followUp.scheduled_at))
                        ? 'bg-destructive/5'
                        : ''
                    }>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(followUp.scheduled_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          {followUp.status === 'pending' && getDateBadge(followUp.scheduled_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{followUp.client?.full_name || '-'}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {followUp.client?.phone || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {followUp.order ? (
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              {followUp.order.order_number}
                            </div>
                            {followUp.order.amount_due && Number(followUp.order.amount_due) > 0 && (
                              <div className="text-xs text-orange-500">
                                Dû: {Number(followUp.order.amount_due).toLocaleString()} DH
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeLabels[followUp.type].color}`}>
                          {typeLabels[followUp.type].label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusLabels[followUp.status]?.variant || 'outline'}>
                          {statusLabels[followUp.status]?.label || followUp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {(followUp as any).assigned_profile?.full_name || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground truncate block">
                          {followUp.notes || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {followUp.status === 'awaiting_validation' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedForValidation([followUp.id]);
                              setShowValidateDialog(true);
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                        ) : followUp.status === 'pending' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setCompletingFollowUp(followUp.id)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                Marquer complétée
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(followUp.id)}>
                                <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                                Annuler
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(followUp.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(followUp.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Complete Dialog */}
      <Dialog open={!!completingFollowUp} onOpenChange={(open) => !open && setCompletingFollowUp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compléter la relance</DialogTitle>
            <DialogDescription>
              Ajoutez des notes sur le résultat de cette relance (optionnel)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Notes sur l'appel, la réponse du client..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingFollowUp(null)}>
              Annuler
            </Button>
            <Button onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Marquer complétée
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette relance ?
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

      {/* Validate Dialog */}
      <ValidateFollowUpDialog
        open={showValidateDialog}
        onOpenChange={setShowValidateDialog}
        followUpIds={selectedForValidation}
      />
    </>
  );
}
