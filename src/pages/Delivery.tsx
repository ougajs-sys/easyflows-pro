import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeliveryStats } from "@/components/delivery/DeliveryStats";
import { DeliveryOrdersList } from "@/components/delivery/DeliveryOrdersList";
import { DeliveryStatusToggle } from "@/components/delivery/DeliveryStatusToggle";
import { useDeliveryPerson } from "@/hooks/useDeliveryPerson";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export default function Delivery() {
  const { role } = useAuth();
  const {
    deliveryProfile,
    assignedOrders,
    todayDeliveries,
    isLoading,
    updateDeliveryStatus,
    updateOrderStatus,
  } = useDeliveryPerson();

  const handleStatusChange = async (status: Database["public"]["Enums"]["delivery_status"]) => {
    try {
      await updateDeliveryStatus.mutateAsync(status);
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus, amountPaid?: number) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, status, amountPaid });
      const statusMessages: Record<string, string> = {
        in_transit: "Livraison démarrée",
        delivered: "Livraison confirmée",
        partial: "Paiement partiel enregistré",
        reported: "Commande reportée",
      };
      toast.success(statusMessages[status] || "Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour de la commande");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Check if user has a delivery person profile
  if (!deliveryProfile && role === "livreur") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Profil livreur non configuré
          </h2>
          <p className="text-muted-foreground max-w-md">
            Votre profil de livreur n'est pas encore configuré. Veuillez contacter un administrateur pour activer votre compte livreur.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // For admins/supervisors without delivery profile, show info message
  if (!deliveryProfile) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Espace Livreur</h1>
            <p className="text-muted-foreground">Gérez vos livraisons et mettez à jour votre statut</p>
          </div>
          <Card className="p-6 glass">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Mode supervision</h3>
                <p className="text-sm text-muted-foreground">
                  Vous consultez l'espace livreur en tant qu'administrateur ou superviseur. 
                  Pour voir les commandes, accédez à la page Commandes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const inTransitOrders = assignedOrders.filter((o) => o.status === "in_transit");
  const pendingOrders = assignedOrders.filter((o) => o.status !== "in_transit");
  const todayRevenue = todayDeliveries.reduce((sum, o) => sum + (o.amount_paid || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Espace Livreur</h1>
            <p className="text-muted-foreground">Gérez vos livraisons et mettez à jour votre statut</p>
          </div>
          <div className="w-full md:w-auto">
            <DeliveryStatusToggle
              currentStatus={deliveryProfile.status}
              onStatusChange={handleStatusChange}
              isUpdating={updateDeliveryStatus.isPending}
            />
          </div>
        </div>

        {/* Stats */}
        <DeliveryStats
          assignedCount={pendingOrders.length}
          completedToday={todayDeliveries.length}
          inTransitCount={inTransitOrders.length}
          todayRevenue={todayRevenue}
          status={deliveryProfile.status}
        />

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="active" className="data-[state=active]:bg-background">
              À livrer ({assignedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-background">
              Livrées aujourd'hui ({todayDeliveries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <DeliveryOrdersList
              orders={assignedOrders}
              onUpdateStatus={handleOrderStatusChange}
              isUpdating={updateOrderStatus.isPending}
            />
          </TabsContent>

          <TabsContent value="completed">
            {todayDeliveries.length === 0 ? (
              <Card className="p-8 glass text-center">
                <p className="text-muted-foreground">Aucune livraison effectuée aujourd'hui</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {todayDeliveries.map((order) => (
                  <Card key={order.id} className="p-4 glass">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{order.client?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.product?.name} x{order.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">{order.amount_paid?.toLocaleString()} F</p>
                        <p className="text-xs text-muted-foreground">{order.order_number}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
