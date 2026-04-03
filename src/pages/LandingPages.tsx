import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProducts } from "@/hooks/useProducts";
import { LandingPageEditor } from "@/components/landing/LandingPageEditor";
import { LandingPageCard } from "@/components/landing/LandingPageCard";
import { Plus, Loader2, Code } from "lucide-react";

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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="h-14 sm:h-16 border-b border-border flex items-center justify-between px-4 sm:px-8 bg-card">
          <h1 className="font-bold text-foreground text-base sm:text-lg">Landing Pages</h1>
          <div className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Cloud Actif
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Vos Pages Importées</h2>
            <button
              onClick={() => setCreating(true)}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg w-full sm:w-auto"
            >
              <Plus size={18} /> Importer une page
            </button>
          </div>

          {landingPages.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-muted rounded-2xl sm:rounded-3xl flex items-center justify-center">
                <Code className="text-muted-foreground" size={32} />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                Aucune landing page
              </h3>
              <p className="text-muted-foreground mb-6 text-sm sm:text-base px-4">
                Créez votre première page de destination pour vos produits
              </p>
              <button
                onClick={() => setCreating(true)}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto hover:opacity-90 transition-opacity"
              >
                <Plus size={18} /> Importer une page
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
      </div>
    </DashboardLayout>
  );
}
