import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

interface PendingDeposit {
  id: string;
  deposited_by: string;
  total_amount: number;
  revenues_count: number;
  deposited_at: string;
  notes: string | null;
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
}

// Helper to check if error is due to missing table
function isTableNotFoundError(error: any): boolean {
  return (
    error?.code === 'PGRST116' || 
    error?.code === '42883' ||    
    error?.message?.includes('does not exist')
  );
}

export function usePendingDeposits() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all pending deposits for supervisors/admins
  const { data: pendingDeposits = [], isLoading, error } = useQuery({
    queryKey: ['pending-deposits'],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('revenue_deposits')
        .select('*')
        .eq('status', 'pending')
        .order('deposited_at', { ascending: false });

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('Table revenue_deposits not found.');
          return [];
        }
        throw error;
      }

      if (!data || data.length === 0) return [];

      // Fetch profiles for depositors
      const userIds = [...new Set(data.map((d: any) => d.deposited_by))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      return data.map((deposit: any) => ({
        ...deposit,
        profile: profiles?.find((p) => p.id === deposit.deposited_by),
      })) as PendingDeposit[];
    },
    retry: (failureCount, error) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get all confirmed deposits (history)
  const { data: confirmedDeposits = [], isLoading: confirmedLoading } = useQuery({
    queryKey: ['confirmed-deposits'],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('revenue_deposits')
        .select('*')
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false })
        .limit(50);

      if (error) {
        if (isTableNotFoundError(error)) return [];
        throw error;
      }

      if (!data || data.length === 0) return [];

      // Fetch profiles
      const userIds = [...new Set([
        ...data.map((d: any) => d.deposited_by),
        ...data.filter((d: any) => d.confirmed_by).map((d: any) => d.confirmed_by)
      ])] as string[];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      return data.map((deposit: any) => ({
        ...deposit,
        profile: profiles?.find((p) => p.id === deposit.deposited_by),
        confirmedByProfile: profiles?.find((p) => p.id === deposit.confirmed_by),
      }));
    },
    retry: (failureCount, error) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
    },
  });

  // Confirm a deposit
  const confirmDeposit = useMutation({
    mutationFn: async (depositId: string) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data, error } = await (supabase.rpc as any)('confirm_revenue_deposit', {
        p_deposit_id: depositId,
        p_supervisor_id: user.id,
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error || 'Erreur lors de la confirmation');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['confirmed-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-revenues'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
    },
  });

  // Reject a deposit
  const rejectDeposit = useMutation({
    mutationFn: async ({ depositId, reason }: { depositId: string; reason?: string }) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data, error } = await (supabase.rpc as any)('reject_revenue_deposit', {
        p_deposit_id: depositId,
        p_supervisor_id: user.id,
        p_reason: reason || null,
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error || 'Erreur lors du rejet');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-revenues'] });
      queryClient.invalidateQueries({ queryKey: ['collected-revenues'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
    },
  });

  // Get count of pending deposits
  const pendingCount = pendingDeposits.length;

  // Calculate total pending amount
  const totalPendingAmount = pendingDeposits.reduce(
    (sum, d) => sum + Number(d.total_amount), 
    0
  );

  return {
    pendingDeposits,
    isLoading,
    error,
    confirmedDeposits,
    confirmedLoading,
    confirmDeposit,
    rejectDeposit,
    pendingCount,
    totalPendingAmount,
  };
}

// Hook for real-time updates on pending deposits
export function useRealtimePendingDeposits() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up Realtime for pending deposits...');

    const channel = supabase
      .channel('pending-deposits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'revenue_deposits',
        },
        (payload) => {
          console.log('Deposit change:', payload);
          queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
          queryClient.invalidateQueries({ queryKey: ['confirmed-deposits'] });
          queryClient.invalidateQueries({ queryKey: ['supervisor-revenues'] });
        }
      )
      .subscribe((status) => {
        console.log('Pending deposits channel:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
