import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

export function useOrders() {
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

  const { data: ordersData = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, full_name, phone),
          product:products(id, name, price),
          delivery_person:delivery_persons(id, user_id, status, profile:profiles(full_name))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderWithRelations[];
    },
  });

  // Map orders to flatten the delivery_person.profile structure for UI compatibility
  const orders = useMemo(
    () =>
      ordersData.map((order) => ({
        ...order,
        delivery_profile: order.delivery_person?.profile?.full_name || null,
      })),
    [ordersData]
  );

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
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      // Trigger WordPress webhook sync when order is confirmed
      if (updatedOrder.status === 'confirmed') {
        supabase.functions
          .invoke('sync-order-elementor', {
            body: { order_id: updatedOrder.id }
          })
          .then(({ data, error }) => {
            if (error) {
              console.error('Error invoking sync-order-elementor:', error);
            } else {
              console.log('Webhook sync result:', data);
            }
          })
          .catch((err) => {
            console.error('Failed to invoke sync-order-elementor:', err);
          });
      }
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
