import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ActionCategory, QuickAction } from "@/components/ai-agent/AIQuickActions";

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
        title: "C'est fait !",
        description: data.affected_count > 0 
          ? `${data.affected_count} éléments traités`
          : "Action terminée",
      });
    },
    onError: (error) => {
      toast({
        title: "Oups !",
        description: error instanceof Error ? error.message : "Quelque chose s'est mal passé",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Action categories organized for the new UI
  const actionCategories: ActionCategory[] = [
    {
      id: "operations",
      label: "Opérations",
      icon: "Package",
      color: "primary",
      actions: [
        {
          id: "distribute-pending",
          label: "Distribuer aux appelants",
          description: "Répartir les commandes en attente entre les appelants actifs",
          instruction: "Distribue équitablement toutes les commandes en attente (pending) entre les appelants actifs",
          icon: "Users",
        },
        {
          id: "distribute-confirmed-delivery",
          label: "Distribuer aux livreurs",
          description: "Envoyer les commandes confirmées aux livreurs disponibles",
          instruction: "Distribue équitablement toutes les commandes confirmées aux livreurs disponibles en équilibrant selon leur charge de travail actuelle",
          icon: "Truck",
        },
        {
          id: "stock-alerts",
          label: "Alertes stock",
          description: "Voir les produits en rupture ou stock bas",
          instruction: "Liste tous les produits avec un stock inférieur ou égal à 10 unités et crée des alertes",
          icon: "AlertTriangle",
        },
      ],
    },
    {
      id: "clients",
      label: "Clients & Relances",
      icon: "Users",
      color: "blue",
      actions: [
        {
          id: "create-payment-followups",
          label: "Relances paiements",
          description: "Créer des relances pour les paiements partiels",
          instruction: "Crée des relances de type paiement pour toutes les commandes avec statut 'partial' de plus de 3 jours",
          icon: "CreditCard",
        },
        {
          id: "vip-followups",
          label: "Suivi clients VIP",
          description: "Voir l'activité des meilleurs clients",
          instruction: "Identifie les clients VIP et affiche un résumé de leur activité récente",
          icon: "Star",
        },
        {
          id: "inactive-clients",
          label: "Clients inactifs",
          description: "Trouver les clients qui n'ont pas commandé récemment",
          instruction: "Liste les clients qui n'ont pas commandé depuis plus de 30 jours avec leur historique",
          icon: "Users",
        },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: "Sparkles",
      color: "accent",
      actions: [
        {
          id: "analyze-opportunities",
          label: "Analyser opportunités",
          description: "Trouver des opportunités de vente",
          instruction: "Analyse les opportunités marketing: clients inactifs à relancer, paniers abandonnés, clients fidèles sans achat récent",
          icon: "Target",
        },
        {
          id: "propose-campaign",
          label: "Proposer campagne",
          description: "Générer une idée de campagne SMS",
          instruction: "Propose une campagne SMS personnalisée basée sur les données clients actuelles avec message et cible",
          icon: "Send",
        },
        {
          id: "reactivate-inactive",
          label: "Relancer inactifs",
          description: "Préparer une campagne de réactivation",
          instruction: "Prépare une campagne de réactivation pour les clients inactifs depuis plus d'un mois avec un message personnalisé",
          icon: "TrendingUp",
        },
      ],
    },
    {
      id: "performance",
      label: "Performance",
      icon: "TrendingUp",
      color: "success",
      actions: [
        {
          id: "global-diagnostic",
          label: "Diagnostic complet",
          description: "Analyse complète de la boutique",
          instruction: "Fais un diagnostic complet de la boutique: commandes, stock, équipe, et donne des recommandations concrètes",
          icon: "BarChart3",
        },
        {
          id: "daily-plan",
          label: "Plan du jour",
          description: "Ce qu'il faut faire aujourd'hui",
          instruction: "Génère un plan d'action pour aujourd'hui basé sur les priorités: commandes en attente, stocks bas, relances à faire",
          icon: "Calendar",
        },
        {
          id: "team-coaching",
          label: "Coaching équipe",
          description: "Conseils pour améliorer l'équipe",
          instruction: "Analyse les performances de l'équipe (appelants et livreurs) et donne des conseils personnalisés pour chacun",
          icon: "UserCheck",
        },
      ],
    },
  ];

  // Flat list of quick actions for backward compatibility
  const quickActions: QuickAction[] = actionCategories.flatMap(cat => cat.actions);

  // Configurable actions that need the dialog
  const configurableActionIds = [
    "distribute-pending",
    "distribute-confirmed-callers",
    "distribute-confirmed-delivery",
  ];

  return {
    instructions,
    isLoadingHistory,
    isProcessing,
    sendInstruction,
    quickActions,
    actionCategories,
    configurableActionIds,
  };
}
