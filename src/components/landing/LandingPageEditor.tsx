import { useState, useEffect, useMemo } from "react";
import { Product, ProductUpdate } from "@/hooks/useProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Copy, Save, Smartphone, Monitor, Loader2, Target, Trash2 } from "lucide-react";
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
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile"); // J'ai mis "mobile" par défaut car c'est souvent le plus utilisé en e-commerce

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

  const formatPrice = (p: number) => new Intl.NumberFormat("fr-FR").format(p) + " FCFA";

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
      toast({ title: "Sauvegardé", description: "Landing page mise à jour avec succès" });
    } catch {
      toast({ title: "Erreur", description: "Échec de la sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewPrice = selectedProduct ? Number(selectedProduct.price) : product ? Number(product.price) : 0;
  const previewName = selectedProduct?.name || product?.name || "Produit";

  // AMÉLIORATION : Un constructeur d'aperçu HTML plus intelligent
  const previewHtml = useMemo(() => {
    if (htmlContent && htmlContent.trim() !== "") {
      // Si le code contient déjà une balise html, on l'utilise tel quel
      if (htmlContent.toLowerCase().includes("<html")) {
        return htmlContent;
      }
      // Sinon, on l'enveloppe proprement pour être sûr qu'il s'affiche bien dans l'iframe
      return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;
    }

    // Page par défaut (si aucun code n'est fourni)
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
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: #111827;">Espace Commande</h2>
          <p style="color: #6b7280; font-size: 0.875rem;">(Ceci est un aperçu. Le formulaire final sera ici.)</p>
        </div>
      </div>
    </body></html>`;
  }, [htmlContent, brandColor, imageUrl, headline, description, previewPrice, previewName]);

  const emptyPreview = `<body style="background:#1a1f2e;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;font-size:14px; margin:0; text-align:center; padding: 20px;">
    <div>
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
      <p>Collez votre code HTML à gauche<br/>pour voir l'aperçu de votre page ici.</p>
    </div>
  </body>`;

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
        <div
          className={`${isMobile ? "w-full" : "w-[420px]"} border-r border-gray-800 flex flex-col bg-[#0d1117] overflow-y-auto scrollbar-thin`}
        >
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Lien de la page (URL)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 whitespace-nowrap">/p/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="nom-du-produit"
                  className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Prix */}
            {(selectedProduct || product) && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prix de vente</label>
                <div className="px-3 py-2.5 bg-gray-800 rounded-xl text-sm text-gray-400">
                  {formatPrice(previewPrice)}{" "}
                  <span className="text-gray-600 text-xs ml-2">(Récupéré automatiquement)</span>
                </div>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Titre principal</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={previewName}
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Petite description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Un argument choc pour vendre..."
                rows={3}
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Pixel ID */}
            <div className="space-y-2 pt-2 border-t border-gray-800/50">
              <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Target size={12} /> Facebook Pixel ID
              </label>
              <input
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Ex: 123456789012345"
                className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <p className="text-[10px] text-gray-500">Pour tracker les visites et les achats sur Facebook Ads.</p>
            </div>

            {/* HTML Custom avec bouton Vider */}
            <div className="space-y-2 pt-4 border-t border-gray-800/50">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Code HTML Complet
                </label>
                {htmlContent && (
                  <button
                    onClick={() => {
                      if (window.confirm("Voulez-vous vraiment effacer tout le code HTML ?")) {
                        setHtmlContent("");
                      }
                    }}
                    className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={12} /> Vider
                  </button>
                )}
              </div>

              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Collez ici le code HTML de votre Landing Page exporté depuis un autre outil..."
                rows={16}
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 text-[11px] font-mono text-emerald-300/80 resize-y min-h-[200px] focus:ring-1 focus:ring-emerald-500 outline-none scrollbar-thin"
              />
              <p className="text-[10px] text-gray-500 leading-tight">L'aperçu à droite se met à jour en temps réel.</p>
            </div>

            {/* Save button (mobile) */}
            {isMobile && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-6 bg-[#10b981] text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Enregistrer la Page
              </button>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        {!isMobile && (
          <div className="flex-1 flex flex-col items-center bg-[#14181f] p-6 overflow-y-auto">
            {/* Preview toggle */}
            <div className="flex bg-gray-800/80 backdrop-blur-sm p-1.5 rounded-xl mb-6 shadow-lg">
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                  previewMode === "mobile"
                    ? "bg-emerald-500 text-black shadow-md"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Smartphone size={18} /> Mobile
              </button>
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                  previewMode === "desktop"
                    ? "bg-emerald-500 text-black shadow-md"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <Monitor size={18} /> PC
              </button>
            </div>

            {/* Preview frame container */}
            <div
              className={`bg-white shadow-2xl transition-all duration-300 ease-in-out ${
                previewMode === "mobile"
                  ? "w-[375px] h-[750px] rounded-[2.5rem] border-[12px] border-[#0d1117] overflow-hidden relative shadow-[0_0_0_1px_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)]"
                  : "w-full max-w-5xl h-[800px] rounded-xl border border-gray-800 overflow-hidden"
              }`}
            >
              {/* Petite "encoche" pour simuler un vrai téléphone si on est en mobile */}
              {previewMode === "mobile" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#0d1117] rounded-b-xl z-10"></div>
              )}

              <iframe
                title="Aperçu Landing Page"
                srcDoc={htmlContent ? previewHtml : previewPrice > 0 || headline ? previewHtml : emptyPreview}
                className="w-full h-full border-none bg-white"
                // AMÉLIORATION : On empêche les scripts alert/popups qui bloquent l'éditeur
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>

            <p className="mt-4 text-gray-500 text-xs">
              Aperçu en direct. Le rendu final peut légèrement varier selon le navigateur de vos clients.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
