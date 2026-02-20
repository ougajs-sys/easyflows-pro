import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface ClientSegment {
  id: string;
  label: string;
  description: string;
  count: number;
  category: 'status' | 'behavior' | 'frequency' | 'group' | 'product';
}

export function useClientSegments() {
  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['client-segments'],
    queryFn: async () => {
      // Fetch all clients with their orders
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, segment, total_orders, total_spent, created_at, campaign_group, campaign_batch');

      if (clientsError) throw clientsError;

      // Fetch all orders for analysis (include product_id)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, client_id, status, created_at, total_amount, product_id');

      if (ordersError) throw ordersError;

      // Fetch products for product segmentation
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true);

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);
      const ninetyDaysAgo = subDays(now, 90);
      const sixMonthsAgo = subDays(now, 180);

      // Group orders by client
      const ordersByClient = orders?.reduce((acc, order) => {
        if (!acc[order.client_id]) {
          acc[order.client_id] = [];
        }
        acc[order.client_id].push(order);
        return acc;
      }, {} as Record<string, typeof orders>) || {};

      // Calculate segments
      const segmentCounts: Record<string, Set<string>> = {
        // Status-based
        all: new Set(),
        confirmed_paid: new Set(),
        cancelled: new Set(),
        reported: new Set(),
        pending: new Set(),
        // Behavior-based
        new: new Set(),
        regular: new Set(),
        vip: new Set(),
        inactive_30: new Set(),
        inactive_60: new Set(),
        inactive_90: new Set(),
        // Frequency-based
        frequent: new Set(),
        occasional: new Set(),
        lost: new Set(),
      };

      clients?.forEach((client) => {
        const clientOrders = ordersByClient[client.id] || [];
        segmentCounts.all.add(client.id);

        // Status-based segments
        const hasConfirmed = clientOrders.some(o => o.status === 'delivered' || o.status === 'confirmed');
        const hasCancelled = clientOrders.some(o => o.status === 'cancelled');
        const hasReported = clientOrders.some(o => o.status === 'reported');
        const hasPending = clientOrders.some(o => o.status === 'pending' || o.status === 'partial');

        if (hasConfirmed) segmentCounts.confirmed_paid.add(client.id);
        if (hasCancelled) segmentCounts.cancelled.add(client.id);
        if (hasReported) segmentCounts.reported.add(client.id);
        if (hasPending) segmentCounts.pending.add(client.id);

        // Behavior-based segments
        const deliveredOrders = clientOrders.filter(o => o.status === 'delivered');
        const totalOrders = deliveredOrders.length;
        const totalSpent = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        if (totalOrders === 0 || totalOrders === 1) {
          segmentCounts.new.add(client.id);
        }
        if (totalOrders >= 3) {
          segmentCounts.regular.add(client.id);
        }
        if (totalOrders >= 5 || totalSpent >= 100000) {
          segmentCounts.vip.add(client.id);
        }

        // Inactivity check
        const lastOrderDate = clientOrders.length > 0 
          ? new Date(Math.max(...clientOrders.map(o => new Date(o.created_at).getTime())))
          : null;

        if (lastOrderDate) {
          if (lastOrderDate < thirtyDaysAgo) segmentCounts.inactive_30.add(client.id);
          if (lastOrderDate < sixtyDaysAgo) segmentCounts.inactive_60.add(client.id);
          if (lastOrderDate < ninetyDaysAgo) segmentCounts.inactive_90.add(client.id);
          if (lastOrderDate < sixMonthsAgo) segmentCounts.lost.add(client.id);
        } else if (clientOrders.length === 0) {
          // No orders at all - could be new registration
          segmentCounts.inactive_30.add(client.id);
        }

        // Frequency analysis (last 90 days)
        const recentOrders = clientOrders.filter(o => new Date(o.created_at) >= ninetyDaysAgo);
        if (recentOrders.length >= 3) {
          segmentCounts.frequent.add(client.id);
        } else if (recentOrders.length >= 1) {
          segmentCounts.occasional.add(client.id);
        }
      });

      // Campaign group segments
      const groupCounts: Record<string, number> = {};
      clients?.forEach((client) => {
        if (client.campaign_group) {
          groupCounts[client.campaign_group] = (groupCounts[client.campaign_group] || 0) + 1;
        }
      });

      const groupSegments: ClientSegment[] = Object.entries(groupCounts)
        .sort(([a], [b]) => {
          const numA = parseInt(a.replace('Group-C-', ''));
          const numB = parseInt(b.replace('Group-C-', ''));
          return numA - numB;
        })
        .map(([groupName, count]) => ({
          id: `campaign_group:${groupName}`,
          label: groupName,
          description: `${count} contacts dans ce groupe`,
          count,
          category: 'group' as const,
        }));

      // Product-based segments (clients who ordered each product + cancelled orders per product)
      const productClientSets: Record<string, Set<string>> = {};
      const productCancelledSets: Record<string, Set<string>> = {};
      
      orders?.forEach((order) => {
        if (order.product_id) {
          if (!productClientSets[order.product_id]) {
            productClientSets[order.product_id] = new Set();
            productCancelledSets[order.product_id] = new Set();
          }
          productClientSets[order.product_id].add(order.client_id);
          if (order.status === 'cancelled') {
            productCancelledSets[order.product_id].add(order.client_id);
          }
        }
      });

      const productSegments: ClientSegment[] = [];
      (products || []).forEach((product) => {
        const clientCount = productClientSets[product.id]?.size || 0;
        const cancelledCount = productCancelledSets[product.id]?.size || 0;
        if (clientCount > 0) {
          productSegments.push({
            id: `product:${product.id}`,
            label: product.name,
            description: `${clientCount} clients ayant commandé ce produit`,
            count: clientCount,
            category: 'product' as const,
          });
        }
        if (cancelledCount > 0) {
          productSegments.push({
            id: `product_cancelled:${product.id}`,
            label: `${product.name} (annulés)`,
            description: `${cancelledCount} clients ayant annulé ce produit`,
            count: cancelledCount,
            category: 'product' as const,
          });
        }
      });

      const result: ClientSegment[] = [
        // All clients
        { id: 'all', label: 'Tous les clients', description: 'Tous les clients de la base', count: segmentCounts.all.size, category: 'status' },
        
        // Status-based
        { id: 'confirmed_paid', label: 'Clients Actifs - Confirmés', description: 'Commandes confirmées et payées', count: segmentCounts.confirmed_paid.size, category: 'status' },
        { id: 'cancelled', label: 'Clients Annulations', description: 'Ayant annulé au moins une commande', count: segmentCounts.cancelled.size, category: 'status' },
        { id: 'reported', label: 'Clients Reportés', description: 'Ayant reporté au moins une commande', count: segmentCounts.reported.size, category: 'status' },
        { id: 'pending', label: 'Clients En Attente', description: 'Commandes en attente de confirmation', count: segmentCounts.pending.size, category: 'status' },
        
        // Behavior-based
        { id: 'new', label: 'Nouveaux clients', description: 'Première commande ou aucune', count: segmentCounts.new.size, category: 'behavior' },
        { id: 'regular', label: 'Clients fidèles', description: '3+ commandes réussies', count: segmentCounts.regular.size, category: 'behavior' },
        { id: 'vip', label: 'Clients VIP', description: '5+ commandes ou 100k+ FCFA', count: segmentCounts.vip.size, category: 'behavior' },
        { id: 'inactive_30', label: 'Inactifs 30 jours', description: 'Pas de commande depuis 30 jours', count: segmentCounts.inactive_30.size, category: 'behavior' },
        { id: 'inactive_60', label: 'Inactifs 60 jours', description: 'Pas de commande depuis 60 jours', count: segmentCounts.inactive_60.size, category: 'behavior' },
        { id: 'inactive_90', label: 'Inactifs 90 jours', description: 'Pas de commande depuis 90 jours', count: segmentCounts.inactive_90.size, category: 'behavior' },
        
        // Frequency-based
        { id: 'frequent', label: 'Clients réguliers', description: '3+ commandes ces 90 derniers jours', count: segmentCounts.frequent.size, category: 'frequency' },
        { id: 'occasional', label: 'Clients occasionnels', description: '1-2 commandes ces 90 derniers jours', count: segmentCounts.occasional.size, category: 'frequency' },
        { id: 'lost', label: 'Clients perdus', description: 'Aucune commande depuis 6 mois', count: segmentCounts.lost.size, category: 'frequency' },

        // Campaign groups
        ...groupSegments,

        // Product segments
        ...productSegments,
      ];

      return result;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getClientsForSegment = async (segmentId: string): Promise<{ id: string; full_name: string; phone: string }[]> => {
    // Re-fetch with same logic but return client list
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name, phone, total_orders, total_spent, created_at, campaign_group');

    // Handle campaign group segments directly
    if (segmentId.startsWith('campaign_group:')) {
      const groupName = segmentId.replace('campaign_group:', '');
      const filtered = (clients || []).filter(c => c.campaign_group === groupName);
      return filtered.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
    }

    // Handle product segments
    if (segmentId.startsWith('product:') || segmentId.startsWith('product_cancelled:')) {
      const isCancelled = segmentId.startsWith('product_cancelled:');
      const productId = segmentId.replace(isCancelled ? 'product_cancelled:' : 'product:', '');
      const { data: orders } = await supabase
        .from('orders')
        .select('client_id, status')
        .eq('product_id', productId);
      
      const clientIds = new Set<string>();
      (orders || []).forEach(o => {
        if (isCancelled ? o.status === 'cancelled' : true) {
          clientIds.add(o.client_id);
        }
      });
      
      const filtered = (clients || []).filter(c => clientIds.has(c.id));
      return filtered.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('id, client_id, status, created_at, total_amount');

    if (!clients) return [];

    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    const ninetyDaysAgo = subDays(now, 90);
    const sixMonthsAgo = subDays(now, 180);

    const ordersByClient = orders?.reduce((acc, order) => {
      if (!acc[order.client_id]) acc[order.client_id] = [];
      acc[order.client_id].push(order);
      return acc;
    }, {} as Record<string, typeof orders>) || {};

    const filteredClients = clients.filter((client) => {
      const clientOrders = ordersByClient[client.id] || [];
      const deliveredOrders = clientOrders.filter(o => o.status === 'delivered');
      const totalOrders = deliveredOrders.length;
      const totalSpent = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const lastOrderDate = clientOrders.length > 0 
        ? new Date(Math.max(...clientOrders.map(o => new Date(o.created_at).getTime())))
        : null;
      const recentOrders = clientOrders.filter(o => new Date(o.created_at) >= ninetyDaysAgo);

      switch (segmentId) {
        case 'all': return true;
        case 'confirmed_paid': return clientOrders.some(o => o.status === 'delivered' || o.status === 'confirmed');
        case 'cancelled': return clientOrders.some(o => o.status === 'cancelled');
        case 'reported': return clientOrders.some(o => o.status === 'reported');
        case 'pending': return clientOrders.some(o => o.status === 'pending' || o.status === 'partial');
        case 'new': return totalOrders <= 1;
        case 'regular': return totalOrders >= 3;
        case 'vip': return totalOrders >= 5 || totalSpent >= 100000;
        case 'inactive_30': return !lastOrderDate || lastOrderDate < thirtyDaysAgo;
        case 'inactive_60': return !lastOrderDate || lastOrderDate < sixtyDaysAgo;
        case 'inactive_90': return !lastOrderDate || lastOrderDate < ninetyDaysAgo;
        case 'frequent': return recentOrders.length >= 3;
        case 'occasional': return recentOrders.length >= 1 && recentOrders.length < 3;
        case 'lost': return !lastOrderDate || lastOrderDate < sixMonthsAgo;
        default: return true;
      }
    });

    return filteredClients.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
  };

  return {
    segments,
    isLoading,
    getClientsForSegment,
  };
}
