import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  PlayCircle, 
  CheckCircle2, 
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  GraduationCap
} from "lucide-react";

interface Video {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  youtubeId: string;
}

interface ModuleContent {
  id: string;
  title: string;
  description: string;
  videos: Video[];
  steps: string[];
  tips: string[];
}

const moduleContents: Record<string, ModuleContent> = {
  intro: {
    id: "intro",
    title: "Introduction à Pipeline",
    description: "Découvrez l'interface et les concepts de base de Pipeline Gestion Automatique.",
    videos: [
      { id: "v1", title: "Bienvenue sur Pipeline", duration: "3:45", completed: true, youtubeId: "dQw4w9WgXcQ" },
      { id: "v2", title: "Navigation dans l'interface", duration: "5:20", completed: true, youtubeId: "jNQXAC9IVRw" },
      { id: "v3", title: "Configuration initiale", duration: "6:15", completed: true, youtubeId: "9bZkp7q19f0" },
    ],
    steps: [
      "Connectez-vous à votre compte Pipeline",
      "Explorez le menu latéral pour découvrir les modules",
      "Configurez votre profil avec vos informations",
      "Activez les notifications pour rester informé",
    ],
    tips: [
      "Utilisez le mode sombre pour réduire la fatigue visuelle",
      "Épinglez vos pages les plus utilisées en favoris",
      "Consultez les statistiques quotidiennes sur le tableau de bord",
    ],
  },
  orders: {
    id: "orders",
    title: "Gestion des Commandes",
    description: "Apprenez à créer, modifier et suivre les commandes efficacement.",
    videos: [
      { id: "v1", title: "Créer une nouvelle commande", duration: "4:30", completed: true, youtubeId: "ZZ5LpwO-An4" },
      { id: "v2", title: "Modifier une commande existante", duration: "3:15", completed: true, youtubeId: "kJQP7kiw5Fk" },
      { id: "v3", title: "Statuts et workflow des commandes", duration: "5:45", completed: true, youtubeId: "RgKAFK5djSk" },
      { id: "v4", title: "Assigner un livreur", duration: "3:00", completed: true, youtubeId: "fJ9rUzIMcZQ" },
      { id: "v5", title: "Annuler et gérer les retours", duration: "4:20", completed: true, youtubeId: "CevxZvSJLk8" },
    ],
    steps: [
      "Accédez au module Commandes depuis le menu",
      "Cliquez sur 'Nouvelle Commande' pour commencer",
      "Sélectionnez le client ou créez-en un nouveau",
      "Ajoutez les produits et vérifiez les quantités",
      "Assignez un livreur et confirmez la commande",
    ],
    tips: [
      "Vérifiez toujours le stock avant de confirmer",
      "Utilisez les filtres pour retrouver rapidement une commande",
      "Ajoutez des notes pour les instructions spéciales de livraison",
    ],
  },
  clients: {
    id: "clients",
    title: "Gestion des Clients",
    description: "Gérez votre base de clients et leur historique d'achats.",
    videos: [
      { id: "v1", title: "Ajouter un nouveau client", duration: "3:00", completed: true, youtubeId: "OPf0YbXqDm0" },
      { id: "v2", title: "Consulter l'historique client", duration: "4:15", completed: true, youtubeId: "JGwWNGJdvx8" },
      { id: "v3", title: "Segmentation des clients", duration: "5:30", completed: true, youtubeId: "kXYiU_JCYtU" },
      { id: "v4", title: "Relances et suivis", duration: "4:45", completed: true, youtubeId: "09R8_2nJtjg" },
    ],
    steps: [
      "Accédez au module Suivi Clients",
      "Recherchez un client existant ou créez-en un nouveau",
      "Renseignez les informations de contact complètes",
      "Consultez l'historique des commandes du client",
      "Programmez des relances si nécessaire",
    ],
    tips: [
      "Segmentez vos clients pour des campagnes ciblées",
      "Notez les préférences de livraison de chaque client",
      "Utilisez les statistiques pour identifier les meilleurs clients",
    ],
  },
  delivery: {
    id: "delivery",
    title: "Espace Livreur",
    description: "Optimisez vos livraisons et gérez vos tournées efficacement.",
    videos: [
      { id: "v1", title: "Vue d'ensemble du tableau livreur", duration: "4:00", completed: true, youtubeId: "hT_nvWreIhg" },
      { id: "v2", title: "Accepter et gérer les livraisons", duration: "5:30", completed: true, youtubeId: "YQHsXMglC9A" },
      { id: "v3", title: "Confirmer une livraison", duration: "3:45", completed: true, youtubeId: "450p7goxZqg" },
      { id: "v4", title: "Gérer les problèmes de livraison", duration: "6:00", completed: false, youtubeId: "60ItHLz5WEA" },
      { id: "v5", title: "Encaisser les paiements", duration: "4:15", completed: false, youtubeId: "lp-EO5I60KA" },
      { id: "v6", title: "Rapport de fin de journée", duration: "5:00", completed: false, youtubeId: "pRpeEdMmmQ0" },
    ],
    steps: [
      "Connectez-vous et passez en mode 'Disponible'",
      "Consultez la liste des livraisons assignées",
      "Organisez votre tournée par zone géographique",
      "Confirmez chaque livraison avec le client",
      "Encaissez le paiement si nécessaire",
      "Clôturez votre journée avec le rapport",
    ],
    tips: [
      "Vérifiez les produits avant de partir en livraison",
      "Contactez le client en cas de retard",
      "Photographiez les produits remis en cas de litige",
    ],
  },
  payments: {
    id: "payments",
    title: "Paiements et Facturation",
    description: "Gérez les paiements et le suivi financier de vos commandes.",
    videos: [
      { id: "v1", title: "Types de paiements", duration: "3:30", completed: false, youtubeId: "Zi_XLOBDo_Y" },
      { id: "v2", title: "Enregistrer un paiement", duration: "4:00", completed: false, youtubeId: "2Vv-BfVoq4g" },
      { id: "v3", title: "Suivi des impayés", duration: "5:15", completed: false, youtubeId: "fLexgOxsZu0" },
      { id: "v4", title: "Rapports financiers", duration: "6:30", completed: false, youtubeId: "PT2_F-1esPk" },
    ],
    steps: [
      "Accédez au module Paiement",
      "Sélectionnez la commande concernée",
      "Choisissez le mode de paiement",
      "Confirmez le montant et enregistrez",
      "Générez un reçu si nécessaire",
    ],
    tips: [
      "Vérifiez les montants avant validation",
      "Utilisez les filtres pour voir les paiements en attente",
      "Exportez les rapports pour la comptabilité",
    ],
  },
  analytics: {
    id: "analytics",
    title: "Synthèse et Rapports",
    description: "Analysez les performances et prenez des décisions éclairées.",
    videos: [
      { id: "v1", title: "Tableau de bord synthèse", duration: "4:45", completed: false, youtubeId: "IcrbM1l_BoI" },
      { id: "v2", title: "Filtres et périodes", duration: "3:30", completed: false, youtubeId: "nfWlot6h_JM" },
      { id: "v3", title: "Graphiques et tendances", duration: "5:00", completed: false, youtubeId: "bo_efYhYU2A" },
      { id: "v4", title: "Export PDF et CSV", duration: "4:15", completed: false, youtubeId: "5qap5aO4i9A" },
      { id: "v5", title: "Indicateurs clés", duration: "6:00", completed: false, youtubeId: "ktvTqknDobU" },
    ],
    steps: [
      "Accédez au module Synthèse",
      "Sélectionnez la période d'analyse",
      "Consultez les indicateurs principaux",
      "Analysez les graphiques de tendance",
      "Exportez les données pour vos rapports",
    ],
    tips: [
      "Comparez les périodes pour voir l'évolution",
      "Identifiez les produits les plus vendus",
      "Suivez les performances des livreurs",
    ],
  },
  performance: {
    id: "performance",
    title: "Réactivité & Performance",
    description: "Optimisez la rapidité perçue et la fluidité dans Pipeline.",
    videos: [
      { id: "v1", title: "Réactivité perçue : ce qui compte", duration: "4:10", completed: false, youtubeId: "hT_nvWreIhg" },
      { id: "v2", title: "Données : cache, filtres et pagination", duration: "5:20", completed: false, youtubeId: "dQw4w9WgXcQ" },
      { id: "v3", title: "Écrans lourds : vues rapides", duration: "4:50", completed: false, youtubeId: "jNQXAC9IVRw" },
      { id: "v4", title: "Santé et latence : surveiller", duration: "3:40", completed: false, youtubeId: "9bZkp7q19f0" },
    ],
    steps: [
      "Préférez les vues synthèse avant d'ouvrir un détail lourd",
      "Activez les filtres pour limiter les listes longues",
      "Évitez les exports en période de forte activité",
      "Planifiez les synchronisations en dehors des pics",
      "Surveillez les temps de réponse dans l'onglet Synthèse",
    ],
    tips: [
      "Gardez les onglets inutiles fermés pour réduire la mémoire",
      "Utilisez les favoris pour accéder instantanément aux pages clés",
      "Laissez les notifications activées pour éviter les rafraîchissements manuels",
      "Préférez le Wi‑Fi stable pour les actions lourdes",
    ],
  },
};

