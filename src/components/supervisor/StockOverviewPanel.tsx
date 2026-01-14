import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  Warehouse, 
  Truck, 
  TrendingDown, 
  AlertTriangle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StockData {
  productId: string;
  productName: string;
  warehouseStock: number;
  distributedToDeliverers: number;
  soldToday: number;
  availableTotal: number;
  delivererBreakdown: { name: string; quantity: number }[];
}

export function StockOverviewPanel() {
  const { data: stockData, isLoading } = useQuery({
    queryKey: ["supervisor-stock-overview"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch products with warehouse stock
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, stock")
        .eq("is_active", true);

      if (productsError) throw productsError;

      // Fetch delivery person stock
      const { data: deliveryStock, error: dpStockError } = await supabase
        .from("delivery_person_stock")
        .select(`
          product_id,
          quantity,
          delivery_person_id,
          delivery_person:delivery_persons!inner(
            user_id
          )
        `);

      if (dpStockError) throw dpStockError;

      // Fetch profiles for delivery person names
      const userIds = [...new Set(deliveryStock?.map(ds => ds.delivery_person?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Fetch today's delivered orders for sold count
      const { data: todayOrders, error: ordersError } = await supabase
        .from("orders")
        .select("product_id, quantity")
        .eq("status", "delivered")
        .gte("delivered_at", todayISO);

      if (ordersError) throw ordersError;

      // Calculate totals per product
      const result: StockData[] = products?.map((product) => {
        const dpStock = deliveryStock?.filter(ds => ds.product_id === product.id) || [];
        const distributedTotal = dpStock.reduce((sum, ds) => sum + (ds.quantity || 0), 0);
        
        const soldToday = todayOrders
          ?.filter(o => o.product_id === product.id)
          .reduce((sum, o) => sum + (o.quantity || 0), 0) || 0;

        const delivererBreakdown = dpStock.map(ds => {
          const profile = profiles?.find(p => p.id === ds.delivery_person?.user_id);
          return {
            name: profile?.full_name || "Inconnu",
            quantity: ds.quantity || 0,
          };
        }).filter(d => d.quantity > 0);

        return {
          productId: product.id,
          productName: product.name,
          warehouseStock: product.stock,
          distributedToDeliverers: distributedTotal,
          soldToday,
          availableTotal: product.stock + distributedTotal,
          delivererBreakdown,
        };
      }) || [];

      return result;
    },
    refetchInterval: 30000,
  });

  const totals = stockData?.reduce(
    (acc, item) => ({
      warehouse: acc.warehouse + item.warehouseStock,
      distributed: acc.distributed + item.distributedToDeliverers,
      sold: acc.sold + item.soldToday,
      total: acc.total + item.availableTotal,
    }),
    { warehouse: 0, distributed: 0, sold: 0, total: 0 }
  ) || { warehouse: 0, distributed: 0, sold: 0, total: 0 };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Vue Globale du Stock
          <Badge variant="outline" className="ml-2">
            {format(new Date(), "d MMMM yyyy", { locale: fr })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Stock Boutique</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totals.warehouse}</p>
          </div>
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">Chez Livreurs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totals.distributed}</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Vendus Aujourd'hui</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totals.sold}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Stock Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totals.total}</p>
          </div>
        </div>

        {/* Per Product Breakdown */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Détail par produit
          </h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {stockData?.map((item) => (
                <div
                  key={item.productId}
                  className="p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-foreground">{item.productName}</h5>
                    {item.warehouseStock <= 10 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Stock bas
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Boutique</span>
                      <p className="font-semibold">{item.warehouseStock}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Livreurs</span>
                      <p className="font-semibold">{item.distributedToDeliverers}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendus</span>
                      <p className="font-semibold text-success">{item.soldToday}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total</span>
                      <p className="font-semibold">{item.availableTotal}</p>
                    </div>
                  </div>

                  {item.delivererBreakdown.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Répartition livreurs:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.delivererBreakdown.map((d, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {d.name}: {d.quantity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
