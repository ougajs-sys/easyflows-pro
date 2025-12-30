import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (product: ProductInsert) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();

      if (error) throw error;

      setProducts((prev) => [data, ...prev]);
      toast({
        title: "Succès",
        description: "Produit créé avec succès",
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le produit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: ProductUpdate) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? data : p))
      );
      toast({
        title: "Succès",
        description: "Produit mis à jour avec succès",
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le produit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Succès",
        description: "Produit supprimé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le produit",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateStock = async (id: string, quantity: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      toast({
        title: "Erreur",
        description: "Stock insuffisant",
        variant: "destructive",
      });
      return;
    }

    await updateProduct(id, { stock: newStock });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
  };
}
