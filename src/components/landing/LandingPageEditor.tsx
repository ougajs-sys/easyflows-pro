import { useState, useEffect, useMemo } from "react";
import { Product, ProductUpdate } from "@/hooks/useProducts";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Save, Smartphone, Monitor, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [brandColor, setBrandColor] = useState(product?.brand_color || "#2563eb");
  const [pixelId, setPixelId] = useState(product?.facebook_pixel_id || "");
  const [htmlContent, setHtmlContent] = useState(product?.landing_html || "");

  const selectedProduct = allProducts.find((p) => p.id === selectedProductId);

  // Auto-generate slug when product changes (only in create mode)
  useEffect(() => {
    if (!product && selectedProduct) {
      setSlug(slugify(selectedProduct.name));
      setImageUrl(selectedProduct.image_url || "");
      setBrandColor(selectedProduct.brand_color || "#2563eb");
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
      // If it's already a full HTML document, use as-is
      if (htmlContent.trim().toLowerCase().startsWith('<!doctype') || htmlContent.trim().toLowerCase().startsWith('<html')) {
        return htmlContent;
      }
      // Otherwise wrap in a basic document
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

  const configPanel = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Product selector (create mode only) */}
        {!product && (
          <div className="space-y-2">
            <Label>Produit</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
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
          <Label>Slug (URL)</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">/p/</span>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mon-produit" />
          </div>
        </div>

        {/* Prix (auto) */}
        {(selectedProduct || product) && (
          <div className="space-y-2">
            <Label>Prix</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm text-foreground">
              {formatPrice(previewPrice)} <span className="text-muted-foreground">(automatique)</span>
            </div>
          </div>
        )}

        {/* Headline */}
        <div className="space-y-2">
          <Label>Titre marketing</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder={previewName}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre produit..."
            rows={3}
          />
        </div>

        {/* Image */}
        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label>Couleur de marque</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-md border border-border cursor-pointer"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Pixel ID */}
        <div className="space-y-2">
          <Label>Facebook Pixel ID</Label>
          <Input
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="123456789"
          />
        </div>

        {/* HTML Custom */}
        <div className="space-y-2">
          <Label>Code HTML personnalisé</Label>
          <Textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="<div>Votre HTML ici...</div>"
            rows={10}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Si renseigné, remplace le template par défaut (hero). Le formulaire de commande reste toujours affiché en dessous.
          </p>
        </div>
      </div>
    </ScrollArea>
  );

  const previewPanel = (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Preview toolbar */}
      <div className="flex items-center justify-center gap-2 p-2 border-b border-border bg-background">
        <Button
          size="sm"
          variant={previewMode === "mobile" ? "default" : "ghost"}
          onClick={() => setPreviewMode("mobile")}
          className="gap-1"
        >
          <Smartphone className="w-4 h-4" /> Mobile
        </Button>
        <Button
          size="sm"
          variant={previewMode === "desktop" ? "default" : "ghost"}
          onClick={() => setPreviewMode("desktop")}
          className="gap-1"
        >
          <Monitor className="w-4 h-4" /> Desktop
        </Button>
      </div>

      {/* Preview frame */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-4">
        <div
          className="bg-white rounded-lg shadow-lg overflow-auto border border-border transition-all duration-300"
          style={{
            width: previewMode === "mobile" ? 375 : "100%",
            maxWidth: "100%",
            minHeight: 500,
          }}
        >
          <iframe
            srcDoc={previewHtml}
            title="Aperçu landing page"
            className="w-full h-full border-none"
            style={{ minHeight: 500 }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <span className="text-sm font-medium text-foreground truncate">
            {product ? product.name : "Nouvelle landing page"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {landingUrl && (
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1">
              <Copy className="w-4 h-4" /> Copier le lien
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Editor body */}
      {isMobile ? (
        <div className="flex-1 overflow-auto">
          {configPanel}
          <div className="border-t border-border" style={{ height: 500 }}>
            {previewPanel}
          </div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            {configPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65}>
            {previewPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
