import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmbedPreview } from "@/components/embed/EmbedPreview";
import { EmbedCodeGenerator } from "@/components/embed/EmbedCodeGenerator";
import { useProducts } from "@/hooks/useProducts";
import { Code, Palette, Package, ExternalLink, Info } from "lucide-react";

export default function EmbedFormsAdmin() {
  const { products, loading } = useProducts();
  const [brandName, setBrandName] = useState("Ma Boutique");
  const [brandColor, setBrandColor] = useState("#8B5CF6");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
  } | undefined>(undefined);

  const activeProducts = products.filter((p) => p.is_active);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Formulaires Embarquables
          </h1>
          <p className="text-muted-foreground mt-1">
            Générez des codes iframe pour intégrer vos formulaires de commande dans WordPress/Elementor
          </p>
        </div>

        {/* Info Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Comment ça marche ?</p>
                <p className="text-muted-foreground mt-1">
                  1. Personnalisez votre branding ci-dessous<br />
                  2. Sélectionnez un produit (optionnel)<br />
                  3. Copiez le code généré dans votre page WordPress/Elementor<br />
                  4. Les commandes arriveront automatiquement dans la section "Commandes"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Branding Settings */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Personnalisation
                </CardTitle>
                <CardDescription>
                  Adaptez le formulaire à votre marque
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Nom de la marque</Label>
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ma Boutique"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandColor">Couleur principale</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandColor"
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redirectUrl">URL de redirection après commande</Label>
                  <Input
                    id="redirectUrl"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://votresite.com/merci"
                  />
                  <p className="text-xs text-muted-foreground">
                    Le client sera redirigé vers cette page après avoir passé commande (idéal pour Pixel Facebook)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Produit pré-sélectionné
                </CardTitle>
                <CardDescription>
                  Optionnel - Le client pourra toujours changer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                ) : activeProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Aucun produit actif trouvé
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      <Button
                        variant={selectedProduct === undefined ? "secondary" : "ghost"}
                        className="w-full justify-start text-left"
                        onClick={() => setSelectedProduct(undefined)}
                      >
                        <span className="truncate">Aucun (formulaire générique)</span>
                      </Button>
                      {activeProducts.map((product) => (
                        <Button
                          key={product.id}
                          variant={selectedProduct?.id === product.id ? "secondary" : "ghost"}
                          className="w-full justify-between text-left"
                          onClick={() =>
                            setSelectedProduct({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                            })
                          }
                        >
                          <span className="truncate">{product.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {product.price.toLocaleString()} FCFA
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Code Generator */}
            <EmbedCodeGenerator
              product={selectedProduct}
              brandName={brandName}
              brandColor={brandColor}
              redirectUrl={redirectUrl}
            />
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-6">
            <EmbedPreview
              productName={selectedProduct?.name}
              price={selectedProduct?.price}
              brandName={brandName}
              brandColor={brandColor}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
