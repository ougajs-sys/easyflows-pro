import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  Eye, 
  Truck, 
  Phone, 
  Check, 
  X,
  Settings,
  Users,
  Package,
  ClipboardList,
  CreditCard,
  BarChart3,
  Calendar,
  MessageSquare,
  GraduationCap,
  Bell
} from 'lucide-react';

interface Permission {
  name: string;
  icon: React.ElementType;
  admin: boolean;
  supervisor: boolean;
  delivery: boolean;
  caller: boolean;
}

const permissions: Permission[] = [
  { name: 'Tableau de bord', icon: BarChart3, admin: true, supervisor: true, delivery: true, caller: true },
  { name: 'Gestion des commandes', icon: ClipboardList, admin: true, supervisor: true, delivery: true, caller: true },
  { name: 'Gestion des produits', icon: Package, admin: true, supervisor: false, delivery: false, caller: false },
  { name: 'Gestion des clients', icon: Users, admin: true, supervisor: true, delivery: false, caller: true },
  { name: 'Gestion des paiements', icon: CreditCard, admin: true, supervisor: true, delivery: true, caller: true },
  { name: 'Gestion du stock', icon: Package, admin: true, supervisor: true, delivery: false, caller: false },
  { name: 'Synthèse & rapports', icon: BarChart3, admin: true, supervisor: true, delivery: false, caller: false },
  { name: 'Supervision équipe', icon: Eye, admin: true, supervisor: true, delivery: false, caller: false },
  { name: 'Planning & horaires', icon: Calendar, admin: true, supervisor: true, delivery: true, caller: true },
  { name: 'Campagnes SMS', icon: MessageSquare, admin: true, supervisor: true, delivery: false, caller: false },
  { name: 'Formation', icon: GraduationCap, admin: true, supervisor: true, delivery: true, caller: true },
  { name: 'Intégrations & Webhooks', icon: Settings, admin: true, supervisor: true, delivery: false, caller: false },
  { name: 'Administration système', icon: Settings, admin: true, supervisor: false, delivery: false, caller: false },
  { name: 'Gestion des rôles', icon: Shield, admin: true, supervisor: false, delivery: false, caller: false },
  { name: 'Notifications', icon: Bell, admin: true, supervisor: true, delivery: true, caller: true },
];

const roles = [
  {
    id: 'administrateur',
    name: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités du système',
    icon: ShieldCheck,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    features: [
      'Gestion complète des utilisateurs et rôles',
      'Configuration système et intégrations',
      'Accès à toutes les données et rapports',
      'Gestion des produits et stock',
      'Approbation des demandes de rôles',
    ],
  },
  {
    id: 'superviseur',
    name: 'Superviseur',
    description: 'Supervision des équipes et suivi des performances',
    icon: Eye,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    features: [
      'Suivi des performances des équipes',
      'Gestion des plannings',
      'Accès aux rapports de synthèse',
      'Gestion des campagnes SMS',
      'Supervision des livraisons',
    ],
  },
  {
    id: 'livreur',
    name: 'Livreur',
    description: 'Gestion des livraisons et suivi des commandes',
    icon: Truck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    features: [
      'Consultation des commandes assignées',
      'Mise à jour du statut de livraison',
      'Enregistrement des paiements',
      'Accès au planning personnel',
      'Notifications en temps réel',
    ],
  },
  {
    id: 'appelant',
    name: 'Appelant',
    description: 'Gestion des appels clients et suivi des relances',
    icon: Phone,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    features: [
      'Gestion des clients et prospects',
      'Création et suivi des commandes',
      'Planification des relances',
      'Accès au planning personnel',
      'Historique des interactions',
    ],
  },
];

export function RolesOverview() {
  return (
    <div className="space-y-6">
      {/* Role Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className={`${role.borderColor} border-2`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${role.bgColor}`}>
                  <role.icon className={`h-6 w-6 ${role.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <CardDescription className="text-sm">{role.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {role.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className={`h-4 w-4 ${role.color}`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Matrice des Permissions
          </CardTitle>
          <CardDescription>
            Vue détaillée des accès par rôle pour chaque fonctionnalité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fonctionnalité</th>
                  <th className="text-center py-3 px-4 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-red-500" />
                      <span className="hidden sm:inline text-red-500">Admin</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <span className="hidden sm:inline text-purple-500">Superviseur</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span className="hidden sm:inline text-blue-500">Livreur</span>
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="hidden sm:inline text-green-500">Appelant</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <permission.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{permission.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {permission.admin ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {permission.supervisor ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {permission.delivery ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {permission.caller ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
