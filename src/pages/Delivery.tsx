import { useState } from "react";
import { DeliveryLayout } from "@/components/delivery/DeliveryLayout";
import { DeliveryDashboard } from "@/components/delivery/DeliveryDashboard";
import { DeliveryOrders } from "@/components/delivery/DeliveryOrders";
import { DeliveryTraining } from "@/components/delivery/DeliveryTraining";
import { DeliveryStock } from "@/components/delivery/DeliveryStock";
import { DeliverySupplyRequest } from "@/components/delivery/DeliverySupplyRequest";
import { InternalChat } from "@/components/chat/InternalChat";
import { UserProfile } from "@/components/profile/UserProfile";
import { useDeliveryPerson } from "@/hooks/useDeliveryPerson";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export default function Delivery() {
  const { role } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const {
    deliveryProfile,
    assignedOrders,
    todayDeliveries,
    reportedOrders,
    cancelledOrders,
    isLoading,
    updateDeliveryStatus,
    updateOrderStatus,
    returnToRedistribution,
    cancelOrder,
    deliveryFee,
    todayRevenue,
    amountToReturn,
  } = useDeliveryPerson();

  // Activer la synchronisation en temps réel pour le livreur
  useRealtimeSync({
    tables: ['orders', 'payments', 'delivery_persons', 'products'],
    deliveryPersonId: deliveryProfile?.id,
    debug: false,
  });

  const handleStatusChange = async (status: DeliveryStatus) => {
    try {
      await updateDeliveryStatus.mutateAsync(status);
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleOrderStatusChange = async (
    orderId: string, 
    status: OrderStatus, 
    amountPaid?: number,
    scheduledAt?: Date,
    reason?: string
  ) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, status, amountPaid, scheduledAt, reason });
      const statusMessages: Record<string, string> = {
        in_transit: "Livraison démarrée",
        delivered: "Livraison confirmée",
        partial: "Paiement partiel enregistré",
        reported: "Commande reportée",
        cancelled: "Commande annulée",
      };
      toast.success(statusMessages[status] || "Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour de la commande");
    }
  };

  const handleReturnToRedistribution = async (orderId: string, reason?: string) => {
    try {
      await returnToRedistribution.mutateAsync({ orderId, reason });
      toast.success("Commande renvoyée à la redistribution");
    } catch {
      toast.error("Erreur lors du renvoi de la commande");
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    try {
      await cancelOrder.mutateAsync({ orderId, reason });
      toast.success("Commande annulée");
    } catch {
      toast.error("Erreur lors de l'annulation de la commande");
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

  // Prepare data for chat (reported and cancelled orders for today)
  const reportedForChat = reportedOrders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    client_name: o.client?.full_name || "Client inconnu",
    status: o.status,
  }));

  const cancelledForChat = cancelledOrders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    client_name: o.client?.full_name || "Client inconnu",
    status: o.status,
  }));

  // Stats
  const receivedCount = assignedOrders.length + todayDeliveries.length + reportedOrders.length + cancelledOrders.length;

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DeliveryDashboard
            receivedCount={receivedCount}
            deliveredCount={todayDeliveries.length}
            reportedCount={reportedOrders.length}
            cancelledCount={cancelledOrders.length}
            deliveryFee={deliveryFee}
            todayRevenue={todayRevenue}
            amountToReturn={amountToReturn}
          />
        );
      case "orders":
        return (
          <DeliveryOrders
            assignedOrders={assignedOrders}
            deliveredOrders={todayDeliveries}
            reportedOrders={reportedOrders}
            cancelledOrders={cancelledOrders}
            onUpdateStatus={handleOrderStatusChange}
            onReturnToRedistribution={handleReturnToRedistribution}
            onCancelOrder={handleCancelOrder}
            isUpdating={updateOrderStatus.isPending || returnToRedistribution.isPending || cancelOrder.isPending}
          />
        );
      case "stock":
        return <DeliveryStock deliveryPersonId={deliveryProfile.id} />;
      case "supply":
        return <DeliverySupplyRequest />;
      case "training":
        return <DeliveryTraining />;
      case "chat":
        return <InternalChat fullHeight={false} />;
      case "profile":
        return <UserProfile />;
      default:
        return null;
    }
  };

  return (
    <DeliveryLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      deliveryStatus={deliveryProfile.status}
      onStatusChange={handleStatusChange}
      isUpdatingStatus={updateDeliveryStatus.isPending}
    >
      {renderSection()}
    </DeliveryLayout>
  );
}
