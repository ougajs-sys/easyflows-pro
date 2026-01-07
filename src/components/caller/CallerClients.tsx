import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  User, 
  Phone, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MapPin,
  TrendingUp,
  Loader2,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClientWithOrders {
  id: string;
  full_name: string;
  phone: string;
  phone_secondary: string | null;
  address: string | null;
  zone: string | null;
  segment: string | null;
  total_orders: number;
  total_spent: number;
  orders: {
    id: string;
    order_number: string | null;
    status: string;
    total_amount: number;
    created_at: string;
    product: { name: string } | null;
  }[];
}

const statusConfig: Record<string, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "En attente", class: "bg-warning/15 text-warning", icon: Clock },
  confirmed: { label: "Confirmée", class: "bg-success/15 text-success", icon: CheckCircle2 },
  partial: { label: "Partielle", class: "bg-orange-500/15 text-orange-400", icon: Clock },
  reported: { label: "Reportée", class: "bg-muted text-muted-foreground", icon: Clock },
  cancelled: { label: "Annulée", class: "bg-destructive/15 text-destructive", icon: XCircle },
  in_transit: { label: "En transit", class: "bg-blue-500/15 text-blue-400", icon: Package },
  delivered: { label: "Livrée", class: "bg-primary/15 text-primary", icon: CheckCircle2 },
};

export function CallerClients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientWithOrders | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["caller-clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get all orders by this caller to find client IDs
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          client_id,
          product:products(name)
        `)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Get unique client IDs
      const clientIds = [...new Set(orders?.map((o) => o.client_id).filter(Boolean))];

      if (clientIds.length === 0) return [];

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, full_name, phone, phone_secondary, address, zone, segment, total_orders, total_spent")
        .in("id", clientIds);

      if (clientsError) throw clientsError;

      // Map orders to clients
      const clientsWithOrders: ClientWithOrders[] = (clientsData || []).map((client) => ({
        ...client,
        orders: orders?.filter((o) => o.client_id === client.id) || [],
      }));

      return clientsWithOrders;
    },
    enabled: !!user?.id,
  });

  const filteredClients = clients?.filter((client) => {
    const search = searchTerm.toLowerCase();
    return (
      client.full_name.toLowerCase().includes(search) ||
      client.phone.includes(search) ||
      client.zone?.toLowerCase().includes(search)
    );
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSegmentBadge = (segment: string | null) => {
    switch (segment) {
      case "vip":
        return <Badge className="bg-primary/15 text-primary">VIP</Badge>;
      case "regular":
        return <Badge className="bg-success/15 text-success">Régulier</Badge>;
      default:
        return <Badge variant="outline">Nouveau</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Suivi Clients</h1>
        <p className="text-muted-foreground">Historique de vos interactions avec chaque client</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, téléphone ou zone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{clients?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Clients suivis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">
              {clients?.filter((c) => c.segment === "vip" || c.segment === "regular").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Clients fidèles</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <ScrollArea className="h-[calc(100vh-22rem)]">
        <div className="space-y-3 pr-4">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun client trouvé</p>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => {
              const confirmedCount = client.orders.filter(
                (o) => o.status === "confirmed" || o.status === "delivered" || o.status === "in_transit"
              ).length;
              const cancelledCount = client.orders.filter((o) => o.status === "cancelled").length;

              return (
                <Card 
                  key={client.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{client.full_name}</p>
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      </div>
                      {getSegmentBadge(client.segment)}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span>{client.orders.length} commandes</span>
                      </div>
                      <div className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{confirmedCount}</span>
                      </div>
                      {cancelledCount > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <XCircle className="w-4 h-4" />
                          <span>{cancelledCount}</span>
                        </div>
                      )}
                    </div>

                    {client.zone && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{client.zone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {selectedClient?.full_name}
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <a 
                  href={`tel:${selectedClient.phone}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span className="font-medium">{selectedClient.phone}</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>

                {selectedClient.phone_secondary && (
                  <a 
                    href={`tel:${selectedClient.phone_secondary}`}
                    className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{selectedClient.phone_secondary}</span>
                    <span className="text-xs text-muted-foreground">(secondaire)</span>
                  </a>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedClient.total_orders}</p>
                    <p className="text-xs text-muted-foreground">Commandes totales</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(selectedClient.total_spent)}
                    </p>
                    <p className="text-xs text-muted-foreground">FCFA dépensés</p>
                  </CardContent>
                </Card>
              </div>

              {/* Address */}
              {selectedClient.address && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {selectedClient.address}
                  </p>
                  {selectedClient.zone && (
                    <p className="text-xs text-muted-foreground mt-1">Zone: {selectedClient.zone}</p>
                  )}
                </div>
              )}

              {/* Order History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Historique des commandes
                </h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-4">
                    {selectedClient.orders.map((order) => {
                      const StatusIcon = statusConfig[order.status]?.icon || Package;
                      return (
                        <div 
                          key={order.id}
                          className="p-3 rounded-lg border bg-card/50 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{order.order_number}</span>
                            <Badge className={cn("text-xs", statusConfig[order.status]?.class)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[order.status]?.label}
                            </Badge>
                          </div>
                          <p className="text-sm">{order.product?.name}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(Number(order.total_amount))} FCFA</span>
                            <span>{format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
