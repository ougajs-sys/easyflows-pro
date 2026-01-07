import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  MessageSquare, 
  Package, 
  AlertCircle,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "caller" | "supervisor" | "system";
  timestamp: Date;
  type?: "text" | "order-alert";
  orderNumber?: string;
  orderStatus?: string;
}

export function CallerChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch reported and cancelled orders for automatic alerts
  const { data: alertOrders } = useQuery({
    queryKey: ["caller-alert-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at, client:clients(full_name)")
        .eq("created_by", user.id)
        .in("status", ["reported", "cancelled"])
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Generate system messages for alerts
  useEffect(() => {
    if (!alertOrders) return;

    const systemMessages: Message[] = alertOrders.map((order) => ({
      id: `order-${order.id}`,
      content: order.status === "cancelled" 
        ? `Commande ${order.order_number} annulée - Client: ${order.client?.full_name || "Inconnu"}. Relance recommandée.`
        : `Commande ${order.order_number} reportée - Client: ${order.client?.full_name || "Inconnu"}. À rappeler.`,
      sender: "system",
      timestamp: new Date(order.created_at),
      type: "order-alert",
      orderNumber: order.order_number || undefined,
      orderStatus: order.status,
    }));

    // Merge with existing messages, avoiding duplicates
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newMessages = systemMessages.filter((m) => !existingIds.has(m.id));
      return [...newMessages, ...prev.filter((m) => m.sender !== "system")].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    });
  }, [alertOrders]);

  // Scroll to bottom when new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const message: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      sender: "caller",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Simulate supervisor response after delay
    setTimeout(() => {
      const supervisorResponse: Message = {
        id: `msg-${Date.now()}-supervisor`,
        content: "Message bien reçu. Je vérifie et vous reviens rapidement.",
        sender: "supervisor",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, supervisorResponse]);
      setIsSending(false);
    }, 1500);
  };

  const getMessageStyle = (sender: string) => {
    switch (sender) {
      case "caller":
        return "ml-auto bg-primary text-primary-foreground";
      case "supervisor":
        return "mr-auto bg-secondary";
      case "system":
        return "mx-auto bg-warning/10 border border-warning/30 text-warning-foreground";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat Superviseur</h1>
        <p className="text-muted-foreground">Communiquez avec votre superviseur</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Superviseur en ligne
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun message</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les alertes des commandes reportées/annulées apparaîtront ici
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] rounded-lg p-3",
                      getMessageStyle(msg.sender)
                    )}
                  >
                    {msg.type === "order-alert" ? (
                      <div className="flex items-start gap-2">
                        {msg.orderStatus === "cancelled" ? (
                          <XCircle className="w-4 h-4 mt-0.5 text-destructive" />
                        ) : (
                          <Clock className="w-4 h-4 mt-0.5 text-warning" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              {msg.orderNumber}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                msg.orderStatus === "cancelled" 
                                  ? "border-destructive/30 text-destructive" 
                                  : "border-warning/30 text-warning"
                              )}
                            >
                              {msg.orderStatus === "cancelled" ? "Annulée" : "Reportée"}
                            </Badge>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className="text-xs opacity-60 mt-1">
                      {format(msg.timestamp, "HH:mm", { locale: fr })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Écrire un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>

      {/* Alert Summary */}
      {alertOrders && alertOrders.length > 0 && (
        <Card className="mt-4 border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">
                  {alertOrders.length} commande{alertOrders.length > 1 ? "s" : ""} à relancer
                </p>
                <p className="text-sm text-muted-foreground">
                  Commandes reportées ou annulées aujourd'hui
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
