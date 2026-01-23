import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Minus, Search, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatCurrency";

interface StockTableProps {
  onSelectProduct: (productId: string | null) => void;
  selectedProductId: string | null;
}

export function StockTable({ onSelectProduct, selectedProductId }: StockTableProps) {
  const [search, setSearch] = useState("");
  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean;
    product: { id: string; name: string; stock: number } | null;
    type: "add" | "remove";
  }>({ open: false, product: null, type: "add" });
  const [adjustAmount, setAdjustAmount] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, price, is_active")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const adjustStock = useMutation({
    mutationFn: async ({ productId, newStock }: { productId: string; newStock: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ stock: Math.max(0, newStock) })
        .eq("id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      queryClient.invalidateQueries({ queryKey: ["stock-alerts"] });
      toast({
        title: "Stock mis à jour",
        description: "Le niveau de stock a été modifié avec succès.",
      });
      setAdjustDialog({ open: false, product: null, type: "add" });
      setAdjustAmount("");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le stock.",
        variant: "destructive",
      });
    },
  });

  const handleAdjust = () => {
    if (!adjustDialog.product || !adjustAmount) return;
    
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre valide.",
        variant: "destructive",
      });
      return;
    }

    const newStock = adjustDialog.type === "add" 
      ? adjustDialog.product.stock + amount
      : adjustDialog.product.stock - amount;

    adjustStock.mutate({ productId: adjustDialog.product.id, newStock });
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rupture</Badge>;
    }
    if (stock <= 10) {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Faible</Badge>;
    }
    return <Badge className="bg-success/20 text-success border-success/30">OK</Badge>;
  };

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Inventaire des Produits
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredProducts?.length || 0} produits
            </Badge>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-secondary/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun produit trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts?.map((product) => (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedProductId === product.id && "bg-primary/5"
                      )}
                      onClick={() => onSelectProduct(product.id === selectedProductId ? null : product.id)}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatCurrency(Number(product.price))} FCFA</TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-bold",
                          product.stock === 0 && "text-destructive",
                          product.stock > 0 && product.stock <= 10 && "text-warning",
                          product.stock > 10 && "text-success"
                        )}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>{getStockBadge(product.stock)}</TableCell>
                      <TableCell>
                        {product.is_active ? (
                          <Badge variant="outline" className="text-xs">Actif</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustDialog({
                                open: true,
                                product: { id: product.id, name: product.name, stock: product.stock },
                                type: "add",
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustDialog({
                                open: true,
                                product: { id: product.id, name: product.name, stock: product.stock },
                                type: "remove",
                              });
                            }}
                            disabled={product.stock === 0}
                          >
                            <Minus className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog.open} onOpenChange={(open) => {
        if (!open) {
          setAdjustDialog({ open: false, product: null, type: "add" });
          setAdjustAmount("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustDialog.type === "add" ? "Ajouter au stock" : "Retirer du stock"}
            </DialogTitle>
            <DialogDescription>
              {adjustDialog.product?.name} - Stock actuel: {adjustDialog.product?.stock} unités
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantité à {adjustDialog.type === "add" ? "ajouter" : "retirer"}</Label>
              <Input
                type="number"
                min="1"
                max={adjustDialog.type === "remove" ? adjustDialog.product?.stock : undefined}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Entrez la quantité"
              />
            </div>
            {adjustAmount && !isNaN(parseInt(adjustAmount)) && parseInt(adjustAmount) > 0 && (
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-sm">
                  Nouveau stock:{" "}
                  <span className="font-bold">
                    {adjustDialog.type === "add"
                      ? (adjustDialog.product?.stock || 0) + parseInt(adjustAmount)
                      : Math.max(0, (adjustDialog.product?.stock || 0) - parseInt(adjustAmount))}
                  </span>{" "}
                  unités
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdjustDialog({ open: false, product: null, type: "add" });
                setAdjustAmount("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={!adjustAmount || adjustStock.isPending}
              className={adjustDialog.type === "add" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"}
            >
              {adjustDialog.type === "add" ? "Ajouter" : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
