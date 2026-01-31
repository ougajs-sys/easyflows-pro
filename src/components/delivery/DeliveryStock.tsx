import { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, ArrowUpDown, Search, History, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatCurrency";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeliveryStockProps {
  deliveryPersonId: string;
}

interface StockItem {
  id: string;
  product_id: string;
  quantity: number;
  last_restocked_at: string | null;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  notes: string | null;
  created_at: string;
  product: {
    name: string;
  };
}

export function DeliveryStock({ deliveryPersonId }: DeliveryStockProps) {
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnProductId, setReturnProductId] = useState("");
  const [returnQty, setReturnQty] = useState("");
  const queryClient = useQueryClient();

  // Fetch delivery person stock
  const { data: stockItems, isLoading: loadingStock } = useQuery({
    queryKey: ["delivery-stock", deliveryPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_person_stock")
        .select(`
          id,
          product_id,
          quantity,
          last_restocked_at,
          product:products(id, name, price)
        `)
        .eq("delivery_person_id", deliveryPersonId)
        .order("quantity", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StockItem[];
    },
    enabled: !!deliveryPersonId,
  });

  // Fetch stock movements history
  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ["delivery-stock-movements", deliveryPersonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id,
          product_id,
          quantity,
          movement_type,
          notes,
          created_at,
          product:products(name)
        `)
        .eq("delivery_person_id", deliveryPersonId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as StockMovement[];
    },
    enabled: !!deliveryPersonId && showHistory,
  });

  // Real-time subscription for stock updates
  useEffect(() => {
    if (!deliveryPersonId) return;

    const channel = supabase
      .channel("delivery-stock-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_person_stock",
          filter: `delivery_person_id=eq.${deliveryPersonId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["delivery-stock", deliveryPersonId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stock_movements",
          filter: `delivery_person_id=eq.${deliveryPersonId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["delivery-stock-movements", deliveryPersonId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryPersonId, queryClient]);

  const filteredStock = stockItems?.filter((item) =>
    item.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const returnableItems = (stockItems || []).filter((i) => i.quantity > 0);
  const selectedReturnItem = returnableItems.find((i) => i.product_id === returnProductId);

  const returnSchema = z.object({
    productId: z.string().min(1, "Veuillez sélectionner un produit"),
    qty: z.number().int().positive("Quantité invalide"),
  });

  const resetReturnForm = () => {
    setReturnProductId("");
    setReturnQty("");
  };

  const returnToShop = useMutation({
    mutationFn: async ({ productId, qty }: { productId: string; qty: number }) => {
      const { data, error } = await supabase.rpc("transfer_stock_from_delivery", {
        // côté serveur: si l'appelant est livreur, l'ID est vérifié/forcé sur son propre profil
        p_delivery_person_id: deliveryPersonId,
        p_product_id: productId,
        p_quantity: qty,
      });

      if (error) throw error;

      const result = data as unknown as { success?: boolean; error?: string } | null;
      if (result && typeof result === "object" && "success" in result && result.success === false) {
        throw new Error(result.error || "Erreur lors du retour");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stock", deliveryPersonId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-stock-movements", deliveryPersonId] });
      toast.success("Stock retourné à la boutique");
      setReturnOpen(false);
      resetReturnForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du retour");
    },
  });

  const handleReturnToShop = () => {
    const qty = Number.parseInt(returnQty, 10);
    const parsed = returnSchema.safeParse({ productId: returnProductId, qty });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Veuillez vérifier les champs";
      toast.error(msg);
      return;
    }

    if (!selectedReturnItem) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    if (qty > selectedReturnItem.quantity) {
      toast.error("Quantité supérieure au stock disponible");
      return;
    }

    returnToShop.mutate({ productId: returnProductId, qty });
  };

  const totalItems = stockItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalValue = stockItems?.reduce(
    (sum, item) => sum + item.quantity * (item.product?.price || 0),
    0
  ) || 0;

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Épuisé</Badge>;
    }
    if (quantity <= 5) {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Faible</Badge>;
    }
    return <Badge className="bg-success/20 text-success border-success/30">OK</Badge>;
  };

  const getMovementBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      transfer_to_delivery: { label: "Réception", color: "bg-success/20 text-success" },
      transfer_from_delivery: { label: "Retour", color: "bg-warning/20 text-warning" },
      sale: { label: "Vente", color: "bg-primary/20 text-primary" },
      return: { label: "Retour client", color: "bg-muted text-muted-foreground" },
      adjustment: { label: "Ajustement", color: "bg-secondary text-secondary-foreground" },
    };
    const t = types[type] || { label: type, color: "bg-muted text-muted-foreground" };
    return <Badge className={t.color}>{t.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock total</p>
                <p className="text-2xl font-bold text-foreground">{totalItems} unités</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <ArrowUpDown className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur stock</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <RefreshCw className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold text-foreground">{stockItems?.length || 0} types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Mon Stock
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Dialog
                open={returnOpen}
                onOpenChange={(open) => {
                  setReturnOpen(open);
                  if (!open) resetReturnForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={returnableItems.length === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour boutique
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Retourner du stock vers la boutique</DialogTitle>
                    <DialogDescription>
                      Le stock sera déduit de votre inventaire et ajouté à la boutique.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Produit</Label>
                      <Select value={returnProductId} onValueChange={setReturnProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {returnableItems.map((item) => (
                            <SelectItem key={item.product_id} value={item.product_id}>
                              {item.product?.name} (Stock: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedReturnItem?.quantity}
                        value={returnQty}
                        onChange={(e) => setReturnQty(e.target.value)}
                        placeholder="Quantité à retourner"
                      />
                      {selectedReturnItem && (
                        <p className="text-sm text-muted-foreground">
                          Stock disponible: {selectedReturnItem.quantity}
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReturnOpen(false);
                        resetReturnForm();
                      }}
                    >
                      Annuler
                    </Button>
                    <Button onClick={handleReturnToShop} disabled={returnToShop.isPending}>
                      {returnToShop.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowLeft className="w-4 h-4 mr-2" />
                      )}
                      Retourner
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant={showHistory ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full sm:w-auto"
              >
                <History className="w-4 h-4 mr-2" />
                Historique
              </Button>
            </div>
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
          {loadingStock ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredStock?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun stock assigné</p>
              <p className="text-sm">Le superviseur vous attribuera du stock</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Prix unitaire</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead>Dernier réappro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name}</TableCell>
                      <TableCell>{formatCurrency(item.product?.price || 0)} F</TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-bold",
                          item.quantity === 0 && "text-destructive",
                          item.quantity > 0 && item.quantity <= 5 && "text-warning",
                          item.quantity > 5 && "text-success"
                        )}>
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{getStockBadge(item.quantity)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.last_restocked_at
                          ? format(new Date(item.last_restocked_at), "dd MMM yyyy", { locale: fr })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Movements History */}
      {showHistory && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historique des mouvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMovements ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : movements?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun mouvement enregistré
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements?.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-medium">{movement.product?.name}</TableCell>
                        <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-bold",
                            movement.quantity > 0 ? "text-success" : "text-destructive"
                          )}>
                            {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {movement.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
