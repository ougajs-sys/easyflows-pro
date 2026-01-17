import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAIAgent } from "@/hooks/useAIAgent";
import { 
  Bot, 
  Send, 
  Loader2, 
  Users, 
  Package, 
  CreditCard, 
  AlertTriangle, 
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Package,
  CreditCard,
  AlertTriangle,
  Star,
};

export default function AIAgent() {
  const [instruction, setInstruction] = useState("");
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const { instructions, isLoadingHistory, isProcessing, sendInstruction, quickActions } = useAIAgent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isProcessing) return;

    try {
      const result = await sendInstruction.mutateAsync(instruction);
      setLastResponse(result.message);
      setInstruction("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleQuickAction = async (actionInstruction: string) => {
    try {
      const result = await sendInstruction.mutateAsync(actionInstruction);
      setLastResponse(result.message);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Terminé</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> En cours</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Échoué</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
    }
  };

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
              Donnez des instructions en langage naturel pour automatiser vos tâches
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Instruction Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Nouvelle instruction
                </CardTitle>
                <CardDescription>
                  Décrivez ce que vous voulez faire. L'IA comprendra et exécutera l'action appropriée.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ex: Distribue équitablement les commandes confirmées d'aujourd'hui entre tous les appelants actifs"
                    className="min-h-[100px] resize-none"
                    disabled={isProcessing}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Appuyez sur Entrée ou cliquez sur Envoyer
                    </p>
                    <Button type="submit" disabled={!instruction.trim() || isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Last Response */}
            {lastResponse && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Bot className="w-5 h-5" />
                    Réponse de l'Agent IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-background/50 p-4 rounded-lg">
                    {lastResponse}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Actions rapides
                </CardTitle>
                <CardDescription>
                  Cliquez sur une action pour l'exécuter immédiatement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = iconMap[action.icon] || Package;
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className="h-auto py-4 px-4 justify-start gap-3 hover:bg-primary/10 hover:border-primary/50"
                        onClick={() => handleQuickAction(action.instruction)}
                        disabled={isProcessing}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{action.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {action.instruction}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Historique
                </CardTitle>
                <CardDescription>
                  Vos dernières instructions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : instructions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune instruction pour le moment</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {instructions.map((instr) => (
                        <div key={instr.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            {getStatusBadge(instr.status)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(instr.created_at), "dd/MM HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2 mb-2">{instr.instruction}</p>
                          {instr.affected_count > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {instr.affected_count} élément(s) affecté(s)
                            </p>
                          )}
                          {instr.result?.message && (
                            <p className="text-xs text-primary mt-1 line-clamp-2">
                              {instr.result.message.substring(0, 100)}...
                            </p>
                          )}
                          {instr.error_message && (
                            <p className="text-xs text-destructive mt-1">
                              {instr.error_message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
