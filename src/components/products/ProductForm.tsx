import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Package, Loader2, ChevronDown, Globe, Copy, Check } from "lucide-react";
import type { Product, ProductInsert, ProductUpdate } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "Le nom ne peut pas dépasser 100 caractères"),
  description: z.string().max(500, "La description ne peut pas dépasser 500 caractères").optional(),
  price: z.coerce.number().min(0, "Le prix doit être positif"),
  stock: z.coerce.number().int().min(0, "Le stock doit être positif"),
  is_active: z.boolean(),
  // Landing page fields
  slug: z.string().optional(),
  image_url: z.string().optional(),
  landing_headline: z.string().optional(),
  landing_description: z.string().optional(),
  landing_html: z.string().optional(),
  facebook_pixel_id: z.string().optional(),
  brand_color: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductInsert | ProductUpdate) => Promise<void>;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function ProductForm({ open, onOpenChange, product, onSubmit }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [landingOpen, setLandingOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price ? Number(product.price) : 0,
      stock: product?.stock || 0,
      is_active: product?.is_active ?? true,
      slug: (product as any)?.slug || "",
      image_url: (product as any)?.image_url || "",
      landing_headline: (product as any)?.landing_headline || "",
      landing_description: (product as any)?.landing_description || "",
      landing_html: (product as any)?.landing_html || "",
      facebook_pixel_id: (product as any)?.facebook_pixel_id || "",
      brand_color: (product as any)?.brand_color || "#2563eb",
    },
  });

  // Auto-generate slug from name
  const nameValue = form.watch("name");
  const slugValue = form.watch("slug");

  useEffect(() => {
    if (!product && nameValue && !slugValue) {
      form.setValue("slug", generateSlug(nameValue));
    }
  }, [nameValue, product]);

  // Reset form when product changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: product?.name || "",
        description: product?.description || "",
        price: product?.price ? Number(product.price) : 0,
        stock: product?.stock || 0,
        is_active: product?.is_active ?? true,
        slug: (product as any)?.slug || "",
        image_url: (product as any)?.image_url || "",
        landing_headline: (product as any)?.landing_headline || "",
        landing_description: (product as any)?.landing_description || "",
        landing_html: (product as any)?.landing_html || "",
        facebook_pixel_id: (product as any)?.facebook_pixel_id || "",
        brand_color: (product as any)?.brand_color || "#2563eb",
      });
    }
  }, [open, product]);

  const handleSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit({
        ...data,
        description: data.description || null,
        slug: data.slug || null,
        image_url: data.image_url || null,
        landing_headline: data.landing_headline || null,
        landing_description: data.landing_description || null,
        landing_html: data.landing_html || null,
        facebook_pixel_id: data.facebook_pixel_id || null,
        brand_color: data.brand_color || "#2563eb",
      } as any);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const landingUrl = slugValue
    ? `${window.location.origin}/p/${slugValue}`
    : null;

  const copyUrl = () => {
    if (landingUrl) {
      navigator.clipboard.writeText(landingUrl);
      setCopied(true);
      toast({ title: "Lien copié !" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="w-5 h-5 text-primary" />
            {product ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {product
              ? "Modifiez les informations du produit"
              : "Remplissez les informations pour créer un nouveau produit"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du produit *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pack Premium" className="bg-secondary border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description du produit..." className="bg-secondary border-border resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (FCFA) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" className="bg-secondary border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock initial *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" className="bg-secondary border-border" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-4 bg-secondary/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Produit actif</FormLabel>
                    <FormDescription>Les produits inactifs ne sont pas disponibles à la vente</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Landing Page Section */}
            <Collapsible open={landingOpen} onOpenChange={setLandingOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Page de destination
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${landingOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="mon-produit" className="bg-secondary border-border" {...field} />
                      </FormControl>
                      <FormDescription>L'URL sera : /p/{field.value || "..."}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {landingUrl && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary text-sm">
                    <span className="truncate flex-1 text-muted-foreground">{landingUrl}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={copyUrl}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="landing_headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre accrocheur</FormLabel>
                      <FormControl>
                        <Input placeholder="Offre Limitée — Sérum Vitamine C" className="bg-secondary border-border" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="landing_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description marketing</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Décrivez les bénéfices du produit..." className="bg-secondary border-border resize-none" rows={3} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de l'image</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." className="bg-secondary border-border" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="landing_html"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code HTML personnalisé</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Collez votre code HTML ici... Le formulaire de commande sera ajouté automatiquement en dessous."
                          className="bg-secondary border-border font-mono text-xs resize-none"
                          rows={8}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Si rempli, ce HTML remplacera le template par défaut. Le formulaire de commande reste automatique.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facebook_pixel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook Pixel ID</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" className="bg-secondary border-border" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brand_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur CTA</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                            <Input value={field.value} onChange={field.onChange} className="bg-secondary border-border" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {product ? "Mettre à jour" : "Créer le produit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}