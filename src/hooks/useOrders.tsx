import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

export function useOrders() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          product:products(*),
          delivery_person:delivery_persons(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: Omit<OrderInsert, 'created_by'>) => {
      // Auto-assign delivery person (first available one)
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
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Database['public']['Enums']['order_status'] }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    orders,
    isLoading,
    error,
    createOrder,
    updateOrderStatus,
  };
}
