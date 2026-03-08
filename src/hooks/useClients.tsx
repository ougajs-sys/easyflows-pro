import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];
type ClientSegment = Database['public']['Enums']['client_segment'];

const PAGE_SIZE = 50;

interface UseClientsOptions {
  page?: number;
  searchQuery?: string;
  segmentFilter?: ClientSegment | 'all';
  productFilter?: string;
}

export function useClients(options: UseClientsOptions = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { page = 1, searchQuery = '', segmentFilter = 'all', productFilter = 'all' } = options;

  // Fetch total count
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['clients-count', searchQuery, segmentFilter, productFilter],
    enabled: !!user,
    queryFn: async () => {
      if (productFilter !== 'all') {
        // Count via orders join - use RPC or manual count
        const { data, error } = await supabase
          .from('orders')
          .select('client_id', { count: 'exact', head: true })
          .eq('product_id', productFilter);
        if (error) throw error;
        // This gives approximate; we'll use the filtered query count instead
        return data;
      }

      let query = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true });

      if (segmentFilter !== 'all') {
        query = query.eq('segment', segmentFilter);
      }
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,zone.ilike.%${searchQuery}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch paginated clients
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients', page, searchQuery, segmentFilter, productFilter],
    enabled: !!user,
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // If filtering by product, we need to get client IDs from orders first
      if (productFilter !== 'all') {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('client_id')
          .eq('product_id', productFilter);

        if (orderError) throw orderError;

        const clientIds = [...new Set((orderData || []).map(o => o.client_id))];
        
        if (clientIds.length === 0) return [];

        let query = supabase
          .from('clients')
          .select('id, full_name, phone, phone_secondary, city, zone, segment, address, notes, total_orders, total_spent, created_at')
          .in('id', clientIds)
          .order('created_at', { ascending: false });

        if (segmentFilter !== 'all') {
          query = query.eq('segment', segmentFilter);
        }
        if (searchQuery) {
          query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,zone.ilike.%${searchQuery}%`);
        }

        query = query.range(from, to);
        const { data, error } = await query;
        if (error) throw error;
        return data as Client[];
      }

      let query = supabase
        .from('clients')
        .select('id, full_name, phone, phone_secondary, city, zone, segment, address, notes, total_orders, total_spent, created_at')
        .order('created_at', { ascending: false });

      if (segmentFilter !== 'all') {
        query = query.eq('segment', segmentFilter);
      }
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,zone.ilike.%${searchQuery}%`);
      }

      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });

  // All clients for stats - fetch all segments with pagination to bypass 1000 limit
  const { data: allClientsStats = [] } = useQuery({
    queryKey: ['clients-stats'],
    enabled: !!user,
    queryFn: async () => {
      const allData: { segment: string; total_spent: number }[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('clients')
          .select('segment, total_spent')
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allData;
    },
  });

  // Lightweight dropdown list (id, name, phone) - all clients
  const { data: allClientsForDropdown = [] } = useQuery({
    queryKey: ['clients-dropdown'],
    enabled: !!user,
    queryFn: async () => {
      const allData: { id: string; full_name: string; phone: string }[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('clients')
          .select('id, full_name, phone')
          .order('full_name')
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allData;
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-count'] });
      queryClient.invalidateQueries({ queryKey: ['clients-stats'] });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-stats'] });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-count'] });
      queryClient.invalidateQueries({ queryKey: ['clients-stats'] });
    },
  });

  const totalPages = Math.ceil((totalCount as number) / PAGE_SIZE);

  return {
    clients,
    allClientsStats,
    isLoading,
    error,
    totalCount: totalCount as number,
    totalPages,
    pageSize: PAGE_SIZE,
    createClient,
    updateClient,
    deleteClient,
  };
}
