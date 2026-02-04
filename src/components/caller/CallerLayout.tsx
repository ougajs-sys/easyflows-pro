import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Package, 
  GraduationCap, 
  Menu, 
  X,
  LogOut,
  Moon,
  Sun,
  Users,
  RefreshCw,
  Wallet,
  User,
  Download
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

interface CallerLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Mon espace", icon: Home },
  { id: "orders", label: "Mes Commandes", icon: Package },
  { id: "clients", label: "Suivi Clients", icon: Users },
  { id: "followups", label: "Relances", icon: RefreshCw },
  { id: "training", label: "Formation", icon: GraduationCap },
  { id: "profile", label: "Mon Profil", icon: User },
];

export function CallerLayout({ 
  children, 
  activeSection, 
  onSectionChange,
}: CallerLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (navigator as { standalone?: boolean }).standalone === true;
    setIsAppInstalled(isStandalone || isIOSStandalone);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSectionClick = (sectionId: string) => {
    onSectionChange(sectionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 lg:transform-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-foreground">Appelant</h1>
                  <p className="text-xs text-muted-foreground">Espace personnel</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionClick(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              {/* Install App Button */}
              {!isAppInstalled && (
                <Link
                  to="/install"
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-primary hover:bg-primary/10 border border-primary/20 bg-primary/5 mt-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Installer l'app</span>
                </Link>
              )}
            </nav>
          </ScrollArea>

          {/* Payment Button */}
          <div className="p-4 border-t border-border">
            <a 
              href="https://pay.wave.com/m/M_ci_vNYXDd3MiHes/c/ci/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Wallet className="w-5 h-5" />
              Verser mes recettes
            </a>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 mr-3" />
              ) : (
                <Moon className="w-4 h-4 mr-3" />
              )}
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background border-b border-border p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">
            {menuItems.find(m => m.id === activeSection)?.label || "Mon espace"}
          </h1>
          <div className="w-10" />
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
