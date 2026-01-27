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
    delivery_person?: { id: string; user_id: string; status: string } | null;
  };

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(id, full_name, phone),
          product:products(id, name, price),
          delivery_person:delivery_persons(id, user_id, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderWithRelations[];
    },
  });

  const deliveryProfileKey = useMemo(
    () =>
      data
        .map((order) => (order as OrderWithRelations).delivery_person?.user_id)
        .filter(Boolean)
        .sort()
        .join('|'),
    [data]
  );

  const deliveryProfileIds = useMemo(
    () => (deliveryProfileKey ? deliveryProfileKey.split('|') : []),
    [deliveryProfileKey]
  );

  const { data: deliveryProfiles = [] } = useQuery({
    queryKey: ['delivery-profiles', deliveryProfileIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', deliveryProfileIds);

      if (error) throw error;
      return data ?? [];
    },
    enabled: deliveryProfileIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  const deliveryProfilesById = useMemo(
    () =>
      deliveryProfiles.reduce((acc, profile) => {
        acc[profile.id] = profile.full_name || null;
        return acc;
      }, {} as Record<string, string | null>),
    [deliveryProfiles]
  );

  const ordersWithProfiles = useMemo(
    () =>
      data.map((order) => {
        const orderWithRelations = order as OrderWithRelations;
        return {
          ...order,
          client: orderWithRelations.client,
          product: orderWithRelations.product,
          delivery_profile: orderWithRelations.delivery_person?.user_id
            ? deliveryProfilesById[orderWithRelations.delivery_person.user_id] || null
            : null,
        };
      }),
    [data, deliveryProfilesById]
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
    orders: ordersWithProfiles,
    isLoading,
    error,
    createOrder,
    updateOrderStatus,
  };
}
