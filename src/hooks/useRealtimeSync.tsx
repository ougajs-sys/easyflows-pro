import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeSyncOptions = {
  // Tables to subscribe to
  tables?: ('orders' | 'clients' | 'payments' | 'delivery_persons' | 'products' | 'follow_ups')[];
  // Additional filter for delivery_person_id
  deliveryPersonId?: string | null;
  // Whether to enable logging
  debug?: boolean;
};

/**
 * Hook centralisé pour la synchronisation en temps réel des données.
 * Gère automatiquement les souscriptions Realtime Supabase et invalide
 * les queries React Query appropriées.
 */
export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const { tables = ['orders', 'payments'], deliveryPersonId, debug = false } = options;
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[RealtimeSync]', ...args);
    }
  }, [debug]);

  // Fonction pour invalider toutes les queries liées aux commandes
  const invalidateOrderQueries = useCallback(() => {
    log('Invalidating order queries...');
    
    // Queries générales
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    
    // Queries caller
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['caller-stats', user.id] });
      queryClient.invalidateQueries({ queryKey: ['caller-orders', user.id] });
      queryClient.invalidateQueries({ queryKey: ['caller-cancelled-orders', user.id] });
    }
    
    // Queries delivery
    if (deliveryPersonId) {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders', deliveryPersonId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-today', deliveryPersonId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-reported', deliveryPersonId] });
      queryClient.invalidateQueries({ queryKey: ['delivery-cancelled', deliveryPersonId] });
    }
    
    // Queries supervisor
    queryClient.invalidateQueries({ queryKey: ['confirmed-orders-to-dispatch'] });
    queryClient.invalidateQueries({ queryKey: ['recent-orders'] });
    queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
  }, [queryClient, user?.id, deliveryPersonId, log]);

  // Fonction pour invalider les queries liées aux paiements
  const invalidatePaymentQueries = useCallback(() => {
    log('Invalidating payment queries...');
    
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['collected-revenues'] });
    queryClient.invalidateQueries({ queryKey: ['revenue-summary'] });
    queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
    
    // Also refresh orders since payments affect order state
    invalidateOrderQueries();
  }, [queryClient, invalidateOrderQueries, log]);

  // Fonction pour invalider les queries liées aux clients
  const invalidateClientQueries = useCallback(() => {
    log('Invalidating client queries...');
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  }, [queryClient, log]);

  // Fonction pour invalider les queries liées aux livreurs
  const invalidateDeliveryPersonQueries = useCallback(() => {
    log('Invalidating delivery person queries...');
    queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
    queryClient.invalidateQueries({ queryKey: ['active-delivery-persons'] });
    
    if (deliveryPersonId) {
      queryClient.invalidateQueries({ queryKey: ['delivery-person', deliveryPersonId] });
    }
  }, [queryClient, deliveryPersonId, log]);

  // Fonction pour invalider les queries liées aux produits
  const invalidateProductQueries = useCallback(() => {
    log('Invalidating product queries...');
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stock'] });
  }, [queryClient, log]);

  // Fonction pour invalider les queries liées aux follow-ups
  const invalidateFollowUpQueries = useCallback(() => {
    log('Invalidating follow-up queries...');
    queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-followups'] });
  }, [queryClient, log]);

  useEffect(() => {
    if (!user?.id) return;

    log('Setting up Realtime subscriptions for:', tables);

    // Cleanup existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Channel unique pour ce hook
    const channelName = `realtime-sync-${user.id}-${Date.now()}`;
    
    // Créer un seul channel avec plusieurs listeners
    let channel = supabase.channel(channelName);

    // Souscription aux orders
    if (tables.includes('orders')) {
      // Écouter toutes les modifications d'orders
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          log('Order change detected:', payload.eventType, payload);
          invalidateOrderQueries();
        }
      );
    }

    // Souscription aux payments
    if (tables.includes('payments')) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          log('Payment change detected:', payload.eventType);
          invalidatePaymentQueries();
        }
      );
    }

    // Souscription aux clients
    if (tables.includes('clients')) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        (payload) => {
          log('Client change detected:', payload.eventType);
          invalidateClientQueries();
        }
      );
    }

    // Souscription aux delivery_persons
    if (tables.includes('delivery_persons')) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_persons',
        },
        (payload) => {
          log('Delivery person change detected:', payload.eventType);
          invalidateDeliveryPersonQueries();
        }
      );
    }

    // Souscription aux products
    if (tables.includes('products')) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          log('Product change detected:', payload.eventType);
          invalidateProductQueries();
        }
      );
    }

    // Souscription aux follow_ups
    if (tables.includes('follow_ups')) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follow_ups',
        },
        (payload) => {
          log('Follow-up change detected:', payload.eventType);
          invalidateFollowUpQueries();
        }
      );
    }

    // Subscribe au channel
    channel.subscribe((status) => {
      log('Channel subscription status:', status);
      if (status === 'SUBSCRIBED') {
        log('Successfully subscribed to realtime updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeSync] Channel error - reconnecting...');
      }
    });

    channelsRef.current.push(channel);

    // Cleanup
    return () => {
      log('Cleaning up Realtime subscriptions...');
      channelsRef.current.forEach(ch => {
        supabase.removeChannel(ch);
      });
      channelsRef.current = [];
    };
  }, [
    user?.id,
    tables.join(','),
    deliveryPersonId,
    invalidateOrderQueries,
    invalidatePaymentQueries,
    invalidateClientQueries,
    invalidateDeliveryPersonQueries,
    invalidateProductQueries,
    invalidateFollowUpQueries,
    log,
  ]);

  // Retourne des fonctions utilitaires
  return {
    refreshOrders: invalidateOrderQueries,
    refreshPayments: invalidatePaymentQueries,
    refreshClients: invalidateClientQueries,
    refreshDeliveryPersons: invalidateDeliveryPersonQueries,
    refreshProducts: invalidateProductQueries,
    refreshFollowUps: invalidateFollowUpQueries,
    refreshAll: () => {
      invalidateOrderQueries();
      invalidatePaymentQueries();
      invalidateClientQueries();
      invalidateDeliveryPersonQueries();
      invalidateProductQueries();
      invalidateFollowUpQueries();
    },
  };
}
