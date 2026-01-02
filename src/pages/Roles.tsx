import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, UserCheck, Clock, ShieldCheck, ShieldAlert, Truck, Phone, Eye } from 'lucide-react';
import { RolesOverview } from '@/components/roles/RolesOverview';
import { UsersRolesTable } from '@/components/roles/UsersRolesTable';
import { RoleRequestsPanel } from '@/components/roles/RoleRequestsPanel';
import { useRoleRequests } from '@/hooks/useRoleRequests';
import { useUsers } from '@/hooks/useUsers';

export default function Roles() {
  const [activeTab, setActiveTab] = useState('overview');
  const { pendingRequests } = useRoleRequests();
  const { users } = useUsers();

  const roleStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'administrateur').length,
    supervisors: users.filter(u => u.role === 'superviseur').length,
    delivery: users.filter(u => u.role === 'livreur').length,
    callers: users.filter(u => u.role === 'appelant').length,
    pending: pendingRequests?.length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rôles & Accès Sécurisés</h1>
              <p className="text-muted-foreground">
                Définir les profils utilisateurs et gérer les permissions d'accès
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{roleStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{roleStats.admins}</p>
                  <p className="text-xs text-muted-foreground">Administrateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{roleStats.supervisors}</p>
                  <p className="text-xs text-muted-foreground">Superviseurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Truck className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{roleStats.delivery}</p>
                  <p className="text-xs text-muted-foreground">Livreurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Phone className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{roleStats.callers}</p>
                  <p className="text-xs text-muted-foreground">Appelants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{roleStats.pending}</p>
                  <p className="text-xs text-muted-foreground">En Attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
              <span className="sm:hidden">Rôles</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Demandes</span>
              <span className="sm:hidden">Demandes</span>
              {roleStats.pending > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {roleStats.pending}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <RolesOverview />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UsersRolesTable />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <RoleRequestsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
