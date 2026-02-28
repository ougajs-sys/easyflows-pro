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

  // Send campaign via Edge function (all orchestration server-side)
  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { sent: data?.sent || 0, failed: data?.failed || 0 };
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
