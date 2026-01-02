import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Bell, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  appelant: 'Appelant',
  livreur: 'Livreur',
  superviseur: 'Superviseur',
  administrateur: 'Administrateur',
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        isMobile ? "pl-0" : "pl-64"
      )}>
        {/* Header */}
        <header className={cn(
          "sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl",
          isMobile && "pl-16"
        )}>
          <div className="flex items-center justify-between h-full px-4 md:px-6">
            {/* Search */}
            <div className={cn(
              "relative",
              isMobile ? "flex-1 max-w-[200px]" : "w-96"
            )}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={isMobile ? "Rechercher..." : "Rechercher commandes, clients, livreurs..."}
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </Button>
              
              <div className="w-px h-8 bg-border hidden md:block" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    {!isMobile && (
                      <div className="text-left">
                        <p className="text-sm font-medium">{profile?.full_name || 'Utilisateur'}</p>
                        <p className="text-xs text-muted-foreground">{role ? roleLabels[role] : 'Chargement...'}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={cn(
          "p-4 md:p-6",
          isMobile && "pt-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
