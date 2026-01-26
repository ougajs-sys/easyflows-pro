import { DeliveryOrderCard } from "./DeliveryOrderCard";
import { Package } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string | null;
  quantity: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  status: OrderStatus;
  created_at: string;
  client_phone?: string | null;
  client_phone_secondary?: string | null;
  client: {
    full_name: string;
    phone: string;
    phone_secondary: string | null;
    address: string | null;
    zone: string | null;
  } | null;
  product: {
    name: string;
  } | null;
}

interface DeliveryOrdersListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus, amountPaid?: number) => void;
  isUpdating: boolean;
}

export function DeliveryOrdersList({ orders, onUpdateStatus, isUpdating }: DeliveryOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Aucune commande assignée</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Vous n'avez pas de commandes à livrer pour le moment. Les nouvelles commandes apparaîtront ici.
        </p>
      </div>
    );
  }

  // Sort orders: in_transit first, then confirmed, then pending
  const sortedOrders = [...orders].sort((a, b) => {
    const priority: Record<string, number> = {
      in_transit: 0,
      confirmed: 1,
      pending: 2,
    };
    return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
  });

  return (
    <div className="space-y-4">
      {sortedOrders.map((order) => (
        <DeliveryOrderCard
          key={order.id}
          order={order}
          onUpdateStatus={onUpdateStatus}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
}
