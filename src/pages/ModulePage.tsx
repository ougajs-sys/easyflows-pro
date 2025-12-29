import { useLocation, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Construction,
} from "lucide-react";

const moduleData: Record<string, { title: string; description: string; icon: any; color: string; features: string[] }> = {
  roles: {
    title: "Rôles & Accès Sécurisés",
    description: "Définir les profils utilisateurs et gérer les permissions d'accès",
    icon: ShieldCheck,
    color: "text-red-400",
    features: ["Authentification forte (ID, code, 2FA)", "Sessions enregistrées", "Permissions limitées par rôle", "Historique des connexions"],
  },
  supervisor: {
    title: "Tableau de Bord Superviseur",
    description: "Vue d'ensemble des opérations et suivi des équipes",
    icon: LayoutDashboard,
    color: "text-blue-400",
    features: ["Suivi temps réel des commandes", "Performance des livreurs", "Alertes automatiques", "Rapports quotidiens"],
  },
  admin: {
    title: "Tableau de Bord Administrateur",
    description: "Gestion complète de la plateforme et paramétrage",
    icon: Users,
    color: "text-purple-400",
    features: ["Gestion des utilisateurs", "Configuration système", "Statistiques globales", "Exports de données"],
  },
  delivery: {
    title: "Espace Livreur + Stock",
    description: "Interface dédiée aux livreurs avec gestion de leur stock",
    icon: Truck,
    color: "text-green-400",
    features: ["Liste des livraisons du jour", "Navigation GPS intégrée", "Stock personnel", "Confirmation de paiement"],
  },
  stock: {
    title: "Stock Global",
    description: "Gestion centralisée des stocks et inventaires",
    icon: Package,
    color: "text-orange-400",
    features: ["Inventaire en temps réel", "Alertes stock faible", "Historique mouvements", "Réapprovisionnement auto"],
  },
  notifications: {
    title: "Notifications IA + Chat",
    description: "Système intelligent de notifications et messagerie",
    icon: Bell,
    color: "text-yellow-400",
    features: ["Notifications push", "Chat interne", "Alertes prioritaires", "IA de suggestion"],
  },
  payment: {
    title: "Paiement Sécurisé",
    description: "Gestion des paiements Mobile Money et carte bancaire",
    icon: CreditCard,
    color: "text-emerald-400",
    features: ["Mobile Money", "Carte bancaire", "Paiement partiel", "Historique transactions"],
  },
  clients: {
    title: "Suivi Clients Reportés/Partiel",
    description: "Gestion des clients avec paiements reportés ou partiels",
    icon: Clock,
    color: "text-pink-400",
    features: ["Liste clients reportés", "Suivi paiements partiels", "Rappels automatiques", "Historique client"],
  },
  utb: {
    title: "Synchronisation UTB",
    description: "Intégration et synchronisation avec le système UTB",
    icon: RefreshCw,
    color: "text-cyan-400",
    features: ["Sync automatique", "Import/Export données", "Réconciliation", "Logs de sync"],
  },
  retargeting: {
    title: "Relances Automatisées",
    description: "Système de relance intelligent pour les clients",
    icon: MessageSquare,
    color: "text-indigo-400",
    features: ["Relances programmées", "Segmentation IA", "Templates personnalisés", "Suivi performances"],
  },
  synthesis: {
    title: "Synthèse Finale",
    description: "Rapports et analyses consolidées",
    icon: BarChart3,
    color: "text-teal-400",
    features: ["Rapports journaliers", "Analyses tendances", "KPIs métier", "Exports PDF"],
  },
  planning: {
    title: "Planification Cycle",
    description: "Planification des cycles de livraison et opérations",
    icon: Calendar,
    color: "text-rose-400",
    features: ["Planning livreurs", "Optimisation tournées", "Calendrier livraisons", "Prévisions IA"],
  },
  training: {
    title: "Formation/Onboarding",
    description: "Module de formation pour les nouveaux utilisateurs",
    icon: GraduationCap,
    color: "text-amber-400",
    features: ["Tutoriels interactifs", "Quiz de validation", "Suivi progression", "Certifications"],
  },
  campaigns: {
    title: "Campagnes SMS/WhatsApp",
    description: "Gestion des campagnes marketing multicanal",
    icon: Send,
    color: "text-violet-400",
    features: ["Envoi SMS en masse", "WhatsApp Business", "Templates messages", "Analytics campagnes"],
  },
};

export default function ModulePage() {
  const location = useLocation();
  const moduleId = location.pathname.replace("/", "");
  const module = moduleData[moduleId || ""];

  if (!module) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">Module non trouvé</p>
          <Link to="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const Icon = module.icon;

  return (
    <DashboardLayout>
      {/* Back Button */}
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour au dashboard
      </Link>

      {/* Module Header */}
      <div className="glass rounded-2xl p-8 mb-8 animate-fade-in">
        <div className="flex items-start gap-6">
          <div className={`w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center ${module.color}`}>
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
            <p className="text-muted-foreground text-lg">{module.description}</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {module.features.map((feature, index) => (
          <div
            key={feature}
            className="glass glass-hover rounded-xl p-5 animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-medium">{feature}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="glass rounded-2xl p-12 text-center animate-fade-in">
        <Construction className="w-16 h-16 text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Module en développement</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Ce module est actuellement en cours de développement. 
          Connectez Lovable Cloud pour activer les fonctionnalités backend.
        </p>
        <Button variant="glow">
          Activer Lovable Cloud
        </Button>
      </div>
    </DashboardLayout>
  );
}
