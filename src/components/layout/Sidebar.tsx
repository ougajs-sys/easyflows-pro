import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Users,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Package,
  Bell,
  CreditCard,
  Clock,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Calendar,
  GraduationCap,
  Send,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const menuItems = [
  { id: 0, label: "Commandes", icon: Package, path: "/orders", color: "text-primary" },
  { id: 1, label: "Produits", icon: Package, path: "/products", color: "text-orange-400" },
  { id: 2, label: "Rôles & Accès", icon: ShieldCheck, path: "/roles", color: "text-red-400" },
  { id: 3, label: "Tableau Superviseur", icon: LayoutDashboard, path: "/supervisor", color: "text-blue-400" },
  { id: 4, label: "Tableau Admin", icon: Users, path: "/admin", color: "text-purple-400" },
  { id: 5, label: "Espace Livreur", icon: Truck, path: "/delivery", color: "text-green-400" },
  { id: 6, label: "Stock Global", icon: Package, path: "/stock", color: "text-lime-400" },
  { id: 7, label: "Notifications IA", icon: Bell, path: "/notifications", color: "text-yellow-400" },
  { id: 8, label: "Paiement Sécurisé", icon: CreditCard, path: "/payment", color: "text-emerald-400" },
  { id: 9, label: "Suivi Clients", icon: Clock, path: "/clients", color: "text-pink-400" },
  { id: 10, label: "Sync UTB", icon: RefreshCw, path: "/utb", color: "text-cyan-400" },
  { id: 11, label: "Relances Auto", icon: MessageSquare, path: "/retargeting", color: "text-indigo-400" },
  { id: 12, label: "Synthèse Finale", icon: BarChart3, path: "/synthesis", color: "text-teal-400" },
  { id: 13, label: "Planification", icon: Calendar, path: "/planning", color: "text-rose-400" },
  { id: 14, label: "Formation", icon: GraduationCap, path: "/training", color: "text-amber-400" },
  { id: 15, label: "Campagnes SMS", icon: Send, path: "/campaigns", color: "text-violet-400" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-gradient">Pipeline</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary/15 border border-primary/30"
                  : "hover:bg-sidebar-accent border border-transparent"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                  isActive ? "bg-primary/20" : "bg-sidebar-accent group-hover:bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-primary" : item.color
                  )}
                />
              </div>
              {!collapsed && (
                <>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors flex-1",
                      isActive ? "text-primary" : "text-sidebar-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.id.toString().padStart(2, "0")}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
