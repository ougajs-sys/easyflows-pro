import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  channel: string;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const CHANNEL_NAME = "internal-appelants";

export function CallerChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
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

  // Fetch messages from Supabase
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["caller-chat-messages", CHANNEL_NAME],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", CHANNEL_NAME)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      if (senderIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return messagesData.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || { id: msg.sender_id, full_name: "Utilisateur", avatar_url: null }
      })) as ChatMessage[];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: null,
        channel: CHANNEL_NAME,
        content,
        message_type: "text",
        is_read: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caller-chat-messages", CHANNEL_NAME] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const realtimeChannel = supabase
      .channel(`caller-chat-${CHANNEL_NAME}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${CHANNEL_NAME}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          queryClient.invalidateQueries({ queryKey: ["caller-chat-messages", CHANNEL_NAME] });
          
          if (newMsg.sender_id !== user.id) {
            toast.info("Nouveau message", {
              description: newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? "..." : ""),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [user?.id, queryClient]);

  // Scroll to bottom when new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(newMessage.trim());
    setNewMessage("");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat Appelants</h1>
        <p className="text-muted-foreground">Communiquez avec les superviseurs et autres appelants</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Canal Appelants
            <span className="ml-auto flex items-center gap-1 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              En ligne
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showAvatar = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        isOwn ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {showAvatar ? (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(msg.sender?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 flex-shrink-0" />
                      )}
                      <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                        {showAvatar && (
                          <p className={cn(
                            "text-xs font-medium mb-1",
                            isOwn ? "text-primary" : "text-muted-foreground"
                          )}>
                            {isOwn ? "Vous" : msg.sender?.full_name || "Utilisateur"}
                          </p>
                        )}
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2 inline-block",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary text-secondary-foreground rounded-bl-sm"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun message</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Démarrez la conversation !
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Écrire un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
              {sendMessageMutation.isPending ? (
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
            <div className="flex flex-wrap gap-2 mt-3">
              {alertOrders.map((order) => (
                <Badge 
                  key={order.id} 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    order.status === "cancelled" 
                      ? "border-destructive/30 text-destructive bg-destructive/10" 
                      : "border-warning/30 text-warning bg-warning/10"
                  )}
                >
                  {order.status === "cancelled" ? (
                    <XCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  <Package className="w-3 h-3 mr-1" />
                  {order.order_number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}