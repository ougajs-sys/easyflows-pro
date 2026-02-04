import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIAgent } from "@/hooks/useAIAgent";
import { QuickActionConfigDialog } from "@/components/ai-agent/QuickActionConfigDialog";
import { AIConversation } from "@/components/ai-agent/AIConversation";
import { AIQuickActions, QuickAction } from "@/components/ai-agent/AIQuickActions";
import { AIPerformanceDashboard } from "@/components/ai-agent/AIPerformanceDashboard";
import { Recommendation } from "@/components/ai-agent/AIRecommendationCard";
import {
  Bot,
  MessageSquare,
  Zap,
  Lightbulb,
  Truck,
  Phone,
  Package,
} from "lucide-react";

export default function AIAgent() {
  const [activeTab, setActiveTab] = useState("conseils");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);

  const {
    instructions,
    isLoadingHistory,
    isProcessing,
    sendInstruction,
    actionCategories,
    configurableActionIds,
  } = useAIAgent();

  // Handle sending instruction from conversation
  const handleSendInstruction = async (instruction: string) => {
    await sendInstruction.mutateAsync(instruction);
  };

  // Handle quick action click
  const handleQuickActionClick = (action: QuickAction) => {
    if (configurableActionIds.includes(action.id)) {
      setSelectedAction(action);
      setConfigDialogOpen(true);
    } else {
      handleExecuteAction(action.instruction);
    }
  };

  // Execute action
  const handleExecuteAction = async (actionInstruction: string) => {
    try {
      await sendInstruction.mutateAsync(actionInstruction);
      setConfigDialogOpen(false);
      setSelectedAction(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Handle performance quick action
  const handlePerformanceQuickAction = (actionId: string) => {
    const actionMap: Record<string, string> = {
      "global-diagnostic": "Fais un diagnostic complet de la boutique: commandes, stock, équipe, et donne des recommandations concrètes",
      "daily-plan": "Génère un plan d'action pour aujourd'hui basé sur les priorités: commandes en attente, stocks bas, relances à faire",
      "team-coaching": "Analyse les performances de l'équipe (appelants et livreurs) et donne des conseils personnalisés pour chacun",
    };
    
    const instruction = actionMap[actionId];
    if (instruction) {
      handleExecuteAction(instruction);
    }
  };

  // Mock data for performance dashboard
  // TODO: Replace with real data from AI analysis
  const mockScore = 72;
  const mockScoreDelta = 3;
  const mockMetrics = [
    { label: "Livraisons", value: "85%", trend: "up" as const, icon: Truck },
    { label: "Conversion", value: "7/10", trend: "neutral" as const, icon: Phone },
    { label: "Stock", value: "OK", trend: "up" as const, icon: Package },
  ];

  const mockRecommendations: Recommendation[] = [
    {
      id: "1",
      type: "urgent",
      title: "8 commandes en attente",
      description: "Ces commandes n'ont pas encore été assignées à un appelant",
      actionLabel: "Distribuer",
      instruction: "Distribue équitablement toutes les commandes en attente entre les appelants actifs",
    },
    {
      id: "2",
      type: "warning",
      title: "Zone Nord surchargée",
      description: "Un seul livreur pour 12 commandes - rééquilibrer la charge",
      actionLabel: "Répartir",
      instruction: "Rééquilibre les commandes de la zone Nord entre tous les livreurs disponibles",
    },
    {
      id: "3",
      type: "info",
      title: "3 produits en stock bas",
      description: "Huile d'argan, Savon noir, Ghassoul - pensez à réapprovisionner",
      actionLabel: "Voir",
      instruction: "Liste les produits avec un stock inférieur à 10 unités",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent IA</h1>
            <p className="text-muted-foreground">
              Ton assistant pour gérer la boutique simplement
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="conseils" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Conseils</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
            <TabsTrigger value="parler" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Parler</span>
            </TabsTrigger>
          </TabsList>

          {/* Conseils Tab - Performance Dashboard */}
          <TabsContent value="conseils" className="mt-0">
            <AIPerformanceDashboard
              score={mockScore}
              scoreDelta={mockScoreDelta}
              metrics={mockMetrics}
              recommendations={mockRecommendations}
              onActionClick={handleExecuteAction}
              onQuickAction={handlePerformanceQuickAction}
              isProcessing={isProcessing}
            />
          </TabsContent>

          {/* Actions Tab - Quick Actions Grid */}
          <TabsContent value="actions" className="mt-0">
            <AIQuickActions
              categories={actionCategories}
              onActionClick={handleQuickActionClick}
              isProcessing={isProcessing}
              configurableActionIds={configurableActionIds}
            />
          </TabsContent>

          {/* Parler Tab - Conversation */}
          <TabsContent value="parler" className="mt-0">
            <Card>
              <CardContent className="p-0">
                <AIConversation
                  instructions={instructions}
                  isProcessing={isProcessing}
                  onSendInstruction={handleSendInstruction}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Dialog */}
        <QuickActionConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          action={selectedAction}
          onConfirm={handleExecuteAction}
          isProcessing={isProcessing}
        />
      </div>
    </DashboardLayout>
  );
}
