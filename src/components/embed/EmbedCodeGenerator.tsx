import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Code, Palette } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface EmbedCodeGeneratorProps {
  product?: Product;
  brandName: string;
  brandColor: string;
  redirectUrl?: string;
}

export function EmbedCodeGenerator({ product, brandName, brandColor, redirectUrl }: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState<string | null>(null);
  // Use the published URL for embed codes to work on any external site
  const PUBLISHED_URL = "https://easyflow-pro.site";
  const baseUrl = PUBLISHED_URL;

  const generateIframeCode = (height: number = 650) => {
    const params = new URLSearchParams();
    
    if (product) {
      params.set("product", product.name);
      params.set("price", product.price.toString());
    }
    if (brandName) params.set("brand", brandName);
    if (brandColor) params.set("color", brandColor.replace("#", ""));
    if (redirectUrl) params.set("redirect", redirectUrl);

    const src = `${baseUrl}/embed/order?${params.toString()}`;
    
    return `<iframe 
  src="${src}"
  width="100%"
  height="${height}"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
  title="Formulaire de commande"
></iframe>`;
  };

  const generateElementorCode = () => {
    return `<!-- Code pour Elementor - Bloc HTML personnalisé -->
${generateIframeCode(650)}

<style>
  /* Style optionnel pour le conteneur */
  .elementor-widget-html {
    max-width: 500px;
    margin: 0 auto;
  }
</style>`;
  };

  const generateWordPressCode = () => {
    return `<!-- Code pour WordPress - Bloc HTML -->
<div class="commande-formulaire" style="max-width: 500px; margin: 0 auto;">
  ${generateIframeCode(650)}
</div>`;
  };

  const handleCopy = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(type);
    toast.success("Code copié dans le presse-papiers");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          Code d'intégration
          {product && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
              {product.name}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Copiez le code correspondant à votre plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="elementor" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="elementor">Elementor</TabsTrigger>
            <TabsTrigger value="wordpress">WordPress</TabsTrigger>
            <TabsTrigger value="html">HTML Simple</TabsTrigger>
          </TabsList>

          <TabsContent value="elementor" className="space-y-3">
            <div className="text-xs text-muted-foreground mb-2">
              1. Ajoutez un bloc "HTML personnalisé" dans Elementor<br />
              2. Collez le code ci-dessous
            </div>
            <div className="relative">
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto max-h-48 border border-border">
                {generateElementorCode()}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(generateElementorCode(), "elementor")}
              >
                {copied === "elementor" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-3">
            <div className="text-xs text-muted-foreground mb-2">
              1. Ajoutez un bloc "HTML personnalisé" dans l'éditeur<br />
              2. Collez le code ci-dessous
            </div>
            <div className="relative">
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto max-h-48 border border-border">
                {generateWordPressCode()}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(generateWordPressCode(), "wordpress")}
              >
                {copied === "wordpress" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="html" className="space-y-3">
            <div className="text-xs text-muted-foreground mb-2">
              Code HTML basique pour n'importe quel site
            </div>
            <div className="relative">
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto max-h-48 border border-border">
                {generateIframeCode()}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(generateIframeCode(), "html")}
              >
                {copied === "html" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
