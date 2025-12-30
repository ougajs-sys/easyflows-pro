import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductStats } from "@/components/products/ProductStats";
import { StockAdjustmentDialog } from "@/components/products/StockAdjustmentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts, type Product, type ProductInsert, type ProductUpdate } from "@/hooks/useProducts";
import { Package, Plus, Search, Loader2 } from "lucide-react";

export default function Products() {
  const { products, loading, createProduct, updateProduct, deleteProduct, updateStock } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedProduct(null);
    setFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleAdjustStock = (product: Product) => {
    setSelectedProduct(product);
    setStockDialogOpen(true);
  };

  const handleSubmit = async (data: ProductInsert | ProductUpdate) => {
    if (selectedProduct) {
      await updateProduct(selectedProduct.id, data as ProductUpdate);
    } else {
      await createProduct(data as ProductInsert);
    }
  };

  const handleStockAdjust = async (id: string, quantity: number) => {
    await updateStock(id, quantity);
  };

  // Reset selected product when form closes
  useEffect(() => {
    if (!formOpen) {
      setSelectedProduct(null);
    }
  }, [formOpen]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              Gestion des Produits
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre catalogue de produits, stocks et prix
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau produit
          </Button>
        </div>

        {/* Stats */}
        <ProductStats products={products} />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ProductsTable
            products={filteredProducts}
            onEdit={handleEdit}
            onDelete={deleteProduct}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {/* Forms */}
        <ProductForm
          open={formOpen}
          onOpenChange={setFormOpen}
          product={selectedProduct}
          onSubmit={handleSubmit}
        />

        <StockAdjustmentDialog
          open={stockDialogOpen}
          onOpenChange={setStockDialogOpen}
          product={selectedProduct}
          onAdjust={handleStockAdjust}
        />
      </div>
    </DashboardLayout>
  );
}
