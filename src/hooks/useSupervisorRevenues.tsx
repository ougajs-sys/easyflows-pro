import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type CollectedRevenue = Database['public']['Tables']['collected_revenues']['Row'];
type RevenueDeposit = Database['public']['Tables']['revenue_deposits']['Row'];

interface RevenueFilters {
  callerId?: string;
  status?: 'collected' | 'deposited';
  startDate?: Date;
  endDate?: Date;
}

export function useSupervisorRevenues(filters?: RevenueFilters) {
  // Get all collected revenues with filters
  const { data: allRevenues = [], isLoading, error } = useQuery({
    queryKey: ['supervisor-revenues', filters],
    queryFn: async () => {
      let query = supabase
        .from('collected_revenues')
        .select(`
          *,
          collected_by_profile:profiles!collected_revenues_collected_by_fkey(full_name, phone),
          payment:payments(reference, notes),
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
        .order('collected_at', { ascending: false });

      // Apply filters
      if (filters?.callerId) {
        query = query.eq('collected_by', filters.callerId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('collected_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('collected_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (CollectedRevenue & {
        collected_by_profile?: any;
        payment?: any;
        order?: any;
        deposit?: any;
      })[];
    },
  });

  // Get all deposits
  const { data: allDeposits = [], isLoading: depositsLoading } = useQuery({
    queryKey: ['supervisor-deposits', filters],
    queryFn: async () => {
      let query = supabase
        .from('revenue_deposits')
        .select(`
          *,
          deposited_by_profile:profiles!revenue_deposits_deposited_by_fkey(full_name, phone)
        `)
        .order('deposited_at', { ascending: false });

      // Apply filters
      if (filters?.callerId) {
        query = query.eq('deposited_by', filters.callerId);
      }
      if (filters?.startDate) {
        query = query.gte('deposited_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('deposited_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (RevenueDeposit & {
        deposited_by_profile?: any;
      })[];
    },
  });

  // Get revenue statistics by caller
  const { data: revenueByCallers = [], isLoading: statsLoading } = useQuery({
    queryKey: ['revenue-by-callers', filters],
    queryFn: async () => {
      let query = supabase
        .from('collected_revenues')
        .select('collected_by, amount, status, collected_at');

      // Apply date filters
      if (filters?.startDate) {
        query = query.gte('collected_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('collected_at', filters.endDate.toISOString());
      }
      if (filters?.callerId) {
        query = query.eq('collected_by', filters.callerId);
      }

      const { data: revenues, error } = await query;

      if (error) throw error;

      // Group by caller and calculate stats
      const callerMap = new Map<string, {
        callerId: string;
        totalCollected: number;
        totalDeposited: number;
        totalToDeposit: number;
        collectedCount: number;
        depositedCount: number;
      }>();

      revenues?.forEach((rev) => {
        const existing = callerMap.get(rev.collected_by) || {
          callerId: rev.collected_by,
          totalCollected: 0,
          totalDeposited: 0,
          totalToDeposit: 0,
          collectedCount: 0,
          depositedCount: 0,
        };

        if (rev.status === 'collected') {
          existing.totalCollected += Number(rev.amount);
          existing.totalToDeposit += Number(rev.amount);
          existing.collectedCount += 1;
        } else if (rev.status === 'deposited') {
          existing.totalDeposited += Number(rev.amount);
          existing.depositedCount += 1;
        }

        callerMap.set(rev.collected_by, existing);
      });

      // Fetch caller profiles
      const callerIds = Array.from(callerMap.keys());
      if (callerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', callerIds);

      return Array.from(callerMap.values()).map(stats => ({
        ...stats,
        profile: profiles?.find(p => p.id === stats.callerId),
      }));
    },
  });

  return {
    allRevenues,
    isLoading,
    error,
    allDeposits,
    depositsLoading,
    revenueByCallers,
    statsLoading,
  };
}
