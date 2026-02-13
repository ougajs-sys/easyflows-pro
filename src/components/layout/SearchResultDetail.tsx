import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/formatCurrency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Phone, MapPin, User, Truck, Package, Calendar, FileText, ShoppingCart } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetail {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number | null;
  quantity: number;
  unit_price: number;
  delivery_address: string | null;
  delivery_notes: string | null;
  created_at: string;
  delivered_at: string | null;
  client: {
    full_name: string;
    phone: string;
    phone_secondary: string | null;
    city: string | null;
    zone: string | null;
    address: string | null;
    segment: string;
  } | null;
  product: { name: string; price: number } | null;
  caller_name: string | null;
  delivery_person_name: string | null;
  delivery_person_status: string | null;
}

interface ClientDetail {
  id: string;
  full_name: string;
  phone: string;
  phone_secondary: string | null;
  city: string | null;
  zone: string | null;
  address: string | null;
  segment: string;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  recent_orders: {
    id: string;
    order_number: string | null;
    status: string;
    total_amount: number;
    created_at: string;
    caller_name: string | null;
    delivery_person_name: string | null;
    product_name: string | null;
    quantity: number;
    unit_price: number;
  }[];
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

export function SearchResultDetail({
  open,
  onOpenChange,
  type,
  id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "order" | "client";
  id: string;
}) {
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    try {
      const { data: order } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, total_amount, amount_paid, amount_due,
          quantity, unit_price, delivery_address, delivery_notes, created_at, delivered_at,
          created_by, delivery_person_id,
          client:clients(full_name, phone, phone_secondary, city, zone, address, segment),
          product:products(name, price),
          delivery_person:delivery_persons(id, user_id, status)
        `)
        .eq("id", orderId)
        .single();

      if (!order) return;

      // Fetch caller and delivery person names
      const userIds: string[] = [];
      if (order.created_by) userIds.push(order.created_by);
      if ((order.delivery_person as any)?.user_id) userIds.push((order.delivery_person as any).user_id);

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

      setOrderDetail({
        ...order,
        client: order.client as any,
        product: order.product as any,
        caller_name: order.created_by ? profilesMap[order.created_by] || null : null,
        delivery_person_name: (order.delivery_person as any)?.user_id
          ? profilesMap[(order.delivery_person as any).user_id] || null
          : null,
        delivery_person_status: (order.delivery_person as any)?.status || null,
      });
    } catch (err) {
      console.error("Error loading order detail:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClient = useCallback(async (clientId: string) => {
    setLoading(true);
    try {
      const [clientRes, ordersRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name, phone, phone_secondary, city, zone, address, segment, notes, total_orders, total_spent")
          .eq("id", clientId)
          .single(),
        supabase
          .from("orders")
          .select(`
            id, order_number, status, total_amount, created_at, created_by,
            quantity, unit_price,
            product:products(name, price),
            delivery_person:delivery_persons(user_id)
          `)
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (!clientRes.data) return;

      const orders = (ordersRes.data || []) as any[];
      const userIds = orders
        .flatMap((o: any) => [o.created_by, o.delivery_person?.user_id].filter(Boolean));

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

      setClientDetail({
        ...clientRes.data,
        recent_orders: orders.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total_amount: o.total_amount,
          created_at: o.created_at,
          caller_name: o.created_by ? profilesMap[o.created_by] || null : null,
          delivery_person_name: o.delivery_person?.user_id
            ? profilesMap[o.delivery_person.user_id] || null
            : null,
          product_name: o.product?.name || null,
          quantity: o.quantity || 1,
          unit_price: o.unit_price || 0,
        })),
      });
    } catch (err) {
      console.error("Error loading client detail:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !id) return;
    setOrderDetail(null);
    setClientDetail(null);
    if (type === "order") loadOrder(id);
    else loadClient(id);
  }, [open, id, type, loadOrder, loadClient]);

  const st = (status: string) => statusConfig[status] || { label: status, variant: "secondary" as const };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Chargement...</div>
        )}

        {/* ORDER DETAIL */}
        {!loading && type === "order" && orderDetail && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {orderDetail.order_number || "Commande"}
                <Badge variant={st(orderDetail.status).variant}>{st(orderDetail.status).label}</Badge>
              </DialogTitle>
              <DialogDescription>Fiche détaillée de la commande</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Client */}
              {orderDetail.client && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</h4>
                  <InfoRow icon={User} label="Nom" value={orderDetail.client.full_name} />
                  <InfoRow icon={Phone} label="Tél" value={orderDetail.client.phone} />
                  {orderDetail.client.phone_secondary && (
                    <InfoRow icon={Phone} label="Tél 2" value={orderDetail.client.phone_secondary} />
                  )}
                  <InfoRow icon={MapPin} label="Ville / Zone" value={[orderDetail.client.city, orderDetail.client.zone].filter(Boolean).join(" / ") || null} />
                  {orderDetail.client.address && <InfoRow icon={MapPin} label="Adresse" value={orderDetail.client.address} />}
                </div>
              )}

              <Separator />

              {/* Commande */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commande</h4>
                {orderDetail.product && <InfoRow icon={ShoppingCart} label="Produit" value={orderDetail.product.name} />}
                <InfoRow icon={Package} label="Qté × Prix" value={`${orderDetail.quantity} × ${formatCurrency(orderDetail.unit_price)}`} />
                <InfoRow icon={Package} label="Montant total" value={formatCurrency(orderDetail.total_amount)} />
                <InfoRow icon={Package} label="Payé" value={formatCurrency(orderDetail.amount_paid)} />
                <InfoRow icon={Package} label="Restant dû" value={formatCurrency(orderDetail.amount_due ?? (orderDetail.total_amount - orderDetail.amount_paid))} />
              </div>

              <Separator />

              {/* Appelant & Livreur */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Équipe</h4>
                <InfoRow icon={User} label="Appelant" value={orderDetail.caller_name || "Non assigné"} />
                <InfoRow icon={Truck} label="Livreur" value={orderDetail.delivery_person_name || "Non assigné"} />
                {orderDetail.delivery_person_status && (
                  <InfoRow icon={Truck} label="Statut livreur" value={orderDetail.delivery_person_status} />
                )}
              </div>

              {(orderDetail.delivery_address || orderDetail.delivery_notes) && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Livraison</h4>
                    <InfoRow icon={MapPin} label="Adresse" value={orderDetail.delivery_address} />
                    <InfoRow icon={FileText} label="Notes" value={orderDetail.delivery_notes} />
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dates</h4>
                <InfoRow icon={Calendar} label="Créée le" value={format(new Date(orderDetail.created_at), "dd/MM/yyyy HH:mm", { locale: fr })} />
                {orderDetail.delivered_at && (
                  <InfoRow icon={Calendar} label="Livrée le" value={format(new Date(orderDetail.delivered_at), "dd/MM/yyyy HH:mm", { locale: fr })} />
                )}
              </div>
            </div>
          </>
        )}

        {/* CLIENT DETAIL */}
        {!loading && type === "client" && clientDetail && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {clientDetail.full_name}
                <Badge variant="outline">{segmentLabels[clientDetail.segment] || clientDetail.segment}</Badge>
              </DialogTitle>
              <DialogDescription>Fiche détaillée du client</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</h4>
                <InfoRow icon={Phone} label="Tél" value={clientDetail.phone} />
                {clientDetail.phone_secondary && <InfoRow icon={Phone} label="Tél 2" value={clientDetail.phone_secondary} />}
                <InfoRow icon={MapPin} label="Ville / Zone" value={[clientDetail.city, clientDetail.zone].filter(Boolean).join(" / ") || null} />
                {clientDetail.address && <InfoRow icon={MapPin} label="Adresse" value={clientDetail.address} />}
                {clientDetail.notes && <InfoRow icon={FileText} label="Notes" value={clientDetail.notes} />}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statistiques</h4>
                <div className="flex gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 flex-1 text-center">
                    <div className="text-2xl font-bold">{clientDetail.total_orders}</div>
                    <div className="text-xs text-muted-foreground">Commandes</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 flex-1 text-center">
                    <div className="text-2xl font-bold">{formatCurrency(clientDetail.total_spent)}</div>
                    <div className="text-xs text-muted-foreground">Total dépensé</div>
                  </div>
                </div>
              </div>

              {clientDetail.recent_orders.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dernières commandes</h4>
                    <div className="space-y-2">
                      {clientDetail.recent_orders.map((o) => (
                        <div key={o.id} className="bg-muted/30 rounded-lg p-2.5 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{o.order_number || "—"}</span>
                            <Badge variant={st(o.status).variant} className="text-xs">{st(o.status).label}</Badge>
                          </div>
                          {o.product_name && (
                            <div className="text-xs font-medium text-foreground">
                              <ShoppingCart className="w-3 h-3 inline mr-1" />
                              {o.product_name}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{o.quantity} × {formatCurrency(o.unit_price)} = {formatCurrency(o.total_amount)}</span>
                            <span>{format(new Date(o.created_at), "dd/MM/yyyy", { locale: fr })}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {o.caller_name && <span className="font-medium">Appelant: {o.caller_name}</span>}
                            {o.caller_name && o.delivery_person_name && <span> • </span>}
                            {o.delivery_person_name && <span className="font-medium">Livreur: {o.delivery_person_name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
