import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle, Loader2, UserCheck } from 'lucide-react';

interface ValidateFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUpIds: string[];
}

export function ValidateFollowUpDialog({ open, onOpenChange, followUpIds }: ValidateFollowUpDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCaller, setSelectedCaller] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  // Fetch callers (users with role 'appelant')
  const { data: callers = [] } = useQuery({
    queryKey: ['callers-list'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'appelant')
        .eq('confirmed', true);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: open,
  });

  const handleValidate = async () => {
    if (!selectedCaller || !user) return;

    setIsValidating(true);
    try {
      // 1. Update follow-ups: validate and assign
      const { data: updatedFollowUps, error } = await supabase
        .from('follow_ups')
        .update({
          status: 'pending' as any,
          assigned_to: selectedCaller,
          validated_by: user.id,
          validated_at: new Date().toISOString(),
        })
        .in('id', followUpIds)
        .select('order_id');

      if (error) throw error;

      // 2. Also assign the related orders to the caller so they appear in "Mes Commandes"
      const orderIds = updatedFollowUps
        ?.map(f => f.order_id)
        .filter((id): id is string => !!id) || [];

      if (orderIds.length > 0) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ assigned_to: selectedCaller })
          .in('id', orderIds);

        if (orderError) {
          console.error('Error assigning orders:', orderError);
          // Non-blocking: follow-ups are already validated
        }
      }

      toast.success(`${followUpIds.length} relance(s) validée(s) et assignée(s)`);
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['caller-orders'] });
      onOpenChange(false);
      setSelectedCaller('');
    } catch (error) {
      console.error('Error validating follow-ups:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Valider et assigner {followUpIds.length > 1 ? `${followUpIds.length} relances` : 'la relance'}
          </DialogTitle>
          <DialogDescription>
            Choisissez l'appelant qui sera chargé de traiter {followUpIds.length > 1 ? 'ces relances' : 'cette relance'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Appelant assigné *</Label>
            <Select value={selectedCaller} onValueChange={setSelectedCaller}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un appelant" />
              </SelectTrigger>
              <SelectContent>
                {callers.map((caller) => (
                  <SelectItem key={caller.id} value={caller.id}>
                    {caller.full_name || 'Sans nom'} {caller.phone ? `(${caller.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {callers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun appelant disponible. Vérifiez que des utilisateurs ont le rôle "appelant".
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isValidating}>
            Annuler
          </Button>
          <Button onClick={handleValidate} disabled={!selectedCaller || isValidating}>
            {isValidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Valider et assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
