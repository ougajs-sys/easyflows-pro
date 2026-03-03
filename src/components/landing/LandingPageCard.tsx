import { Product } from "@/hooks/useProducts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Edit, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LandingPageCardProps {
  product: Product;
  onEdit: () => void;
  onRemoveLanding: () => void;
}

export function LandingPageCard({ product, onEdit, onRemoveLanding }: LandingPageCardProps) {
  const { toast } = useToast();
  const landingUrl = `${window.location.origin}/p/${product.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(landingUrl);
    toast({ title: "Lien copié", description: landingUrl });
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Preview thumbnail */}
        <div
          className="h-32 rounded-lg overflow-hidden border border-border"
          style={{
            background: product.brand_color
              ? `linear-gradient(135deg, ${product.brand_color}, ${product.brand_color}cc)`
              : "hsl(var(--muted))",
          }}
        >
          <div className="flex items-center justify-center h-full text-white">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <span className="text-lg font-bold opacity-80">{product.name}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">/p/{product.slug}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onEdit}>
            <Edit className="w-3 h-3" /> Éditer
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={copyLink}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => window.open(landingUrl, "_blank")}
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive gap-1"
            onClick={onRemoveLanding}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
