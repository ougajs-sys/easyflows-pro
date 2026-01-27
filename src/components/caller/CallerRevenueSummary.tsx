import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCollectedRevenues, useRealtimeRevenues } from "@/hooks/useCollectedRevenues";
import { formatCurrency } from "@/lib/formatCurrency";
import { DollarSign, TrendingUp, ArrowUpCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CallerRevenueSummary() {
  const { summary, summaryLoading, processDeposit, error } = useCollectedRevenues();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Enable real-time updates for revenue tracking
  useRealtimeRevenues();

  const handleDeposit = async () => {
    if (summary && summary.total_to_deposit <= 0) {
      toast.error("Aucune recette à verser");
      return;
    }

    try {
      await processDeposit.mutateAsync(notes || undefined);
      toast.success("Versement enregistré avec succès");
      setDepositDialogOpen(false);
      setNotes("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du versement");
    }
  };

  if (summaryLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show info message if data is unavailable due to error
  if (error) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-warning" />
            Mes Recettes du Jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2 py-4">
            <p className="text-sm font-medium text-warning">
              Fonctionnalité en cours de déploiement
            </p>
            <p className="text-xs text-muted-foreground">
              Le suivi des recettes sera bientôt disponible
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCollected = summary?.total_to_deposit || 0;
  const hasRevenuesToDeposit = totalCollected > 0;

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Mes Recettes du Jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Collected */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total encaissé</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalCollected)}
                  </p>
                  {summary && summary.collected_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {summary.collected_count} paiement{summary.collected_count > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              {hasRevenuesToDeposit && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                  À verser
                </Badge>
              )}
            </div>

            {/* Deposit Button */}
            <Button
              onClick={() => setDepositDialogOpen(true)}
              disabled={!hasRevenuesToDeposit || processDeposit.isPending}
              className="w-full"
              size="lg"
            >
              <ArrowUpCircle className="mr-2 h-5 w-5" />
              Verser mes recettes
            </Button>

            {!hasRevenuesToDeposit && (
              <p className="text-sm text-center text-muted-foreground">
                Aucune recette à verser pour le moment
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deposit Confirmation Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le versement</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de déclarer le versement de vos recettes encaissées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Montant total :</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalCollected)}
                </span>
              </div>
              {summary && summary.collected_count > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Basé sur {summary.collected_count} paiement{summary.collected_count > 1 ? 's' : ''} encaissé{summary.collected_count > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes (optionnel)
              </label>
              <Textarea
                id="notes"
                placeholder="Ajoutez des notes sur ce versement..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDepositDialogOpen(false)}
              disabled={processDeposit.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={processDeposit.isPending}
            >
              {processDeposit.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Confirmer le versement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
