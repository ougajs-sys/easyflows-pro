import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define types locally since tables may not exist in generated types yet
interface CollectedRevenue {
  id: string;
  payment_id: string;
  order_id: string;
  amount: number;
  collected_by: string;
  collected_at: string;
  status: 'collected' | 'deposited';
  deposit_id: string | null;
  payment_method?: 'cash' | 'mobile_money' | 'card' | 'transfer';
  created_at: string;
  updated_at: string;
}

interface RevenueDeposit {
  id: string;
  deposited_by: string;
  total_amount: number;
  revenues_count: number;
  deposited_at: string;
  notes: string | null;
  created_at: string;
}

interface RevenueFilters {
  callerId?: string;
  status?: 'collected' | 'deposited';
  startDate?: Date;
  endDate?: Date;
}

// Helper to check if error is due to missing table
function isTableNotFoundError(error: any): boolean {
  return (
    error?.code === 'PGRST116' || 
    error?.code === '42883' ||    
    error?.message?.includes('does not exist')
  );
}

export function useSupervisorRevenues(filters?: RevenueFilters) {
  // Get all collected revenues with filters
  const { data: allRevenues = [], isLoading, error } = useQuery({
    queryKey: ['supervisor-revenues', filters],
    queryFn: async () => {
      // Use type assertion to bypass missing table type
      let query = (supabase.from as any)('collected_revenues')
        .select(`
          *,
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

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('Table collected_revenues not found. Please apply migration.');
          return [];
        }
        throw error;
      }
      
      // Fetch profiles for collected_by users
      const userIds = data ? [...new Set((data as any[]).map(r => r.collected_by))] : [];
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);
        
      // Merge profiles into revenue data
      return (data as any[]).map(revenue => ({
        ...revenue,
        collected_by_profile: profiles?.find(p => p.id === revenue.collected_by),
      })) as (CollectedRevenue & {
        collected_by_profile?: {
          full_name?: string | null;
          phone?: string | null;
        };
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
    retry: (failureCount, error) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
    },
  });

  // Get all deposits
  const { data: allDeposits = [], isLoading: depositsLoading } = useQuery({
    queryKey: ['supervisor-deposits', filters],
    queryFn: async () => {
      // Use type assertion to bypass missing table type
      let query = (supabase.from as any)('revenue_deposits')
        .select('*')
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

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('Table revenue_deposits not found. Please apply migration.');
          return [];
        }
        throw error;
      }
      
      // Fetch profiles for deposited_by users
      const userIds = data ? [...new Set((data as any[]).map(r => r.deposited_by))] : [];
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);
        
      // Merge profiles into deposit data
      return (data as any[]).map(deposit => ({
        ...deposit,
        deposited_by_profile: profiles?.find(p => p.id === deposit.deposited_by),
      })) as (RevenueDeposit & {
        deposited_by_profile?: {
          full_name?: string | null;
          phone?: string | null;
        };
      })[];
    },
    retry: (failureCount, error) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
    },
  });

  // Get revenue statistics by caller
  const { data: revenueByCallers = [], isLoading: statsLoading } = useQuery({
    queryKey: ['revenue-by-callers', filters],
    queryFn: async () => {
      // Use type assertion to bypass missing table type
      let query = (supabase.from as any)('collected_revenues')
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

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('Table collected_revenues not found. Please apply migration.');
          return [];
        }
        throw error;
      }

      // Group by caller and calculate stats
      const callerMap = new Map<string, {
        callerId: string;
        totalCollected: number;
        totalDeposited: number;
        totalToDeposit: number;
        collectedCount: number;
        depositedCount: number;
      }>();

      (revenues as any[] || []).forEach((rev) => {
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
    retry: (failureCount, error) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
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
