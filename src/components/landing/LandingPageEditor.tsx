import { useState, useEffect, useMemo } from "react";
import { Product, ProductUpdate } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Copy, Save, Smartphone, Monitor, Loader2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface LandingPageEditorProps {
  product: Product | null;
  allProducts: Product[];
  productsWithoutLanding: Product[];
  onSave: (id: string, updates: ProductUpdate) => Promise<void>;
  onBack: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function LandingPageEditor({
  product,
  allProducts,
  productsWithoutLanding,
  onSave,
  onBack,
}: LandingPageEditorProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Form state
  const [selectedProductId, setSelectedProductId] = useState(product?.id || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [headline, setHeadline] = useState(product?.landing_headline || "");
  const [description, setDescription] = useState(product?.landing_description || "");
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [brandColor, setBrandColor] = useState(product?.brand_color || "#10b981");
  const [pixelId, setPixelId] = useState(product?.facebook_pixel_id || "");
  const [htmlContent, setHtmlContent] = useState(product?.landing_html || "");

  const selectedProduct = allProducts.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (!product && selectedProduct) {
      setSlug(slugify(selectedProduct.name));
      setImageUrl(selectedProduct.image_url || "");
      setBrandColor(selectedProduct.brand_color || "#10b981");
    }
  }, [selectedProductId, product]);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

  const landingUrl = slug ? `${window.location.origin}/p/${slug}` : "";

  const copyLink = () => {
    if (!landingUrl) return;
    navigator.clipboard.writeText(landingUrl);
    toast({ title: "Lien copié", description: landingUrl });
  };

  const handleSave = async () => {
    const targetId = product?.id || selectedProductId;
    if (!targetId) {
      toast({ title: "Erreur", description: "Sélectionnez un produit", variant: "destructive" });
      return;
    }
    if (!slug.trim()) {
      toast({ title: "Erreur", description: "Le slug est requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave(targetId, {
        slug,
        landing_headline: headline || null,
        landing_description: description || null,
        landing_html: htmlContent || null,
        image_url: imageUrl || null,
        brand_color: brandColor,
        facebook_pixel_id: pixelId || null,
      });
      toast({ title: "Sauvegardé", description: "Landing page mise à jour" });
    } catch {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  };

  const previewPrice = selectedProduct ? Number(selectedProduct.price) : product ? Number(product.price) : 0;
  const previewName = selectedProduct?.name || product?.name || "Produit";

  // Preview HTML — full document for iframe srcdoc
  const previewHtml = useMemo(() => {
    if (htmlContent) {
      if (htmlContent.trim().toLowerCase().startsWith("<!doctype") || htmlContent.trim().toLowerCase().startsWith("<html")) {
        return htmlContent;
      }
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0">${htmlContent}</body></html>`;
    }
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;font-family:system-ui,sans-serif">
      <div style="background: linear-gradient(135deg, ${brandColor}, ${brandColor}dd); padding: 4rem 1rem; text-align: center; color: white;">
        ${imageUrl ? `<img src="${imageUrl}" alt="${previewName}" style="width: 160px; height: 160px; object-fit: cover; border-radius: 1rem; margin: 0 auto 2rem; display: block; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);" />` : ""}
        <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">${headline || previewName}</h1>
        ${description ? `<p style="font-size: 1.1rem; opacity: 0.9; max-width: 600px; margin: 0 auto 1.5rem;">${description}</p>` : ""}
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); border-radius: 9999px; padding: 0.75rem 1.5rem;">
          <span style="font-size: 1.5rem; font-weight: bold;">${formatPrice(previewPrice)}</span>
        </div>
      </div>
      <div style="padding: 3rem 1rem; text-align: center; background: #f9fafb;">
        <div style="max-width: 400px; margin: 0 auto; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Formulaire de commande</h2>
          <p style="color: #6b7280; font-size: 0.875rem;">(Aperçu — le formulaire réel apparaîtra sur la page publique)</p>
        </div>
      </div>
    </body></html>`;
  }, [htmlContent, brandColor, imageUrl, headline, description, previewPrice, previewName]);

  const emptyPreview = `<body style="background:#1a1f2e;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555;font-size:14px">Collez votre code HTML pour voir l'aperçu...</body>`;

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft size={18} /> Retour
          </button>
          <span className="text-sm font-medium text-white truncate">
            {product ? product.name : "Nouvelle landing page"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {landingUrl && (
            <button
              onClick={copyLink}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy size={14} /> Copier le lien
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#10b981] text-black px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/10"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Config */}
        <div className={`${isMobile ? "w-full" : "w-[420px]"} border-r border-gray-800 flex flex-col bg-[#0d1117] overflow-y-auto`}>
          <div className="p-6 space-y-5">
            {/* Product selector (create mode) */}
            {!product && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Produit</label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="bg-gray-800 border-none rounded-xl text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500">
                    <SelectValue placeholder="Choisir un produit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productsWithoutLanding.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatPrice(Number(p.price))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Slug (URL)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 whitespace-nowrap">/p/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="mon-produit"
                  className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Prix */}
            {(selectedProduct || product) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prix</label>
                <div className="px-3 py-2.5 bg-gray-800 rounded-xl text-sm text-gray-400">
                  {formatPrice(previewPrice)} <span className="text-gray-600">(automatique)</span>
                </div>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Titre de la page</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={previewName}
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre produit..."
                rows={3}
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Image URL</label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Couleur de marque</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
                />
                <input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="flex-1 bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Pixel ID */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                <Target size={12} /> Facebook Pixel ID
              </label>
              <input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="123456789"
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* HTML Custom */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Code HTML Source</label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Collez votre code HTML complet ici..."
                rows={12}
                className="w-full bg-black border-none rounded-xl p-4 text-[11px] font-mono text-blue-300 resize-none focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-gray-600">
                Collez une page HTML complète (avec {"<html>"}, styles, scripts). L'aperçu s'affiche en isolation totale via iframe.
              </p>
            </div>

            {/* Save button (mobile) */}
            {isMobile && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#10b981] text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Enregistrer et Publier
              </button>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        {!isMobile && (
          <div className="flex-1 flex flex-col items-center bg-black/20 p-6">
            {/* Preview toggle */}
            <div className="flex bg-gray-800 p-1 rounded-xl mb-6">
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-2 rounded-lg transition-colors ${previewMode === "mobile" ? "bg-emerald-500 text-black" : "text-gray-400 hover:text-white"}`}
              >
                <Smartphone size={16} />
              </button>
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-2 rounded-lg transition-colors ${previewMode === "desktop" ? "bg-emerald-500 text-black" : "text-gray-400 hover:text-white"}`}
              >
                <Monitor size={16} />
              </button>
            </div>

            {/* Preview frame */}
            <div
              className={`bg-white shadow-2xl transition-all duration-500 ${
                previewMode === "mobile"
                  ? "w-[375px] h-[667px] rounded-[3rem] border-[12px] border-black overflow-hidden"
                  : "w-full h-full rounded-2xl overflow-hidden"
              }`}
            >
              <iframe
                title="Aperçu"
                srcDoc={htmlContent ? previewHtml : (previewPrice > 0 || headline ? previewHtml : emptyPreview)}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
