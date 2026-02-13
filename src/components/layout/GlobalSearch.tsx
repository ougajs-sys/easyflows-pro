import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Package, Users, User, Loader2, X, Phone, MapPin, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/formatCurrency";
import { Badge } from "@/components/ui/badge";
import { SearchResultDetail } from "./SearchResultDetail";

interface EnrichedOrder {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  amount_paid: number;
  created_at: string;
  created_by: string | null;
  client: { full_name: string; phone: string; city: string | null } | null;
  product: { name: string } | null;
  delivery_person: { user_id: string; status: string } | null;
  caller_name?: string | null;
  delivery_person_name?: string | null;
}

interface EnrichedClient {
  id: string;
  full_name: string;
  phone: string;
  phone_secondary: string | null;
  city: string | null;
  zone: string | null;
  segment: string;
  total_orders: number;
  total_spent: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "default" },
  shipped: { label: "Expédiée", variant: "outline" },
  delivered: { label: "Livrée", variant: "default" },
  cancelled: { label: "Annulée", variant: "destructive" },
  reported: { label: "Signalée", variant: "destructive" },
};

const segmentLabels: Record<string, string> = {
  new: "Nouveau",
  regular: "Régulier",
  vip: "VIP",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [clients, setClients] = useState<EnrichedClient[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState<"order" | "client">("order");
  const [detailId, setDetailId] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setOrders([]);
      setClients([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const pattern = `%${q}%`;

    try {
      const [ordersRes, clientsRes] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id, order_number, status, total_amount, amount_paid, created_at, created_by,
            client:clients(full_name, phone, city),
            product:products(name),
            delivery_person:delivery_persons(user_id, status)
          `)
          .or(`order_number.ilike.${pattern},client_phone.ilike.${pattern}`)
          .limit(6),
        supabase
          .from("clients")
          .select("id, full_name, phone, phone_secondary, city, zone, segment, total_orders, total_spent")
          .or(`full_name.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern}`)
          .limit(6),
      ]);

      const rawOrders = (ordersRes.data || []) as any[];
      const rawClients = (clientsRes.data || []) as EnrichedClient[];

      // Resolve caller + delivery person names
      const userIds = rawOrders.flatMap((o: any) =>
        [o.created_by, o.delivery_person?.user_id].filter(Boolean)
      );

      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...new Set(userIds)]);
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || "Inconnu";
          return acc;
        }, {} as Record<string, string>);
      }

      const enrichedOrders: EnrichedOrder[] = rawOrders.map((o: any) => ({
        ...o,
        caller_name: o.created_by ? profilesMap[o.created_by] || null : null,
        delivery_person_name: o.delivery_person?.user_id
          ? profilesMap[o.delivery_person.user_id] || null
          : null,
      }));

      setOrders(enrichedOrders);
      setClients(rawClients);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const openDetail = (type: "order" | "client", id: string) => {
    setDetailType(type);
    setDetailId(id);
    setDetailOpen(true);
    setIsOpen(false);
    setQuery("");
  };

  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    setOrders([]);
    setClients([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasResults = orders.length > 0 || clients.length > 0;
  const st = (status: string) => statusConfig[status] || { label: status, variant: "secondary" as const };

  return (
    <>
      <div ref={containerRef} className={cn("relative", isMobile ? "flex-1 max-w-[200px]" : "w-96")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={isMobile ? "Rechercher..." : "Rechercher commandes, clients..."}
          className="w-full h-10 pl-10 pr-9 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-[500px] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Recherche...</span>
              </div>
            )}

            {!isLoading && !hasResults && query.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun résultat pour "{query}"
              </div>
            )}

            {!isLoading && hasResults && (
              <>
                {orders.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Commandes
                    </div>
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => openDetail("order", o.id)}
                        className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{o.order_number || "—"}</span>
                            <Badge variant={st(o.status).variant} className="text-[10px] px-1.5 py-0">
                              {st(o.status).label}
                            </Badge>
                          </div>
                          <span className="font-semibold text-xs">{formatCurrency(o.total_amount)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {o.client && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {o.client.full_name}
                            </span>
                          )}
                          {o.client?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {o.client.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {o.caller_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Appelant: {o.caller_name}
                            </span>
                          )}
                          {o.delivery_person_name && (
                            <span className="flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {o.delivery_person_name}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {clients.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Clients
                    </div>
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openDetail("client", c.id)}
                        className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{c.full_name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {segmentLabels[c.segment] || c.segment}
                            </Badge>
                          </div>
                          <span className="text-xs font-medium">{c.total_orders} cmd</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {c.phone}
                          </span>
                          {c.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {c.city}{c.zone ? ` / ${c.zone}` : ""}
                            </span>
                          )}
                          {c.total_spent > 0 && (
                            <span>{formatCurrency(c.total_spent)} dépensé</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <SearchResultDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        type={detailType}
        id={detailId}
      />
    </>
  );
}
