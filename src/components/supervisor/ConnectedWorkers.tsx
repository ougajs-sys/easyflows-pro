import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Search, Circle, Crown, Shield, Phone, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkerInfo {
  id: string;
  fullName: string;
  role: "administrateur" | "superviseur" | "appelant" | "livreur";
  avatarUrl: string | null;
  status: "online" | "busy" | "offline";
  lastActivity: string;
  zone: string | null;
}

const ROLE_LABELS = {
  administrateur: "Administrateur",
  superviseur: "Superviseur",
  appelant: "Appelant",
  livreur: "Livreur",
};

const ROLE_COLORS = {
  administrateur: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  superviseur: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  appelant: "bg-green-500/20 text-green-700 border-green-500/30",
  livreur: "bg-orange-500/20 text-orange-700 border-orange-500/30",
};

const STATUS_CONFIG = {
  online: { label: "En ligne", color: "text-green-500", bgColor: "bg-green-500" },
  busy: { label: "Occupé", color: "text-orange-500", bgColor: "bg-orange-500" },
  offline: { label: "Hors ligne", color: "text-gray-400", bgColor: "bg-gray-400" },
};

const ROLE_CONFIG = {
  administrateur: {
    label: "Administrateurs",
    icon: Crown,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  superviseur: {
    label: "Superviseurs",
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  appelant: {
    label: "Appelants",
    icon: Phone,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  livreur: {
    label: "Livreurs",
    icon: Truck,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
} as const;

export function ConnectedWorkers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workers, isLoading } = useQuery({
    queryKey: ["connected-workers"],
    queryFn: async () => {
      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get all user IDs
      const userIds = userRoles?.map(ur => ur.user_id) || [];

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, updated_at")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch delivery persons for zone information
      const { data: deliveryPersons, error: dpError } = await supabase
        .from("delivery_persons")
        .select("user_id, zone, status");

      if (dpError) throw dpError;

      // Map workers with their information
      const workersData: WorkerInfo[] = userRoles?.map(userRole => {
        const profile = profiles?.find(p => p.id === userRole.user_id);
        const deliveryPerson = deliveryPersons?.find(dp => dp.user_id === userRole.user_id);

        // Determine status based on delivery person status or last activity
        let status: "online" | "busy" | "offline" = "offline";
        
        if (deliveryPerson) {
          // For delivery persons, use their status from delivery_persons table
          if (deliveryPerson.status === "available") {
            status = "online";
          } else if (deliveryPerson.status === "busy") {
            status = "busy";
          } else {
            // Explicitly handle 'offline' and any unexpected values
            status = "offline";
          }
        } else if (profile?.updated_at) {
          // For other users, consider them online if updated recently (within 5 minutes)
          const lastUpdate = new Date(profile.updated_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          status = diffMinutes < 5 ? "online" : "offline";
        }

        return {
          id: userRole.user_id,
          fullName: profile?.full_name || "Utilisateur inconnu",
          role: userRole.role,
          avatarUrl: profile?.avatar_url || null,
          status,
          lastActivity: profile?.updated_at || new Date().toISOString(),
          zone: deliveryPerson?.zone || null,
        };
      }) || [];

      return workersData;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Filter workers based on search query
  const filteredWorkers = workers?.filter(worker =>
    worker.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ROLE_LABELS[worker.role].toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group workers by role
  const workersByRole = {
    administrateur: filteredWorkers.filter(w => w.role === "administrateur"),
    superviseur: filteredWorkers.filter(w => w.role === "superviseur"),
    appelant: filteredWorkers.filter(w => w.role === "appelant"),
    livreur: filteredWorkers.filter(w => w.role === "livreur"),
  };

  // Calculate status counts for each role
  const getStatusCounts = (workers: WorkerInfo[]) => {
    const online = workers.filter(w => w.status === "online").length;
    const offline = workers.length - online;
    return { online, offline };
  };

  const statusCounts = {
    administrateur: getStatusCounts(workersByRole.administrateur || []),
    superviseur: getStatusCounts(workersByRole.superviseur || []),
    appelant: getStatusCounts(workersByRole.appelant || []),
    livreur: getStatusCounts(workersByRole.livreur || []),
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format last activity
  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return "À l'instant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  const renderWorkerCard = (worker: WorkerInfo) => {
    const statusConfig = STATUS_CONFIG[worker.status];

    return (
      <div
        key={worker.id}
        className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-all"
      >
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={worker.avatarUrl || undefined} alt={worker.fullName} />
            <AvatarFallback className="text-xs">{getInitials(worker.fullName)}</AvatarFallback>
          </Avatar>
          <Circle
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
              statusConfig.bgColor
            )}
            fill="currentColor"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{worker.fullName}</p>
            <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[worker.role])}>
              {ROLE_LABELS[worker.role]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={statusConfig.color}>{statusConfig.label}</span>
            <span>•</span>
            <span>{formatLastActivity(worker.lastActivity)}</span>
            {worker.zone && (
              <>
                <span>•</span>
                <span className="truncate">Zone: {worker.zone}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRoleAccordion = (
    roleKey: keyof typeof workersByRole,
    workers: WorkerInfo[]
  ) => {
    if (workers.length === 0) return null;

    const config = ROLE_CONFIG[roleKey];
    const RoleIcon = config.icon;
    const counts = statusCounts[roleKey];

    return (
      <AccordionItem value={roleKey} className="border-0">
        <AccordionTrigger className="py-4 hover:no-underline hover:bg-accent/50 rounded-lg px-2 transition-colors">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2">
              <RoleIcon className={cn("w-4 h-4", config.color)} />
              <span className="font-medium text-sm">{config.label}</span>
              <Badge variant="secondary" className="text-xs">
                {workers.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {counts.online > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                  {counts.online}
                </Badge>
              )}
              {counts.offline > 0 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                  {counts.offline}
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2 pl-2 pt-2">
            {workers.map(renderWorkerCard)}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Utilisateurs Connectés
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {filteredWorkers.length} utilisateur{filteredWorkers.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou rôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucun utilisateur trouvé</p>
            {searchQuery && (
              <p className="text-sm mt-1">pour "{searchQuery}"</p>
            )}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["appelant"]} className="w-full space-y-1">
            {renderRoleAccordion("administrateur", workersByRole.administrateur)}
            {renderRoleAccordion("superviseur", workersByRole.superviseur)}
            {renderRoleAccordion("appelant", workersByRole.appelant)}
            {renderRoleAccordion("livreur", workersByRole.livreur)}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
