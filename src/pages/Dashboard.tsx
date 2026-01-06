import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { Package, Truck, CreditCard, Users } from "lucide-react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-gradient">Pipeline</span> Gestion Automatique
        </h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de vos opérations en temps réel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Commandes Aujourd'hui"
          value={47}
          change={12.5}
          icon={<Package className="w-5 h-5" />}
          color="primary"
        />
        <StatCard
          title="Livraisons Effectuées"
          value={38}
          change={8.2}
          icon={<Truck className="w-5 h-5" />}
          color="success"
        />
        <StatCard
          title="Chiffre du Jour"
          value="1.2M FCFA"
          change={15.3}
          icon={<CreditCard className="w-5 h-5" />}
          color="warning"
        />
        <StatCard
          title="Nouveaux Clients"
          value={23}
          change={-3.1}
          icon={<Users className="w-5 h-5" />}
          color="primary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Table - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <SalesTrendChart />
          <OrdersTable />
        </div>

        {/* Right Sidebar - No more DeliveryStatus for callers */}
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>

      {/* Activity Section */}
      <div className="mt-6">
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
}
