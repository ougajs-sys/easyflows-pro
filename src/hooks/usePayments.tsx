import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export function usePayments() {
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          order:orders(
            order_number,
            total_amount,
            amount_paid,
            amount_due,
            client:clients(full_name, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createPayment = useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      // Insert payment
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update order's amount_paid and status
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('amount_paid, total_amount, status')
        .eq('id', payment.order_id)
        .single();

      if (orderFetchError) throw orderFetchError;

      const newAmountPaid = Number(orderData.amount_paid) + Number(payment.amount);
      
      // Any payment recorded should set status to confirmed
      let newStatus = 'confirmed';
      
      // Keep current status if already in transit or delivered
      if (orderData.status === 'in_transit' || orderData.status === 'delivered') {
        newStatus = orderData.status;
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', payment.order_id);

      if (orderUpdateError) throw orderUpdateError;

      return paymentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaymentUpdate['status'] }) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  // Get payments for a specific order
  const getOrderPayments = async (orderId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  };

  // Get orders with pending payments
  const { data: pendingOrders = [], isLoading: pendingOrdersLoading } = useQuery({
    queryKey: ['orders-pending-payment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(full_name, phone)
        `)
        .gt('amount_due', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return {
    payments,
    isLoading,
    error,
    createPayment,
    updatePaymentStatus,
    getOrderPayments,
    pendingOrders,
    pendingOrdersLoading,
  };
}
