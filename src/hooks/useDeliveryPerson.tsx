import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type DeliveryPerson = Database['public']['Tables']['delivery_persons']['Row'];
type DeliveryStatus = Database['public']['Enums']['delivery_status'];
type OrderStatus = Database['public']['Enums']['order_status'];

export function useDeliveryPerson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get current user's delivery person profile
  const { data: deliveryProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['delivery-person', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('delivery_persons')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get orders assigned to this delivery person
  const { data: assignedOrders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['delivery-orders', deliveryProfile?.id],
    queryFn: async () => {
      if (!deliveryProfile?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          product:products(*)
        `)
        .eq('delivery_person_id', deliveryProfile.id)
        .in('status', ['confirmed', 'in_transit', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!deliveryProfile?.id,
  });

  // Get today's completed deliveries
  const { data: todayDeliveries = [] } = useQuery({
    queryKey: ['delivery-today', deliveryProfile?.id],
    queryFn: async () => {
      if (!deliveryProfile?.id) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(*),
          product:products(*)
        `)
        .eq('delivery_person_id', deliveryProfile.id)
        .eq('status', 'delivered')
        .gte('delivered_at', today.toISOString())
        .order('delivered_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!deliveryProfile?.id,
  });

  // Update delivery status
  const updateDeliveryStatus = useMutation({
    mutationFn: async (status: DeliveryStatus) => {
      if (!deliveryProfile?.id) throw new Error('No delivery profile found');

      const { data, error } = await supabase
        .from('delivery_persons')
        .update({ status })
        .eq('id', deliveryProfile.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-person'] });
    },
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, amountPaid }: { orderId: string; status: OrderStatus; amountPaid?: number }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      
      if (amountPaid !== undefined) {
        updateData.amount_paid = amountPaid;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-today'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-person'] });
    },
  });

  return {
    deliveryProfile,
    assignedOrders,
    todayDeliveries,
    isLoading: isLoadingProfile || isLoadingOrders,
    updateDeliveryStatus,
    updateOrderStatus,
  };
}
