import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type FollowUp = Database['public']['Tables']['follow_ups']['Row'];
type FollowUpInsert = Database['public']['Tables']['follow_ups']['Insert'];
type FollowUpUpdate = Database['public']['Tables']['follow_ups']['Update'];
type FollowUpType = Database['public']['Enums']['followup_type'];
type FollowUpStatus = Database['public']['Enums']['followup_status'];

export function useFollowUps() {
  const queryClient = useQueryClient();

  const { data: followUps = [], isLoading, error } = useQuery({
    queryKey: ['follow-ups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          client:clients(id, full_name, phone, city, zone),
          order:orders(id, order_number, total_amount, amount_paid, amount_due, status)
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createFollowUp = useMutation({
    mutationFn: async (followUp: FollowUpInsert) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert(followUp)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  const updateFollowUp = useMutation({
    mutationFn: async ({ id, ...updates }: FollowUpUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  const completeFollowUp = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .update({
          status: 'completed' as FollowUpStatus,
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  const cancelFollowUp = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .update({ status: 'cancelled' as FollowUpStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  const deleteFollowUp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('follow_ups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  // Generate follow-ups for orders with partial payments or reported status
  const generateAutoFollowUps = useMutation({
    mutationFn: async (userId: string) => {
      // Get orders that need follow-up (partial with amount_due OR reported regardless of amount)
      const { data: partialOrders, error: partialError } = await supabase
        .from('orders')
        .select(`
          id,
          client_id,
          order_number,
          status,
          amount_due,
          scheduled_at
        `)
        .eq('status', 'partial')
        .gt('amount_due', 0);

      if (partialError) throw partialError;

      const { data: reportedOrders, error: reportedError } = await supabase
        .from('orders')
        .select(`
          id,
          client_id,
          order_number,
          status,
          amount_due,
          scheduled_at
        `)
        .eq('status', 'reported');

      if (reportedError) throw reportedError;

      const orders = [...(partialOrders || []), ...(reportedOrders || [])];

      // Get existing pending follow-ups for these orders
      const orderIds = orders.map(o => o.id);
      const { data: existingFollowUps, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('order_id')
        .in('order_id', orderIds)
        .in('status', ['pending', 'awaiting_validation']);

      if (followUpsError) throw followUpsError;

      const existingOrderIds = new Set(existingFollowUps?.map(f => f.order_id) || []);

      // Create follow-ups for orders without pending follow-ups
      const newFollowUps: FollowUpInsert[] = orders
        .filter(order => !existingOrderIds.has(order.id))
        .map(order => {
          // Use scheduled_at from order if available (for reported orders), otherwise tomorrow
          const followUpDate = order.scheduled_at 
            ? new Date(order.scheduled_at).toISOString()
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          
          return {
            client_id: order.client_id,
            order_id: order.id,
            type: order.status === 'partial' ? 'partial_payment' as FollowUpType : 'rescheduled' as FollowUpType,
            status: 'awaiting_validation' as FollowUpStatus,
            scheduled_at: followUpDate,
            created_by: userId,
            notes: order.status === 'partial' 
              ? `Relance automatique - Paiement partiel pour ${order.order_number}`
              : `Relance automatique - Commande reportée ${order.order_number}`,
          };
        });

      if (newFollowUps.length > 0) {
        const { error: insertError } = await supabase
          .from('follow_ups')
          .insert(newFollowUps);

        if (insertError) throw insertError;
      }

      return { created: newFollowUps.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  // Stats
  const stats = {
    total: followUps.length,
    pending: followUps.filter(f => f.status === 'pending').length,
    awaitingValidation: followUps.filter(f => f.status === 'awaiting_validation').length,
    completed: followUps.filter(f => f.status === 'completed').length,
    overdue: followUps.filter(f => 
      f.status === 'pending' && new Date(f.scheduled_at) < new Date()
    ).length,
    today: followUps.filter(f => {
      const today = new Date().toDateString();
      return f.status === 'pending' && new Date(f.scheduled_at).toDateString() === today;
    }).length,
  };

  return {
    followUps,
    isLoading,
    error,
    stats,
    createFollowUp,
    updateFollowUp,
    completeFollowUp,
    cancelFollowUp,
    deleteFollowUp,
    generateAutoFollowUps,
  };
}
