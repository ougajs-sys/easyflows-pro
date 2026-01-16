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
  MessageSquare, 
  Send, 
  AlertCircle,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

interface ReportedOrder {
  id: string;
  order_number: string | null;
  client_name: string;
  status: string;
}

interface DeliveryChatProps {
  reportedOrders: ReportedOrder[];
  cancelledOrders: ReportedOrder[];
}

const CHANNEL_NAME = "internal-livreurs";

export function DeliveryChat({ reportedOrders, cancelledOrders }: DeliveryChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages from Supabase
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["delivery-chat-messages", CHANNEL_NAME],
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
      queryClient.invalidateQueries({ queryKey: ["delivery-chat-messages", CHANNEL_NAME] });
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
      .channel(`delivery-chat-${CHANNEL_NAME}`)
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
          queryClient.invalidateQueries({ queryKey: ["delivery-chat-messages", CHANNEL_NAME] });
          
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Chat Livreurs</h2>
        <p className="text-muted-foreground">
          Communiquez avec les superviseurs et autres livreurs
        </p>
      </div>

      {/* Order Alerts */}
      {(reportedOrders.length > 0 || cancelledOrders.length > 0) && (
        <Card className="glass border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-warning" />
              Commandes à relancer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {reportedOrders.map((order) => (
                <Badge key={order.id} variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {order.order_number || order.id.slice(0, 8)}
                </Badge>
              ))}
              {cancelledOrders.map((order) => (
                <Badge key={order.id} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <XCircle className="w-3 h-3 mr-1" />
                  {order.order_number || order.id.slice(0, 8)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Window */}
      <Card className="glass h-[500px] flex flex-col">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-primary" />
            Canal Livreurs
            <span className="ml-auto flex items-center gap-1 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              En ligne
            </span>
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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

        <div className="p-4 border-t border-border">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
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
    </div>
  );
}