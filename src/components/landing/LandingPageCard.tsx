import { Product } from "@/hooks/useProducts";
import { Copy, Edit, Trash2, ExternalLink, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="group hover:border-primary/30 transition-all">
      {/* Preview thumbnail */}
      <div
        className="h-28 sm:h-32 rounded-t-lg flex items-center justify-center overflow-hidden"
        style={{
          background: product.brand_color
            ? `linear-gradient(135deg, ${product.brand_color}, ${product.brand_color}cc)`
            : "hsl(var(--muted))",
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg"
          />
        ) : (
          <Code className="text-muted-foreground" size={36} />
        )}
      </div>

      <CardContent className="p-4">
        {/* Info */}
        <h4 className="font-bold text-foreground truncate text-sm sm:text-base">{product.name}</h4>
        <p className="text-xs text-muted-foreground mt-1 truncate">/p/{product.slug}</p>
        <div className="mt-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${product.is_active ? "text-green-600 bg-green-500/10 dark:text-green-400" : "text-muted-foreground bg-muted"}`}>
            {product.is_active ? "Actif" : "Inactif"}
          </span>
        </div>

        {/* Actions — min 44px touch targets */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 bg-muted py-2.5 rounded-lg text-xs font-bold text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1 min-h-[44px]"
          >
            <Edit size={14} /> Modifier
          </button>
          <button
            onClick={copyLink}
            className="p-2.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Copier le lien"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => window.open(landingUrl, "_blank")}
            className="p-2.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Ouvrir"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={onRemoveLanding}
            className="p-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
