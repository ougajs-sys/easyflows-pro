import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface ProductStatsProps {
  products: Product[];
}

export function ProductStats({ products }: ProductStatsProps) {
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 10).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;

  const stats = [
    {
      label: "Total produits",
      value: totalProducts,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Produits actifs",
      value: activeProducts,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Stock bas",
      value: lowStockProducts,
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Rupture de stock",
      value: outOfStockProducts,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
