import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DeliveryStock {
  id: string;
  delivery_person_id: string;
  product_id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
  };
}

interface ManualWithdrawalDialogProps {
  deliveryPersonId: string;
  deliveryPersonName: string;
  stockItems: DeliveryStock[];
  trigger: React.ReactNode;
}

export function ManualWithdrawalDialog({
  deliveryPersonId,
  deliveryPersonName,
  stockItems,
  trigger,
}: ManualWithdrawalDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const selectedStock = stockItems.find((s) => s.product_id === selectedProduct);

  const resetForm = () => {
    setSelectedProduct("");
    setQuantity("");
    setReason("");
  };

  const withdrawalMutation = useMutation({
    mutationFn: async ({
      productId,
      qty,
      withdrawalReason,
    }: {
      productId: string;
      qty: number;
      withdrawalReason: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)("manual_withdrawal_from_delivery", {
        p_delivery_person_id: deliveryPersonId,
        p_product_id: productId,
        p_quantity: qty,
        p_reason: withdrawalReason,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Erreur lors du retrait");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-delivery-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stock", deliveryPersonId] });
      queryClient.invalidateQueries({ queryKey: ["products-for-transfer"] });
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success("Retrait effectué avec succès");
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du retrait");
    },
  });

  const handleWithdrawal = () => {
    // Validation
    if (!selectedProduct) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      toast.error("Veuillez entrer une quantité valide");
      return;
    }

    if (!reason || reason.trim() === "") {
      toast.error("Le motif du retrait est obligatoire");
      return;
    }

    const qty = parseInt(quantity);

    if (selectedStock && qty > selectedStock.quantity) {
      toast.error("Quantité supérieure au stock disponible");
      return;
    }

    withdrawalMutation.mutate({
      productId: selectedProduct,
      qty,
      withdrawalReason: reason.trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Retrait manuel de stock
          </DialogTitle>
          <DialogDescription>
            Retirer du stock de <strong>{deliveryPersonName}</strong> et le retourner à la boutique
            centrale. Le livreur sera notifié.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Produit *</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {stockItems.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Aucun stock disponible
                  </div>
                ) : (
                  stockItems.map((item) => (
                    <SelectItem key={item.product_id} value={item.product_id}>
                      {item.product?.name} (Stock: {item.quantity})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité à retirer *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedStock?.quantity || 999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 5"
            />
            {selectedStock && (
              <p className="text-sm text-muted-foreground">
                Stock disponible: <strong>{selectedStock.quantity}</strong>
              </p>
            )}
          </div>

          {/* Reason/Motif */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motif du retrait *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Stock excédentaire, réorganisation, erreur d'allocation..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ce motif sera enregistré et visible dans l'historique
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            disabled={withdrawalMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleWithdrawal}
            disabled={withdrawalMutation.isPending || stockItems.length === 0}
            variant="destructive"
          >
            {withdrawalMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Retrait en cours...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Retirer le stock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
