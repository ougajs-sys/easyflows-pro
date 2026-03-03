import { Product } from "@/hooks/useProducts";
import { Copy, Edit, Trash2, ExternalLink, Code } from "lucide-react";
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
    <div className="bg-[#0d1117] border border-gray-800 p-6 rounded-3xl group hover:border-emerald-500/30 transition-all">
      {/* Preview thumbnail */}
      <div
        className="h-32 rounded-2xl mb-4 flex items-center justify-center overflow-hidden"
        style={{
          background: product.brand_color
            ? `linear-gradient(135deg, ${product.brand_color}, ${product.brand_color}cc)`
            : "#1a1f2e",
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg"
          />
        ) : (
          <Code className="text-gray-700" size={40} />
        )}
      </div>

      {/* Info */}
      <h4 className="font-bold text-white truncate">{product.name}</h4>
      <p className="text-xs text-gray-500 mt-1 truncate">/p/{product.slug}</p>
      <div className="mt-1">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${product.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-gray-500 bg-gray-800"}`}>
          {product.is_active ? "Actif" : "Inactif"}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 bg-gray-800 py-2 rounded-lg text-xs font-bold text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
        >
          <Edit size={14} /> Modifier
        </button>
        <button
          onClick={copyLink}
          className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
          title="Copier le lien"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={() => window.open(landingUrl, "_blank")}
          className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
          title="Ouvrir"
        >
          <ExternalLink size={16} />
        </button>
        <button
          onClick={onRemoveLanding}
          className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
