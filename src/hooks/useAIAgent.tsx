import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIInstruction {
  id: string;
  instruction: string;
  instruction_type: string;
  status: string;
  created_by: string;
  executed_at: string | null;
  result: { message?: string; actions?: unknown[] } | null;
  error_message: string | null;
  affected_count: number;
  created_at: string;
}

interface AIResponse {
  success: boolean;
  message: string;
  affected_count: number;
  instruction_id: string;
}

export function useAIAgent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch instruction history
  const { data: instructions = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["ai-instructions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_instructions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AIInstruction[];
    },
  });

  // Send instruction mutation
  const sendInstruction = useMutation({
    mutationFn: async (instruction: string): Promise<AIResponse> => {
      setIsProcessing(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Non authentifié");
      }

      console.log("Calling AI Agent with instruction:", instruction);
      
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: { instruction },
      });

      console.log("AI Agent response:", { data, error });

      if (error) {
        // Check for specific error messages
        const errorMessage = error.message || "Erreur lors de l'exécution";
        if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
          throw new Error("Limite de requêtes atteinte. Réessayez dans quelques minutes.");
        }
        if (errorMessage.includes("403") || errorMessage.includes("Access denied")) {
          throw new Error("Accès refusé. Seuls les superviseurs et administrateurs peuvent utiliser l'Agent IA.");
        }
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("Aucune réponse reçue de l'Agent IA");
      }

      return data as AIResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-instructions"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      toast({
        title: "Instruction exécutée",
        description: data.affected_count > 0 
          ? `${data.affected_count} éléments affectés`
          : "Traitement terminé",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Quick actions
  const quickActions = [
    {
      id: "distribute-pending",
      label: "Distribuer commandes en attente",
      instruction: "Distribue équitablement toutes les commandes en attente (pending) entre les appelants actifs",
      icon: "Users",
    },
    {
      id: "distribute-confirmed-callers",
      label: "Distribuer confirmées aux appelants",
      instruction: "Distribue équitablement toutes les commandes confirmées non assignées entre les appelants actifs",
      icon: "Phone",
    },
    {
      id: "distribute-confirmed-delivery",
      label: "Distribuer confirmées aux livreurs",
      instruction: "Distribue équitablement toutes les commandes confirmées aux livreurs disponibles en équilibrant selon leur charge de travail actuelle",
      icon: "Truck",
    },
    {
      id: "create-payment-followups",
      label: "Relances paiements partiels",
      instruction: "Crée des relances de type paiement pour toutes les commandes avec statut 'partial' de plus de 3 jours",
      icon: "CreditCard",
    },
    {
      id: "stock-alerts",
      label: "Alertes stock critique",
      instruction: "Liste tous les produits avec un stock inférieur ou égal à 10 unités et crée des alertes",
      icon: "AlertTriangle",
    },
    {
      id: "vip-followups",
      label: "Suivi clients VIP",
      instruction: "Identifie les clients VIP et affiche un résumé de leur activité récente",
      icon: "Star",
    },
  ];

  return {
    instructions,
    isLoadingHistory,
    isProcessing,
    sendInstruction,
    quickActions,
  };
}
