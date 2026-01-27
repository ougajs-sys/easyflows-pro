import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type CollectedRevenue = Database['public']['Tables']['collected_revenues']['Row'];
type RevenueDeposit = Database['public']['Tables']['revenue_deposits']['Row'];

interface RevenueSummary {
  total_collected: number;
  total_deposited: number;
  total_to_deposit: number;
  collected_count: number;
  deposited_count: number;
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

      if (error) throw error;
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

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
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

      if (error) throw error;

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

      if (error) throw error;
      return data as RevenueDeposit[];
    },
    enabled: !!user?.id,
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
