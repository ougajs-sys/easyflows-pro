import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, X, Target, MessageSquare, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CampaignProposal {
  id: string;
  title: string;
  analysis: string;
  target_segment: string;
  target_count: number;
  campaign_type: string;
  channel: string;
  proposed_message: string;
  status: string;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  recovery: "Récupération",
  reactivation: "Réactivation",
  loyalty: "Fidélisation",
  promotion: "Promotion",
};

const typeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  recovery: "destructive",
  reactivation: "default",
  loyalty: "secondary",
  promotion: "outline",
};

export function AICampaignProposals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["ai-campaign-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_campaign_proposals" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as CampaignProposal[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("ai_campaign_proposals" as any)
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", proposalId);
      if (error) throw error;

      // Trigger campaign execution via AI agent
      await supabase.functions.invoke("ai-agent", {
        body: {
          instruction: `Exécute la campagne approuvée. Crée une campagne "${proposals.find(p => p.id === proposalId)?.title}" avec le message "${proposals.find(p => p.id === proposalId)?.proposed_message}" pour le segment "${proposals.find(p => p.id === proposalId)?.target_segment}" via ${proposals.find(p => p.id === proposalId)?.channel}.`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-campaign-proposals"] });
      toast({ title: "Campagne approuvée !", description: "Easy-Claw lance la campagne." });
    },
    onError: (err) => {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ proposalId, reason }: { proposalId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("ai_campaign_proposals" as any)
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        } as any)
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-campaign-proposals"] });
      setRejectingId(null);
      setRejectReason("");
      toast({ title: "Proposition rejetée" });
    },
  });

  const pendingProposals = proposals.filter(p => p.status === "pending");
  const processedProposals = proposals.filter(p => p.status !== "pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune proposition pour l'instant</h3>
          <p className="text-muted-foreground">
            Easy-Claw analyse vos données toutes les 48h et propose des campagnes marketing ciblées.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending proposals */}
      {pendingProposals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            En attente de validation ({pendingProposals.length})
          </h3>
          {pendingProposals.map((proposal) => (
            <Card key={proposal.id} className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{proposal.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(proposal.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant={typeBadgeVariant[proposal.campaign_type] || "default"}>
                    {typeLabels[proposal.campaign_type] || proposal.campaign_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Analysis */}
                <div className="bg-background/60 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                    <Target className="w-4 h-4" /> Analyse
                  </p>
                  <p className="text-sm text-muted-foreground">{proposal.analysis}</p>
                </div>

                {/* Target & Channel */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{proposal.target_count}</span> clients ciblés
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    {proposal.channel === "whatsapp" ? "WhatsApp" : "SMS"}
                  </div>
                </div>

                {/* Message */}
                <div className="bg-background/60 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">💬 Message proposé</p>
                  <p className="text-sm italic text-muted-foreground">"{proposal.proposed_message}"</p>
                </div>

                {/* Actions */}
                {rejectingId === proposal.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Raison du rejet (optionnel)..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ proposalId: proposal.id, reason: rejectReason })}
                        disabled={rejectMutation.isPending}
                      >
                        Confirmer le rejet
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => approveMutation.mutate(proposal.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approuver & Lancer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setRejectingId(proposal.id)}
                    >
                      <X className="w-4 h-4" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Processed proposals */}
      {processedProposals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Historique</h3>
          {processedProposals.map((proposal) => (
            <Card key={proposal.id} className="opacity-70">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{proposal.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(proposal.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant={proposal.status === "approved" ? "default" : "secondary"}>
                    {proposal.status === "approved" ? "✅ Approuvée" : "❌ Rejetée"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
