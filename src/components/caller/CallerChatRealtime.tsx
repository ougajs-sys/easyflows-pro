import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Clock,
  XCircle,
  Loader2,
  Bell
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  channel: string;
  content: string;
  message_type: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function CallerChatRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch messages from database
  const { data: messages, isLoading } = useQuery({
    queryKey: ["caller-chat-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},receiver_id.is.null`)
        .eq("channel", "caller-supervisor")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user?.id,
  });

  // Fetch alert orders (reported/cancelled)
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
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("caller-chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.caller-supervisor`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if relevant to this user
          if (
            newMsg.sender_id === user.id ||
            newMsg.receiver_id === user.id ||
            newMsg.receiver_id === null
          ) {
            queryClient.invalidateQueries({ queryKey: ["caller-chat-messages"] });
            
            // Show notification for incoming messages
            if (newMsg.sender_id !== user.id) {
              toast.info("Nouveau message du superviseur", {
                description: newMsg.content.substring(0, 50) + "...",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        channel: "caller-supervisor",
        content,
        message_type: "text",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'envoi du message");
      console.error(error);
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.sender_id === user?.id) {
      return "ml-auto bg-primary text-primary-foreground";
    }
    if (msg.message_type === "order-alert") {
      return "mx-auto bg-warning/10 border border-warning/30";
    }
    return "mr-auto bg-secondary";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Chat Superviseur
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 rounded-full bg-success mr-1 animate-pulse" />
            Temps réel
          </Badge>
        </h1>
        <p className="text-muted-foreground">Communication en temps réel avec votre superviseur</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Superviseur en ligne
            </span>
            {alertOrders && alertOrders.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {alertOrders.length} alerte{alertOrders.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] rounded-lg p-3",
                      getMessageStyle(msg)
                    )}
                  >
                    {msg.message_type === "order-alert" ? (
                      <div className="flex items-start gap-2">
                        <Package className="w-4 h-4 mt-0.5" />
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p className="text-xs opacity-60 mt-1">
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun message</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Démarrez une conversation avec le superviseur
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Alert Summary */}
        {alertOrders && alertOrders.length > 0 && (
          <div className="p-3 border-t border-b bg-warning/5">
            <p className="text-sm font-medium flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-warning" />
              Commandes à relancer
            </p>
            <div className="flex flex-wrap gap-2">
              {alertOrders.slice(0, 5).map((order) => (
                <Badge 
                  key={order.id} 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    order.status === "cancelled" 
                      ? "border-destructive/30 text-destructive" 
                      : "border-warning/30 text-warning"
                  )}
                >
                  {order.status === "cancelled" ? (
                    <XCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  {order.order_number}
                </Badge>
              ))}
              {alertOrders.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{alertOrders.length - 5} autres
                </Badge>
              )}
            </div>
          </div>
        )}

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
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
