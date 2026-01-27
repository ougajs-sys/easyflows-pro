import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

type CollectedRevenue = Database['public']['Tables']['collected_revenues']['Row'];
type RevenueDeposit = Database['public']['Tables']['revenue_deposits']['Row'];

interface RevenueSummary {
  total_collected: number;
  total_deposited: number;
  total_to_deposit: number;
  collected_count: number;
  deposited_count: number;
}

// Helper to check if error is due to missing table or function
function isTableNotFoundError(error: any): boolean {
  return (
    error?.code === 'PGRST116' || // PostgREST: relation does not exist
    error?.code === '42883' ||    // PostgreSQL: function does not exist
    error?.message?.includes('does not exist')
  );
}

// Reusable retry configuration for revenue queries
function getRevenueRetryConfig() {
  return (failureCount: number, error: any) => {
    // Don't retry if table doesn't exist
    if (isTableNotFoundError(error)) {
      return false;
    }
    return failureCount < 3;
  };
}

export function useCollectedRevenues() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all collected revenues for the current user
  const { data: revenues = [], isLoading, error } = useQuery({
    queryKey: ['collected-revenues', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('collected_revenues')
        .select(`
          *,
          payment:payments(
            reference,
            notes
          ),
          order:orders(
            order_number,
            client:clients(full_name, phone)
          ),
          deposit:revenue_deposits(
            id,
            deposited_at,
            notes
          )
        `)
        .eq('collected_by', user.id)
        .order('collected_at', { ascending: false });

      if (error) {
        // Handle table not found gracefully (404 errors)
        if (isTableNotFoundError(error)) {
          console.warn('Table collected_revenues not found. Please apply migration.');
          return [];
        }
        throw error;
      }
      return data as (CollectedRevenue & {
        payment?: {
          reference?: string | null;
          notes?: string | null;
        };
        order?: {
          order_number?: string | null;
          client?: {
            full_name?: string;
            phone?: string;
          } | null;
        };
        deposit?: {
          id: string;
          deposited_at: string;
          notes?: string | null;
        } | null;
      })[];
    },
    enabled: !!user?.id,
    retry: getRevenueRetryConfig(),
  });

  // Get today's collected revenues only
  const { data: todayRevenues = [], isLoading: todayLoading } = useQuery({
    queryKey: ['collected-revenues-today', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('collected_revenues')
        .select('*')
        .eq('collected_by', user.id)
        .gte('collected_at', today.toISOString())
        .order('collected_at', { ascending: false });

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('Table collected_revenues not found. Please apply migration.');
          return [];
        }
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
    retry: getRevenueRetryConfig(),
  });

  // Get revenue summary for the current user
  const { data: summary, isLoading: summaryLoading } = useQuery<RevenueSummary>({
    queryKey: ['revenue-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          total_collected: 0,
          total_deposited: 0,
          total_to_deposit: 0,
          collected_count: 0,
          deposited_count: 0,
        };
      }

      // Get start of current day in local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase.rpc('get_caller_revenue_summary', {
        p_user_id: user.id,
        p_start_date: today.toISOString(), // Will be in UTC, server handles timezone
      });

      if (error) {
        // Handle function not found or table not existing gracefully
        if (isTableNotFoundError(error)) {
          console.warn('Revenue tracking not available. Please apply migration.');
          return {
            total_collected: 0,
            total_deposited: 0,
            total_to_deposit: 0,
            collected_count: 0,
            deposited_count: 0,
          };
        }
        throw error;
      }

      // Return first row or default values
      if (data && data.length > 0) {
        return {
          total_collected: Number(data[0].total_collected || 0),
          total_deposited: Number(data[0].total_deposited || 0),
          total_to_deposit: Number(data[0].total_to_deposit || 0),
          collected_count: data[0].collected_count || 0,
          deposited_count: data[0].deposited_count || 0,
        };
      }

      return {
        total_collected: 0,
        total_deposited: 0,
        total_to_deposit: 0,
        collected_count: 0,
        deposited_count: 0,
      };
    },
    enabled: !!user?.id,
    retry: getRevenueRetryConfig(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Process deposit operation
  const processDeposit = useMutation({
    mutationFn: async (notes?: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('process_revenue_deposit', {
        p_user_id: user.id,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all revenue-related queries
      queryClient.invalidateQueries({ queryKey: ['collected-revenues'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-deposits'] });
    },
  });

  // Get all deposits for the current user
  const { data: deposits = [], isLoading: depositsLoading } = useQuery({
    queryKey: ['revenue-deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('revenue_deposits')
        .select('*')
        .eq('deposited_by', user.id)
        .order('deposited_at', { ascending: false });

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('Table revenue_deposits not found. Please apply migration.');
          return [];
        }
        throw error;
      }
      return data as RevenueDeposit[];
    },
    enabled: !!user?.id,
    retry: getRevenueRetryConfig(),
  });

  return {
    revenues,
    todayRevenues,
    isLoading,
    todayLoading,
    error,
    summary,
    summaryLoading,
    processDeposit,
    deposits,
    depositsLoading,
  };
}

// Hook to set up Realtime subscriptions for revenue tracking
export function useRealtimeRevenues() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up Realtime subscriptions for revenue tracking...');

    // Subscribe to collected_revenues changes
    const revenuesChannel = supabase
      .channel('collected-revenues-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collected_revenues',
          filter: `collected_by=eq.${user.id}`,
        },
        (payload) => {
          console.log('Collected revenue change:', payload);
          // Invalidate all revenue-related queries
          queryClient.invalidateQueries({ queryKey: ['collected-revenues'] });
          queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
        }
      )
      .subscribe((status) => {
        console.log('Collected revenues channel status:', status);
      });

    // Subscribe to revenue_deposits changes
    const depositsChannel = supabase
      .channel('revenue-deposits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'revenue_deposits',
          filter: `deposited_by=eq.${user.id}`,
        },
        (payload) => {
          console.log('Revenue deposit change:', payload);
          // Invalidate all revenue-related queries
          queryClient.invalidateQueries({ queryKey: ['collected-revenues'] });
          queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
          queryClient.invalidateQueries({ queryKey: ['revenue-deposits'] });
        }
      )
      .subscribe((status) => {
        console.log('Revenue deposits channel status:', status);
      });

    // Subscribe to payments that might affect revenues
    const paymentsChannel = supabase
      .channel('payments-for-revenues-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `received_by=eq.${user.id}`,
        },
        (payload) => {
          console.log('New payment received:', payload);
          // Invalidate revenue queries as new payment might create collected revenue
          queryClient.invalidateQueries({ queryKey: ['collected-revenues'] });
          queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
        }
      )
      .subscribe((status) => {
        console.log('Payments channel status:', status);
      });

    return () => {
      console.log('Cleaning up revenue Realtime subscriptions...');
      supabase.removeChannel(revenuesChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [user?.id, queryClient]);
}
