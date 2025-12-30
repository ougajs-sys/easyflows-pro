import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Minus, Loader2 } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onAdjust: (id: string, quantity: number) => Promise<void>;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  onAdjust,
}: StockAdjustmentDialogProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operation, setOperation] = useState<"add" | "remove">("add");

  const handleSubmit = async () => {
    if (!product || quantity <= 0) return;

    try {
      setIsSubmitting(true);
      const adjustedQuantity = operation === "add" ? quantity : -quantity;
      await onAdjust(product.id, adjustedQuantity);
      setQuantity(0);
      onOpenChange(false);
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const newStock = product
    ? operation === "add"
      ? product.stock + quantity
      : product.stock - quantity
    : 0;

  const isValid = quantity > 0 && (operation === "add" || newStock >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="w-5 h-5 text-primary" />
            Ajuster le stock
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {product?.name} - Stock actuel: {product?.stock} unités
          </DialogDescription>
        </DialogHeader>

        <Tabs value={operation} onValueChange={(v) => setOperation(v as "add" | "remove")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ajouter
            </TabsTrigger>
            <TabsTrigger value="remove" className="flex items-center gap-2">
              <Minus className="w-4 h-4" />
              Retirer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Quantité à ajouter</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-secondary border-border"
              />
            </div>
            <div className="p-3 rounded-lg bg-success/10 border border-success/30">
              <p className="text-sm text-success">
                Nouveau stock: <span className="font-semibold">{newStock}</span> unités
              </p>
            </div>
          </TabsContent>

          <TabsContent value="remove" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Quantité à retirer</Label>
              <Input
                type="number"
                min="0"
                max={product?.stock || 0}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-secondary border-border"
              />
            </div>
            {newStock >= 0 ? (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                <p className="text-sm text-warning">
                  Nouveau stock: <span className="font-semibold">{newStock}</span> unités
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">
                  Stock insuffisant. Maximum retirable: {product?.stock} unités
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            variant={operation === "add" ? "success" : "warning"}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {operation === "add" ? "Ajouter au stock" : "Retirer du stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
