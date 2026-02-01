import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePendingDeposits } from "@/hooks/usePendingDeposits";
import { formatCurrency } from "@/lib/formatCurrency";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  User,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export function PendingDepositsPanel() {
  const { 
    pendingDeposits, 
    isLoading, 
    confirmDeposit, 
    rejectDeposit 
  } = usePendingDeposits();
  
  const [selectedDeposit, setSelectedDeposit] = useState<{
    id: string;
    amount: number;
    depositor: string;
    action: 'confirm' | 'reject';
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleConfirm = async () => {
    if (!selectedDeposit) return;
    
    try {
      await confirmDeposit.mutateAsync(selectedDeposit.id);
      toast.success(`Versement de ${formatCurrency(selectedDeposit.amount)} confirmé`);
      setSelectedDeposit(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la confirmation");
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit) return;
    
    try {
      await rejectDeposit.mutateAsync({ 
        depositId: selectedDeposit.id, 
        reason: rejectReason || undefined 
      });
      toast.success("Versement rejeté");
      setSelectedDeposit(null);
      setRejectReason("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du rejet");
    }
  };

  if (isLoading) {
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

  if (pendingDeposits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Versements en Attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-muted-foreground">
              Aucun versement en attente de confirmation
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Versements en Attente
            <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-700">
              {pendingDeposits.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Vue Mobile: Cartes */}
            <div className="block md:hidden space-y-3">
              {pendingDeposits.map((deposit) => (
                <Card key={deposit.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {deposit.profile?.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {deposit.profile?.phone || ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      En attente
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Montant</p>
                      <p className="font-bold text-lg text-primary">
                        {formatCurrency(deposit.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">
                        {format(new Date(deposit.deposited_at), 'dd/MM HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedDeposit({
                        id: deposit.id,
                        amount: deposit.total_amount,
                        depositor: deposit.profile?.full_name || 'Utilisateur',
                        action: 'confirm'
                      })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirmer
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setSelectedDeposit({
                        id: deposit.id,
                        amount: deposit.total_amount,
                        depositor: deposit.profile?.full_name || 'Utilisateur',
                        action: 'reject'
                      })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Vue Desktop: Liste */}
            <div className="hidden md:block space-y-3">
              {pendingDeposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {deposit.profile?.full_name || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {deposit.profile?.phone || ''} • {deposit.revenues_count} paiement{deposit.revenues_count > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(deposit.deposited_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(deposit.total_amount)}
                      </p>
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        En attente
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedDeposit({
                          id: deposit.id,
                          amount: deposit.total_amount,
                          depositor: deposit.profile?.full_name || 'Utilisateur',
                          action: 'confirm'
                        })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSelectedDeposit({
                          id: deposit.id,
                          amount: deposit.total_amount,
                          depositor: deposit.profile?.full_name || 'Utilisateur',
                          action: 'reject'
                        })}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog 
        open={selectedDeposit?.action === 'confirm'} 
        onOpenChange={() => setSelectedDeposit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la réception</DialogTitle>
            <DialogDescription>
              Vous confirmez avoir reçu le versement de {selectedDeposit?.depositor}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Montant reçu :</span>
                <span className="text-2xl font-bold text-green-600">
                  {selectedDeposit && formatCurrency(selectedDeposit.amount)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedDeposit(null)}
              disabled={confirmDeposit.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmDeposit.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmDeposit.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmer la réception
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog 
        open={selectedDeposit?.action === 'reject'} 
        onOpenChange={() => {
          setSelectedDeposit(null);
          setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le versement</DialogTitle>
            <DialogDescription>
              Les recettes seront remises dans le compte de {selectedDeposit?.depositor} pour un nouveau versement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Montant rejeté :</span>
                <span className="text-2xl font-bold text-red-600">
                  {selectedDeposit && formatCurrency(selectedDeposit.amount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reject-reason" className="text-sm font-medium">
                Raison du rejet (optionnel)
              </label>
              <Textarea
                id="reject-reason"
                placeholder="Indiquez la raison du rejet..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDeposit(null);
                setRejectReason("");
              }}
              disabled={rejectDeposit.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectDeposit.isPending}
            >
              {rejectDeposit.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejet...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeter le versement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
