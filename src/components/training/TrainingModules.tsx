import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Package, 
  Users, 
  Truck, 
  CreditCard, 
  BarChart3, 
  Zap,
  Bell, 
  Settings, 
  Shield,
  CheckCircle2,
  PlayCircle,
  Lock
} from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: string;
  videos: number;
  status: "completed" | "in-progress" | "locked" | "available";
  progress: number;
}

const modules: TrainingModule[] = [
  {
    id: "intro",
    title: "Introduction à Pipeline",
    description: "Découvrez l'interface et les concepts de base",
    icon: Settings,
    duration: "15 min",
    videos: 3,
    status: "completed",
    progress: 100,
  },
  {
    id: "orders",
    title: "Gestion des Commandes",
    description: "Créer, modifier et suivre les commandes",
    icon: Package,
    duration: "25 min",
    videos: 5,
    status: "completed",
    progress: 100,
  },
  {
    id: "clients",
    title: "Gestion des Clients",
    description: "Ajouter des clients et gérer leur historique",
    icon: Users,
    duration: "20 min",
    videos: 4,
    status: "completed",
    progress: 100,
  },
  {
    id: "delivery",
    title: "Espace Livreur",
    description: "Gérer les livraisons et optimiser les tournées",
    icon: Truck,
    duration: "30 min",
    videos: 6,
    status: "in-progress",
    progress: 50,
  },
  {
    id: "payments",
    title: "Paiements et Facturation",
    description: "Enregistrer et suivre les paiements",
    icon: CreditCard,
    duration: "20 min",
    videos: 4,
    status: "available",
    progress: 0,
  },
  {
    id: "analytics",
    title: "Synthèse et Rapports",
    description: "Analyser les performances et exporter les données",
    icon: BarChart3,
    duration: "25 min",
    videos: 5,
    status: "available",
    progress: 0,
  },
  {
    id: "performance",
    title: "Réactivité & Performance",
    description: "Rendre l'application fluide et rapide au quotidien",
    icon: Zap,
    duration: "20 min",
    videos: 4,
    status: "available",
    progress: 0,
  },
  {
    id: "notifications",
    title: "Notifications et Alertes",
    description: "Configurer les notifications automatiques",
    icon: Bell,
    duration: "15 min",
    videos: 3,
    status: "locked",
    progress: 0,
  },
  {
    id: "admin",
    title: "Administration Avancée",
    description: "Gérer les utilisateurs et les permissions",
    icon: Shield,
    duration: "30 min",
    videos: 6,
    status: "locked",
    progress: 0,
  },
];

interface TrainingModulesProps {
  selectedModule: string | null;
  onSelectModule: (id: string) => void;
}

export function TrainingModules({ selectedModule, onSelectModule }: TrainingModulesProps) {
  const getStatusBadge = (status: TrainingModule["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-success/20 text-success border-success/30">Terminé</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">En cours</Badge>;
      case "locked":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Verrouillé</Badge>;
      default:
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Disponible</Badge>;
    }
  };

  const getStatusIcon = (status: TrainingModule["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "in-progress":
        return <PlayCircle className="w-5 h-5 text-primary" />;
      case "locked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return <PlayCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Modules de Formation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {modules.map((module) => {
            const Icon = module.icon;
            const isDisabled = module.status === "locked";
            const isSelected = selectedModule === module.id;

            return (
              <button
                key={module.id}
                onClick={() => !isDisabled && onSelectModule(module.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full p-4 text-left transition-all",
                  isDisabled 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-secondary/50 cursor-pointer",
                  isSelected && "bg-primary/10 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    module.status === "completed" ? "bg-success/20" :
                    module.status === "in-progress" ? "bg-primary/20" :
                    "bg-secondary"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      module.status === "completed" ? "text-success" :
                      module.status === "in-progress" ? "text-primary" :
                      "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{module.title}</h3>
                      {getStatusIcon(module.status)}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {module.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{module.duration}</span>
                        <span>•</span>
                        <span>{module.videos} vidéos</span>
                      </div>
                      {getStatusBadge(module.status)}
                    </div>
                    {module.status === "in-progress" && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${module.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
