import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Package, CheckCircle, Clock, XCircle } from "lucide-react";
import { DeliveryOrderCard } from "./DeliveryOrderCard";
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

interface DeliveryOrdersProps {
  assignedOrders: Order[];
  deliveredOrders: Order[];
  reportedOrders: Order[];
  cancelledOrders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus, amountPaid?: number) => void;
  isUpdating: boolean;
}

export function DeliveryOrders({
  assignedOrders,
  deliveredOrders,
  reportedOrders,
  cancelledOrders,
  onUpdateStatus,
  isUpdating,
}: DeliveryOrdersProps) {
  const [activeTab, setActiveTab] = useState("pending");

  // Split assigned orders by status
  const inTransitOrders = assignedOrders.filter(o => o.status === "in_transit");
  const pendingOrders = assignedOrders.filter(o => o.status !== "in_transit");

  const tabs = [
    { 
      id: "pending", 
      label: "À livrer", 
      count: pendingOrders.length + inTransitOrders.length,
      icon: Package,
      color: "text-primary"
    },
    { 
      id: "delivered", 
      label: "Livrées", 
      count: deliveredOrders.length,
      icon: CheckCircle,
      color: "text-success"
    },
    { 
      id: "reported", 
      label: "Reportées", 
      count: reportedOrders.length,
      icon: Clock,
      color: "text-warning"
    },
    { 
      id: "cancelled", 
      label: "Annulées", 
      count: cancelledOrders.length,
      icon: XCircle,
      color: "text-destructive"
    },
  ];

  const renderEmptyState = (message: string) => (
    <Card className="p-8 glass text-center">
      <p className="text-muted-foreground">{message}</p>
    </Card>
  );

  const renderOrderList = (orders: Order[], emptyMessage: string, canUpdate: boolean = false) => {
    if (orders.length === 0) {
      return renderEmptyState(emptyMessage);
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <DeliveryOrderCard
            key={order.id}
            order={order}
            onUpdateStatus={canUpdate ? onUpdateStatus : () => {}}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mes commandes</h2>
        <p className="text-muted-foreground">Gérez vos livraisons en temps réel</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex flex-col items-center gap-1 py-2 data-[state=active]:bg-background"
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span className="text-xs">{tab.label}</span>
                <span className="text-xs font-bold">{tab.count}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="pending" className="m-0">
            {/* In Transit First */}
            {inTransitOrders.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  En cours de livraison ({inTransitOrders.length})
                </h3>
                {renderOrderList(inTransitOrders, "", true)}
              </div>
            )}
            
            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  En attente ({pendingOrders.length})
                </h3>
                {renderOrderList(pendingOrders, "", true)}
              </div>
            )}

            {inTransitOrders.length === 0 && pendingOrders.length === 0 && (
              renderEmptyState("Aucune commande à livrer pour le moment")
            )}
          </TabsContent>

          <TabsContent value="delivered" className="m-0">
            {renderOrderList(deliveredOrders, "Aucune livraison effectuée aujourd'hui")}
          </TabsContent>

          <TabsContent value="reported" className="m-0">
            {renderOrderList(reportedOrders, "Aucune commande reportée")}
          </TabsContent>

          <TabsContent value="cancelled" className="m-0">
            {renderOrderList(cancelledOrders, "Aucune commande annulée")}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
