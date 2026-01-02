import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SmsTemplate {
  id: string;
  name: string;
  category: 'promotion' | 'relance' | 'notification' | 'custom';
  message: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSmsTemplates = () => {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        variables: t.variables || [],
        category: t.category as 'promotion' | 'relance' | 'notification' | 'custom'
      })) as SmsTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<SmsTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("sms_templates")
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SmsTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("sms_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sms_templates")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
    },
  });

  const templatesByCategory = {
    promotion: templates.filter(t => t.category === 'promotion'),
    relance: templates.filter(t => t.category === 'relance'),
    notification: templates.filter(t => t.category === 'notification'),
    custom: templates.filter(t => t.category === 'custom'),
  };

  return {
    templates,
    templatesByCategory,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
