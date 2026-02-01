import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

interface Notification {
  id: string;
  type: 'new_order' | 'status_change' | 'payment' | 'follow_up' | 'order_assigned' | 'stock_adjustment';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const statusLabels: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_transit: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partielle',
  cancelled: 'Annulée',
  reported: 'Reportée',
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notifications');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const { user, role } = useAuth();

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'created_at'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    
    // Show toast
    toast(notification.title, {
      description: notification.message,
    });
  }, []);

  // Subscribe to real-time order changes
  useEffect(() => {
    if (!user) return;

    console.log('Setting up Supabase Realtime subscriptions...');

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('New order received:', payload);
          
          // Fetch client info
          const { data: client } = await supabase
            .from('clients')
            .select('full_name')
            .eq('id', payload.new.client_id)
            .single();

          addNotification({
            type: 'new_order',
            title: '🆕 Nouvelle commande',
            message: `Commande ${payload.new.order_number || 'nouvelle'} de ${client?.full_name || 'un client'}`,
            data: payload.new,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const oldStatus = (payload.old as any).status;
          const newStatus = payload.new.status;
          const oldAssignedTo = (payload.old as any).assigned_to;
          const newAssignedTo = payload.new.assigned_to;

          // Notify on status changes
          if (oldStatus !== newStatus) {
            console.log('Order status changed:', payload);

            const { data: client } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', payload.new.client_id)
              .single();

            addNotification({
              type: 'status_change',
              title: '📦 Statut modifié',
              message: `${payload.new.order_number}: ${statusLabels[oldStatus as OrderStatus] || oldStatus} → ${statusLabels[newStatus as OrderStatus] || newStatus}`,
              data: payload.new,
            });
          }

          // Notify caller when order is assigned to them
          if (oldAssignedTo !== newAssignedTo && newAssignedTo === user?.id) {
            console.log('Order assigned to current user:', payload);

            const { data: client } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', payload.new.client_id)
              .single();

            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', payload.new.product_id)
              .single();

            addNotification({
              type: 'order_assigned',
              title: '📋 Commande assignée',
              message: `${payload.new.order_number} - ${client?.full_name || 'Client'} (${product?.name || 'Produit'})`,
              data: payload.new,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Orders channel status:', status);
      });

    // Subscribe to new payments
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
          console.log('New payment received:', payload);

          const { data: order } = await supabase
            .from('orders')
            .select('order_number, client:clients(full_name)')
            .eq('id', payload.new.order_id)
            .single();

          addNotification({
            type: 'payment',
            title: '💰 Nouveau paiement',
            message: `${Number(payload.new.amount).toLocaleString()} DH reçu pour ${order?.order_number || 'une commande'}`,
            data: payload.new,
          });
        }
      )
      .subscribe((status) => {
        console.log('Payments channel status:', status);
      });

    // Subscribe to follow-ups due today
    const followUpsChannel = supabase
      .channel('followups-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follow_ups',
        },
        async (payload) => {
          console.log('New follow-up created:', payload);

          const { data: client } = await supabase
            .from('clients')
            .select('full_name')
            .eq('id', payload.new.client_id)
            .single();

          addNotification({
            type: 'follow_up',
            title: '📞 Nouvelle relance',
            message: `Relance planifiée pour ${client?.full_name || 'un client'}`,
            data: payload.new,
          });
        }
      )
      .subscribe((status) => {
        console.log('Follow-ups channel status:', status);
      });

    // Subscribe to revenue deposits
    const depositsChannel = supabase
      .channel('deposits-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'revenue_deposits',
        },
        async (payload) => {
          console.log('New deposit created:', payload);

          // Notify supervisors and admins only
          if (role === 'supervisor' || role === 'admin') {
            // Fetch caller info
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.deposited_by)
              .single();

            addNotification({
              type: 'payment',
              title: '💰 Nouveau versement en attente',
              message: `${profile?.full_name || 'Un appelant'} a versé ${Number(payload.new.total_amount).toLocaleString()} DH. En attente de confirmation.`,
              data: payload.new,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'revenue_deposits',
        },
        async (payload) => {
          console.log('Deposit updated:', payload);

          const oldStatus = (payload.old as any).status;
          const newStatus = payload.new.status;

          // Notify caller when their deposit is confirmed or rejected
          if (oldStatus !== newStatus && payload.new.deposited_by === user?.id) {
            if (newStatus === 'confirmed') {
              addNotification({
                type: 'payment',
                title: '✅ Versement confirmé',
                message: `Votre versement de ${Number(payload.new.total_amount).toLocaleString()} DH a été validé.`,
                data: payload.new,
              });
            } else if (newStatus === 'rejected') {
              addNotification({
                type: 'payment',
                title: '❌ Versement rejeté',
                message: `Votre versement de ${Number(payload.new.total_amount).toLocaleString()} DH a été refusé. Veuillez vérifier avec votre superviseur.`,
                data: payload.new,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Deposits channel status:', status);
      });

    // Subscribe to stock movements for delivery persons (for manual withdrawal notifications)
    let stockMovementsChannel: any = null;
    if (role === 'livreur') {
      // Get delivery person ID for current user
      const setupStockNotifications = async () => {
        const { data: deliveryPerson } = await supabase
          .from('delivery_persons')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (deliveryPerson) {
          stockMovementsChannel = supabase
            .channel('stock-movements-delivery')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'stock_movements',
                filter: `delivery_person_id=eq.${deliveryPerson.id}`,
              },
              async (payload) => {
                console.log('Stock movement detected:', payload);

                // Only notify on adjustment type movements (manual withdrawals)
                if (payload.new.movement_type === 'adjustment' && payload.new.quantity < 0) {
                  const { data: product } = await supabase
                    .from('products')
                    .select('name')
                    .eq('id', payload.new.product_id)
                    .single();

                  const absQty = Math.abs(payload.new.quantity);
                  const notes = payload.new.notes || 'Aucun motif fourni';

                  addNotification({
                    type: 'stock_adjustment',
                    title: '⚠️ Retrait de stock',
                    message: `${absQty} unité(s) de ${product?.name || 'produit'} ont été retirées de votre stock. Motif: ${notes}`,
                    data: payload.new,
                  });
                }
              }
            )
            .subscribe((status) => {
              console.log('Stock movements channel status:', status);
            });
        }
      };

      setupStockNotifications();
    }

    return () => {
      console.log('Cleaning up Supabase Realtime subscriptions...');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(followUpsChannel);
      supabase.removeChannel(depositsChannel);
      if (stockMovementsChannel) {
        supabase.removeChannel(stockMovementsChannel);
      }
    };
  }, [user, role, addNotification]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
