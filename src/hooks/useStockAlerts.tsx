import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: 'warehouse' | 'delivery_person';
  delivery_person_id: string | null;
  threshold: number;
  current_quantity: number;
  severity: 'info' | 'warning' | 'critical';
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
  };
  delivery_person?: {
    id: string;
    user_id: string;
    zone: string | null;
  };
}

interface StockThreshold {
  id: string;
  product_id: string;
  location_type: 'warehouse' | 'delivery_person';
  warning_threshold: number;
  critical_threshold: number;
  product?: {
    id: string;
    name: string;
  };
}

export function useStockAlerts(alertType?: 'warehouse' | 'delivery_person') {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['stock-alerts', alertType],
    queryFn: async () => {
      let query = supabase
        .from('stock_alerts')
        .select(`
          *,
          product:products(id, name, price),
          delivery_person:delivery_persons(id, user_id, zone)
        `)
        .eq('is_acknowledged', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (alertType) {
        query = query.eq('alert_type', alertType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StockAlert[];
    },
  });

  const { data: thresholds } = useQuery({
    queryKey: ['stock-thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_thresholds')
        .select(`
          *,
          product:products(id, name)
        `)
        .order('product_id');

      if (error) throw error;
      return data as StockThreshold[];
    },
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('stock_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast({
        title: 'Alerte acquittée',
        description: 'L\'alerte a été marquée comme traitée',
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

  const updateThreshold = useMutation({
    mutationFn: async (data: {
      productId: string;
      locationType: 'warehouse' | 'delivery_person';
      warningThreshold: number;
      criticalThreshold: number;
    }) => {
      const { error } = await supabase
        .from('stock_thresholds')
        .upsert({
          product_id: data.productId,
          location_type: data.locationType,
          warning_threshold: data.warningThreshold,
          critical_threshold: data.criticalThreshold,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'product_id,location_type',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-thresholds'] });
      toast({
        title: 'Seuil mis à jour',
        description: 'Les seuils d\'alerte ont été modifiés',
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
      .channel('stock-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_alerts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    alerts: alerts || [],
    thresholds: thresholds || [],
    isLoading,
    error,
    acknowledgeAlert,
    updateThreshold,
    criticalCount: alerts?.filter(a => a.severity === 'critical').length || 0,
    warningCount: alerts?.filter(a => a.severity === 'warning').length || 0,
  };
}
