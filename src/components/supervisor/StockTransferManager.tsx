import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, ArrowRight, ArrowLeft, Truck, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface DeliveryPerson {
  id: string;
  user_id: string;
  status: string;
  zone: string | null;
  profile?: {
    full_name: string | null;
  };
}

interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface DeliveryStock {
  id: string;
  delivery_person_id: string;
  product_id: string;
  quantity: number;
  product: {
    name: string;
    price: number;
  };
  delivery_person: {
    id: string;
    profile?: {
      full_name: string | null;
    };
  };
}

export function StockTransferManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    type: "to" | "from";
  }>({ open: false, type: "to" });
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");

  // Fetch delivery persons
  const { data: deliveryPersons, isLoading: loadingPersons } = useQuery({
    queryKey: ["delivery-persons-for-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_persons")
        .select(`
          id,
          user_id,
          status,
          zone,
          profile:profiles!delivery_persons_user_id_fkey(full_name)
        `)
        .eq("is_active", true)
        .order("status");

      if (error) throw error;
      return (data || []) as unknown as DeliveryPerson[];
    },
  });

  // Fetch products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products-for-transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, price")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all delivery person stocks
  const { data: allDeliveryStocks, isLoading: loadingStocks } = useQuery({
    queryKey: ["all-delivery-stocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_person_stock")
        .select(`
          id,
          delivery_person_id,
          product_id,
          quantity,
          product:products(name, price),
          delivery_person:delivery_persons!delivery_person_stock_delivery_person_id_fkey(
            id,
            profile:profiles!delivery_persons_user_id_fkey(full_name)
          )
        `)
        .gt("quantity", 0)
        .order("quantity", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DeliveryStock[];
    },
  });

  // Transfer to delivery person
  const transferToDelivery = useMutation({
    mutationFn: async ({ deliveryPersonId, productId, qty }: { deliveryPersonId: string; productId: string; qty: number }) => {
      const { data, error } = await supabase.rpc("transfer_stock_to_delivery", {
        p_delivery_person_id: deliveryPersonId,
        p_product_id: productId,
        p_quantity: qty,
        p_performed_by: user?.id,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Erreur inconnue");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-delivery-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-transfer"] });
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success("Stock transféré au livreur");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du transfert");
    },
  });

  // Transfer from delivery person
  const transferFromDelivery = useMutation({
    mutationFn: async ({ deliveryPersonId, productId, qty }: { deliveryPersonId: string; productId: string; qty: number }) => {
      const { data, error } = await supabase.rpc("transfer_stock_from_delivery", {
        p_delivery_person_id: deliveryPersonId,
        p_product_id: productId,
        p_quantity: qty,
        p_performed_by: user?.id,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Erreur inconnue");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-delivery-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-transfer"] });
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      toast.success("Stock retourné à la boutique");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du retour");
    },
  });

  const resetForm = () => {
    setTransferDialog({ open: false, type: "to" });
    setSelectedDeliveryPerson("");
    setSelectedProduct("");
    setQuantity("");
  };

  const handleTransfer = () => {
    if (!selectedDeliveryPerson || !selectedProduct || !quantity) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantité invalide");
      return;
    }

    if (transferDialog.type === "to") {
      transferToDelivery.mutate({
        deliveryPersonId: selectedDeliveryPerson,
        productId: selectedProduct,
        qty,
      });
    } else {
      transferFromDelivery.mutate({
        deliveryPersonId: selectedDeliveryPerson,
        productId: selectedProduct,
        qty,
      });
    }
  };

  const selectedProductData = products?.find((p) => p.id === selectedProduct);
  const selectedDeliveryStock = allDeliveryStocks?.find(
    (s) => s.delivery_person_id === selectedDeliveryPerson && s.product_id === selectedProduct
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  // Group stocks by delivery person
  const stocksByPerson = allDeliveryStocks?.reduce((acc, stock) => {
    const personId = stock.delivery_person_id;
    if (!acc[personId]) {
      acc[personId] = {
        person: stock.delivery_person,
        items: [],
      };
    }
    acc[personId].items.push(stock);
    return acc;
  }, {} as Record<string, { person: DeliveryStock["delivery_person"]; items: DeliveryStock[] }>);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={transferDialog.open && transferDialog.type === "to"} onOpenChange={(open) => {
          if (!open) resetForm();
          else setTransferDialog({ open: true, type: "to" });
        }}>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/90">
              <ArrowRight className="w-4 h-4 mr-2" />
              Transférer vers livreur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transférer du stock vers un livreur</DialogTitle>
              <DialogDescription>
                Le stock sera déduit de la boutique et ajouté au stock du livreur.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Livreur</Label>
                <Select value={selectedDeliveryPerson} onValueChange={setSelectedDeliveryPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un livreur" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryPersons?.map((person) => {
                      const displayName = person.profile?.full_name || "Livreur";
                      return (
                        <SelectItem 
                          key={person.id} 
                          value={person.id}
                          textValue={`${displayName} - ${person.status}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{displayName}</span>
                            <Badge variant="outline" className="text-xs">{person.status}</Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produit</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProductData?.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantité à transférer"
                />
                {selectedProductData && (
                  <p className="text-sm text-muted-foreground">
                    Stock boutique disponible: {selectedProductData.stock}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button 
                onClick={handleTransfer}
                disabled={transferToDelivery.isPending}
                className="bg-success hover:bg-success/90"
              >
                {transferToDelivery.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Transférer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={transferDialog.open && transferDialog.type === "from"} onOpenChange={(open) => {
          if (!open) resetForm();
          else setTransferDialog({ open: true, type: "from" });
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour vers boutique
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Retourner du stock vers la boutique</DialogTitle>
              <DialogDescription>
                Le stock sera déduit du livreur et ajouté à la boutique.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Livreur</Label>
                <Select value={selectedDeliveryPerson} onValueChange={(v) => {
                  setSelectedDeliveryPerson(v);
                  setSelectedProduct("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un livreur" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryPersons?.map((person) => {
                      const displayName = person.profile?.full_name || "Livreur";
                      return (
                        <SelectItem 
                          key={person.id} 
                          value={person.id}
                          textValue={displayName}
                        >
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produit</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!selectedDeliveryPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDeliveryStocks
                      ?.filter((s) => s.delivery_person_id === selectedDeliveryPerson && s.quantity > 0)
                      .map((stock) => (
                        <SelectItem key={stock.product_id} value={stock.product_id}>
                          {stock.product?.name} (Stock: {stock.quantity})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedDeliveryStock?.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantité à retourner"
                />
                {selectedDeliveryStock && (
                  <p className="text-sm text-muted-foreground">
                    Stock livreur disponible: {selectedDeliveryStock.quantity}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
              <Button 
                onClick={handleTransfer}
                disabled={transferFromDelivery.isPending}
              >
                {transferFromDelivery.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                Retourner
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock by Delivery Person */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Stock par Livreur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStocks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !stocksByPerson || Object.keys(stocksByPerson).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun stock distribué aux livreurs</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(stocksByPerson).map(([personId, data]) => (
                <div key={personId} className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {data.person?.profile?.full_name || "Livreur"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {data.items.length} produit(s) en stock
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Valeur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product?.name}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "font-bold",
                              item.quantity <= 5 ? "text-warning" : "text-success"
                            )}>
                              {item.quantity}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(item.quantity * (item.product?.price || 0))} F</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
