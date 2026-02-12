import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Users, User, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/formatCurrency";

interface OrderResult {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  client_phone: string | null;
  client: { full_name: string; phone: string } | null;
}

interface ClientResult {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  zone: string | null;
}

interface ProfileResult {
  id: string;
  full_name: string | null;
  phone: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  reported: "Signalée",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setOrders([]);
      setClients([]);
      setProfiles([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const pattern = `%${q}%`;

    try {
      const [ordersRes, clientsRes, profilesRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, status, total_amount, client_phone, client:clients(full_name, phone)")
          .or(`order_number.ilike.${pattern},client_phone.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("clients")
          .select("id, full_name, phone, city, zone")
          .or(`full_name.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("profiles")
          .select("id, full_name, phone")
          .ilike("full_name", pattern)
          .limit(5),
      ]);

      setOrders((ordersRes.data as unknown as OrderResult[]) || []);
      setClients((clientsRes.data as ClientResult[]) || []);
      setProfiles((profilesRes.data as ProfileResult[]) || []);
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

  const handleSelect = (path: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(path);
  };

  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    setOrders([]);
    setClients([]);
    setProfiles([]);
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasResults = orders.length > 0 || clients.length > 0 || profiles.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", isMobile ? "flex-1 max-w-[200px]" : "w-96")}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={isMobile ? "Rechercher..." : "Rechercher commandes, clients, livreurs..."}
        className="w-full h-10 pl-10 pr-9 rounded-lg bg-secondary border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
      />
      {query && (
        <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-[400px] overflow-y-auto">
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
                      onClick={() => handleSelect("/orders")}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">{o.order_number || "—"}</span>
                        {o.client && (
                          <span className="ml-2 text-muted-foreground">{(o.client as any).full_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{statusLabels[o.status] || o.status}</span>
                        <span className="text-xs font-medium">{formatCurrency(o.total_amount)}</span>
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
                      onClick={() => handleSelect("/clients")}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-2 text-muted-foreground">{c.phone}</span>
                      </div>
                      {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
                    </button>
                  ))}
                </div>
              )}

              {profiles.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Personnel
                  </div>
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect("/roles")}
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
                    >
                      <span className="font-medium">{p.full_name || "Sans nom"}</span>
                      {p.phone && <span className="ml-2 text-muted-foreground">{p.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
