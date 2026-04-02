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
        <div className="-m-4 md:-m-6 min-h-[calc(100vh-4rem)] bg-[#14181f] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Editor view
  if (editingProduct || creating) {
    return (
      <DashboardLayout>
        <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)]">
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

  // Dashboard view — Pipeline dark theme
  return (
    <DashboardLayout>
      <div className="-m-4 md:-m-6 min-h-[calc(100vh-4rem)] bg-[#14181f]">
        <div className="p-6 md:p-10 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Vos Pages Importées</h2>
            <button
              onClick={() => setCreating(true)}
              className="bg-[#10b981] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
            >
              <Plus size={18} /> Importer une page
            </button>
          </div>

          {landingPages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-3xl flex items-center justify-center">
                <Code className="text-gray-600" size={40} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Aucune landing page
              </h3>
              <p className="text-gray-500 mb-6">
                Créez votre première page de destination pour vos produits
              </p>
              <button
                onClick={() => setCreating(true)}
                className="bg-[#10b981] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-emerald-400 transition-colors"
              >
                <Plus size={18} /> Importer une page
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
