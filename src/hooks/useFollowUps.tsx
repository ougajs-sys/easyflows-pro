import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type FollowUp = Database['public']['Tables']['follow_ups']['Row'];
type FollowUpInsert = Database['public']['Tables']['follow_ups']['Insert'];
type FollowUpUpdate = Database['public']['Tables']['follow_ups']['Update'];
type FollowUpType = Database['public']['Enums']['followup_type'];
type FollowUpStatus = Database['public']['Enums']['followup_status'];

export function useFollowUps() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: followUps = [], isLoading, error } = useQuery({
    queryKey: ['follow-ups'],
    enabled: !!user,
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
