import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface SupplyRequest {
  id: string;
  product_id: string;
  requested_by: string;
  requester_type: 'warehouse' | 'delivery_person';
  delivery_person_id: string | null;
  quantity_requested: number;
  quantity_approved: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  reason: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    stock: number;
  };
  delivery_person?: {
    id: string;
    user_id: string;
    zone: string | null;
  };
}

export function useSupplyRequests(requesterType?: 'warehouse' | 'delivery_person', status?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['supply-requests', requesterType, status],
    queryFn: async () => {
      let query = supabase
        .from('supply_requests')
        .select(`
          *,
          product:products(id, name, price, stock),
          delivery_person:delivery_persons(id, user_id, zone)
        `)
        .order('created_at', { ascending: false });

      if (requesterType) {
        query = query.eq('requester_type', requesterType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplyRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (data: {
      productId: string;
      requesterType: 'warehouse' | 'delivery_person';
      deliveryPersonId?: string;
      quantityRequested: number;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('supply_requests')
        .insert({
          product_id: data.productId,
          requested_by: user.id,
          requester_type: data.requesterType,
          delivery_person_id: data.deliveryPersonId || null,
          quantity_requested: data.quantityRequested,
          reason: data.reason || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      toast({
        title: 'Demande créée',
        description: 'Votre demande d\'approvisionnement a été envoyée',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reviewRequest = useMutation({
    mutationFn: async (data: {
      requestId: string;
      status: 'approved' | 'rejected';
      quantityApproved?: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('supply_requests')
        .update({
          status: data.status,
          quantity_approved: data.quantityApproved || null,
          notes: data.notes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      toast({
        title: 'Demande traitée',
        description: 'La demande a été mise à jour',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const fulfillRequest = useMutation({
    mutationFn: async (requestId: string) => {
      // Get request details first
      const { data: request, error: fetchError } = await supabase
        .from('supply_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error('Demande non trouvée');
      if (request.status !== 'approved') throw new Error('La demande doit être approuvée d\'abord');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Execute stock transfer if it's for a delivery person
      if (request.requester_type === 'delivery_person' && request.delivery_person_id) {
        const { data: result, error: transferError } = await supabase
          .rpc('transfer_stock_to_delivery', {
            p_product_id: request.product_id,
            p_delivery_person_id: request.delivery_person_id,
            p_quantity: request.quantity_approved || request.quantity_requested,
            p_performed_by: user.id,
          });

        if (transferError) throw transferError;
        if (result && typeof result === 'object' && 'error' in result) {
          throw new Error(String(result.error));
        }
      }

      // Mark request as fulfilled
      const { error: updateError } = await supabase
        .from('supply_requests')
        .update({
          status: 'fulfilled',
          fulfilled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stock'] });
      toast({
        title: 'Demande exécutée',
        description: 'Le transfert de stock a été effectué',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('supply_requests')
        .update({
          status: 'rejected',
          notes: 'Annulée par le demandeur',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      toast({
        title: 'Demande annulée',
        description: 'Votre demande a été annulée',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('supply-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supply_requests',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    requests: requests || [],
    isLoading,
    error,
    createRequest,
    reviewRequest,
    fulfillRequest,
    cancelRequest,
    pendingCount: requests?.filter(r => r.status === 'pending').length || 0,
    approvedCount: requests?.filter(r => r.status === 'approved').length || 0,
  };
}
