import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Campaign {
  id: string;
  name: string;
  type: 'sms' | 'whatsapp';
  category: 'promotion' | 'relance' | 'notification' | 'custom';
  message: string;
  segment: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const BATCH_SIZE = 500;

export const useCampaigns = () => {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'sent_count' | 'failed_count' | 'sent_at'>) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      // Get campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (campaignError) throw campaignError;

      // Get clients based on segment — fetch all pages (bypass 1000 row limit)
      let allClients: { id: string; phone: string }[] = [];
      let from = 0;
      const pageSize = 1000;

      const isGroupSegment = campaign.segment && campaign.segment.startsWith('campaign_group:');
      const isProductSegment = campaign.segment && (campaign.segment.startsWith('product:') || campaign.segment.startsWith('product_cancelled:'));
      const groupName = isGroupSegment ? campaign.segment!.replace('campaign_group:', '') : null;

      // Product segments: fetch clients from orders
      if (isProductSegment) {
        const isCancelled = campaign.segment!.startsWith('product_cancelled:');
        const productId = campaign.segment!.replace(isCancelled ? 'product_cancelled:' : 'product:', '');
        
        let ordersQuery = supabase.from("orders").select("client_id").eq("product_id", productId);
        if (isCancelled) ordersQuery = ordersQuery.eq("status", "cancelled");
        
        const { data: orderRows, error: ordersError } = await ordersQuery;
        if (ordersError) throw ordersError;
        
        const uniqueClientIds = [...new Set((orderRows || []).map(o => o.client_id))];
        
        // Fetch client phones in batches
        for (let i = 0; i < uniqueClientIds.length; i += 100) {
          const batch = uniqueClientIds.slice(i, i + 100);
          const { data: clients } = await supabase.from("clients").select("id, phone").in("id", batch);
          if (clients) allClients = allClients.concat(clients);
        }
      } else {
        // Standard segment logic with pagination
        while (true) {
          let clientsQuery = supabase.from("clients").select("id, phone").range(from, from + pageSize - 1);
          
          if (isGroupSegment && groupName) {
            clientsQuery = clientsQuery.eq("campaign_group", groupName);
          } else if (campaign.segment && campaign.segment !== 'all') {
            const validSegments = ['new', 'regular', 'vip', 'inactive', 'problematic'] as const;
            if (validSegments.includes(campaign.segment as any)) {
              clientsQuery = clientsQuery.eq("segment", campaign.segment as typeof validSegments[number]);
            }
          }

          const { data: clients, error: clientsError } = await clientsQuery;
          if (clientsError) throw clientsError;

          if (!clients || clients.length === 0) break;
          allClients = allClients.concat(clients);
          if (clients.length < pageSize) break;
          from += pageSize;
        }
      }

      if (allClients.length === 0) {
        throw new Error("Aucun client trouvé pour ce segment");
      }

      // Update campaign status and total recipients
      await supabase.from("campaigns").update({
        status: "sending",
        total_recipients: allClients.length,
      }).eq("id", campaignId);

      // Send in batches of 500
      const phones = allClients.map(c => c.phone);
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const batch = phones.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: {
            campaign_id: campaignId,
            phones: batch,
            message: campaign.message,
            type: campaign.type,
          },
        });

        if (error) {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
          totalFailed += batch.length;
        } else if (data) {
          totalSent += data.sent || 0;
          totalFailed += data.failed || 0;
        }
      }

      // Final update with cumulative totals
      await supabase.from("campaigns").update({
        sent_count: totalSent,
        failed_count: totalFailed,
        status: "completed",
        sent_at: new Date().toISOString(),
      }).eq("id", campaignId);

      return { sent: totalSent, failed: totalFailed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
  };
};
