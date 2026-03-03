import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProducts } from "@/hooks/useProducts";
import { LandingPageEditor } from "@/components/landing/LandingPageEditor";
import { LandingPageCard } from "@/components/landing/LandingPageCard";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Globe } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function LandingPages() {
  const { products, loading, updateProduct } = useProducts();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const landingPages = products.filter((p) => p.slug && p.slug.trim() !== "");
  const productsWithoutLanding = products.filter((p) => !p.slug || p.slug.trim() === "");

  const editingProduct = editingProductId
    ? products.find((p) => p.id === editingProductId) || null
    : null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Editor view
  if (editingProduct || creating) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-2rem)]">
          <LandingPageEditor
            product={editingProduct}
            allProducts={products}
            productsWithoutLanding={creating ? productsWithoutLanding : []}
            onSave={async (id, updates) => {
              await updateProduct(id, updates);
            }}
            onBack={() => {
              setEditingProductId(null);
              setCreating(false);
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // List view
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" />
              Landing Pages
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez et gérez vos pages de destination produit
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Créer une landing page
          </Button>
        </div>

        {landingPages.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucune landing page
            </h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première page de destination pour vos produits
            </p>
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Créer une landing page
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {landingPages.map((product) => (
              <LandingPageCard
                key={product.id}
                product={product}
                onEdit={() => setEditingProductId(product.id)}
                onRemoveLanding={async () => {
                  await updateProduct(product.id, {
                    slug: null,
                    landing_headline: null,
                    landing_description: null,
                    landing_html: null,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
