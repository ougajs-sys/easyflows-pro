import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";
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
  Menu,
  X,
  Moon,
  Sun,
  User,
  LogOut,
  Code,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type AppRole = "appelant" | "livreur" | "superviseur" | "administrateur";

interface MenuItem {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  allowedRoles: AppRole[];
}

const menuItems: MenuItem[] = [
  { id: 0, label: "Commandes", icon: Package, path: "/orders", color: "text-primary", allowedRoles: ["appelant", "livreur", "superviseur", "administrateur"] },
  { id: 1, label: "Produits", icon: Package, path: "/products", color: "text-orange-400", allowedRoles: ["administrateur"] },
  { id: 2, label: "Rôles & Accès", icon: ShieldCheck, path: "/roles", color: "text-red-400", allowedRoles: ["administrateur"] },
  { id: 3, label: "Tableau Superviseur", icon: LayoutDashboard, path: "/supervisor", color: "text-blue-400", allowedRoles: ["superviseur", "administrateur"] },
  { id: 4, label: "Tableau Admin", icon: Users, path: "/admin", color: "text-purple-400", allowedRoles: ["administrateur"] },
  { id: 5, label: "Espace Livreur", icon: Truck, path: "/delivery", color: "text-green-400", allowedRoles: ["livreur", "superviseur", "administrateur"] },
  { id: 6, label: "Stock Global", icon: Package, path: "/stock", color: "text-lime-400", allowedRoles: ["superviseur", "administrateur"] },
  { id: 7, label: "Notifications", icon: Bell, path: "/notifications", color: "text-yellow-400", allowedRoles: ["appelant", "livreur", "superviseur", "administrateur"] },
  { id: 8, label: "Paiement", icon: CreditCard, path: "/payment", color: "text-emerald-400", allowedRoles: ["appelant", "livreur", "superviseur", "administrateur"] },
  { id: 9, label: "Suivi Clients", icon: Clock, path: "/clients", color: "text-pink-400", allowedRoles: ["appelant", "superviseur", "administrateur"] },
  { id: 10, label: "Intégrations", icon: RefreshCw, path: "/utb", color: "text-cyan-400", allowedRoles: ["superviseur", "administrateur"] },
  { id: 11, label: "Relances Auto", icon: MessageSquare, path: "/retargeting", color: "text-indigo-400", allowedRoles: ["appelant", "superviseur", "administrateur"] },
  { id: 12, label: "Synthèse", icon: BarChart3, path: "/synthesis", color: "text-teal-400", allowedRoles: ["superviseur", "administrateur"] },
  { id: 13, label: "Planification", icon: Calendar, path: "/planning", color: "text-rose-400", allowedRoles: ["appelant", "livreur", "superviseur", "administrateur"] },
  { id: 14, label: "Formation", icon: GraduationCap, path: "/training", color: "text-amber-400", allowedRoles: ["appelant", "livreur", "superviseur", "administrateur"] },
  { id: 15, label: "Campagnes SMS", icon: Send, path: "/campaigns", color: "text-violet-400", allowedRoles: ["superviseur", "administrateur"] },
  { id: 16, label: "Formulaires Embed", icon: Code, path: "/admin/embed-forms", color: "text-sky-400", allowedRoles: ["superviseur", "administrateur"] },
];

function SidebarContent({ collapsed, onToggleCollapse, onItemClick }: { 
  collapsed: boolean; 
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
}) {
  const location = useLocation();
  const { role, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const filteredMenuItems = menuItems.filter((item) =>
    role ? item.allowedRoles.includes(role as AppRole) : false
  );

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    onItemClick?.();
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={onItemClick}>
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center glow">
            <Zap className="w-5 h-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-primary">Pipeline</span>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto flex-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isNotifications = item.path === '/notifications';

          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-primary/15 border border-sidebar-primary/30"
                  : "hover:bg-sidebar-accent border border-transparent"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all relative",
                  isActive ? "bg-sidebar-primary/20" : "bg-sidebar-accent group-hover:bg-sidebar-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-sidebar-primary" : item.color
                  )}
                />
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive ? "text-sidebar-primary" : "text-sidebar-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {isNotifications && unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Profile Link */}
        <Link
          to="/profile"
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent",
            location.pathname === "/profile" && "bg-sidebar-primary/15 border border-sidebar-primary/30"
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-xs">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate block">
                {profile?.full_name || 'Mon profil'}
              </span>
            </div>
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-accent">
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-yellow-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </div>
          {!collapsed && (
            <span className="text-sm font-medium text-sidebar-foreground">
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </span>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-destructive/10 text-destructive"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10">
            <LogOut className="w-4 h-4" />
          </div>
          {!collapsed && (
            <span className="text-sm font-medium">
              Déconnexion
            </span>
          )}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-card shadow-lg border border-border"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
            <div className="flex flex-col h-full">
              <SidebarContent 
                collapsed={false} 
                onItemClick={() => setMobileOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <SidebarContent 
        collapsed={collapsed} 
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
    </aside>
  );
}