interface TrainingVideoProps {
  moduleId: string | null;
}

export function TrainingVideo({ moduleId }: TrainingVideoProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const content = moduleId ? moduleContents[moduleId] : null;

  if (!content) {
    return (
      <Card className="glass-card h-full min-h-[500px] flex items-center justify-center">
        <CardContent className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Sélectionnez un module</h3>
          <p className="text-muted-foreground max-w-sm">
            Choisissez un module de formation dans la liste pour commencer votre apprentissage.
          </p>
        </CardContent>
      </Card>
    );
  }

  const completedVideos = content.videos.filter(v => v.completed).length;
  const progress = (completedVideos / content.videos.length) * 100;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{content.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
          </div>
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
            {completedVideos}/{content.videos.length} terminées
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progression du module</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Vidéos
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Guide
            </TabsTrigger>
            <TabsTrigger value="tips" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Astuces
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-2">
            {content.videos.map((video, index) => (
              <button
                key={video.id}
                onClick={() => setActiveVideo(video.id)}
                className={cn(
                  "w-full p-4 rounded-lg border transition-all flex items-center gap-4 text-left",
                  activeVideo === video.id 
                    ? "bg-primary/10 border-primary" 
                    : "bg-secondary/50 border-border hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  video.completed ? "bg-success/20" : "bg-primary/20"
                )}>
                  {video.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{video.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{video.duration}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
            
            {activeVideo && (
              <div className="mt-6 p-6 bg-secondary/30 rounded-xl border border-border">
                <div className="aspect-video bg-background rounded-lg overflow-hidden mb-4">
                  <iframe
                    src={`https://www.youtube.com/embed/${content.videos.find(v => v.id === activeVideo)?.youtubeId}?rel=0&modestbranding=1`}
                    title={content.videos.find(v => v.id === activeVideo)?.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const currentIndex = content.videos.findIndex(v => v.id === activeVideo);
                      if (currentIndex > 0) {
                        setActiveVideo(content.videos[currentIndex - 1].id);
                      }
                    }}
                    disabled={content.videos.findIndex(v => v.id === activeVideo) === 0}
                  >
                    Précédent
                  </Button>
                  <Button size="sm">
                    Marquer comme terminé
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const currentIndex = content.videos.findIndex(v => v.id === activeVideo);
                      if (currentIndex < content.videos.length - 1) {
                        setActiveVideo(content.videos[currentIndex + 1].id);
                      }
                    }}
                    disabled={content.videos.findIndex(v => v.id === activeVideo) === content.videos.length - 1}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <div className="bg-secondary/30 rounded-xl p-6 border border-border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Guide étape par étape
              </h4>
              <ol className="space-y-3">
                {content.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                    </div>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div className="bg-secondary/30 rounded-xl p-6 border border-border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                Conseils et astuces
              </h4>
              <ul className="space-y-3">
                {content.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
