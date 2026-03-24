import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderStatus = Database['public']['Enums']['order_status'];

const PAGE_SIZE = 50;

interface UseOrdersOptions {
  page?: number;
  searchQuery?: string;
  statusFilter?: OrderStatus | 'all';
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { page = 1, searchQuery = '', statusFilter = 'all' } = options;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type OrderWithRelations = Order & {
    client?: { id: string; full_name: string; phone: string } | null;
    product?: { id: string; name: string; price: number } | null;
    delivery_person?: { 
      id: string; 
      user_id: string; 
      status: string;
      profile?: { full_name: string } | null;
    } | null;
  };

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['orders', page, searchQuery, statusFilter],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, full_name, phone),
          product:products(id, name, price),
          delivery_person:delivery_persons(id, user_id, status)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Server-side filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery.trim()) {
        query = query.ilike('order_number', `%${searchQuery}%`);
      }

      const { data: rawOrders, error, count } = await query;

      if (error) throw error;
      if (!rawOrders) return { orders: [], totalCount: 0 };

      // Fetch delivery person profiles
      const deliveryUserIds = rawOrders
        .filter(o => o.delivery_person?.user_id)
        .map(o => o.delivery_person!.user_id);

      let profilesMap: Record<string, string> = {};
      if (deliveryUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', [...new Set(deliveryUserIds)]);

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Inconnu';
          return acc;
        }, {} as Record<string, string>);
      }

      const orders = rawOrders.map(order => ({
        ...order,
        delivery_person: order.delivery_person ? {
          ...order.delivery_person,
          profile: order.delivery_person.user_id 
            ? { full_name: profilesMap[order.delivery_person.user_id] || null }
            : null
        } : null
      })) as OrderWithRelations[];

      return { orders, totalCount: count || 0 };
    },
  });

  const orders = useMemo(
    () =>
      (result?.orders || []).map((order) => ({
        ...order,
        delivery_profile: order.delivery_person?.profile?.full_name || null,
      })),
    [result?.orders]
  );

  const totalCount = result?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const createOrder = useMutation({
    mutationFn: async (order: Omit<OrderInsert, 'created_by'>) => {
      const { data: availableDelivery } = await supabase
        .from('delivery_persons')
        .select('id')
        .eq('is_active', true)
        .eq('status', 'available')
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...order,
          created_by: user?.id,
          delivery_person_id: availableDelivery?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updateData: Partial<Order> = { status };
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      
      if (updatedOrder.status === 'confirmed') {
        supabase.functions
          .invoke('sync-order-elementor', {
            body: { order_id: updatedOrder.id }
          })
          .then(({ error }) => {
            if (error) console.error('Error invoking sync-order-elementor:', error);
          })
          .catch((err) => console.error('Failed to invoke sync-order-elementor:', err));
      }
    },
  });

  return {
    orders,
    isLoading,
    error,
    totalCount,
    totalPages,
    pageSize: PAGE_SIZE,
    createOrder,
    updateOrderStatus,
  };
}
