import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface EmbedPreviewProps {
  productName?: string;
  price?: number;
  brandName: string;
  brandColor: string;
}

export function EmbedPreview({ productName, price, brandName, brandColor }: EmbedPreviewProps) {
  // Use current origin for live preview (works in both preview and production)
  const baseUrl = window.location.origin;
  const params = new URLSearchParams();
  
  if (productName) params.set("product", productName);
  if (price) params.set("price", price.toString());
  if (brandName) params.set("brand", brandName);
  if (brandColor) params.set("color", brandColor.replace("#", ""));

  const iframeSrc = `${baseUrl}/embed/order?${params.toString()}`;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Aperçu du formulaire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-border bg-background">
          <iframe
            src={iframeSrc}
            width="100%"
            height="600"
            style={{ border: "none" }}
            title="Aperçu du formulaire de commande"
          />
        </div>
      </CardContent>
    </Card>
  );
}
