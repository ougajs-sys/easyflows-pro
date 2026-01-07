import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  AlertCircle,
  Package,
  Clock,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatMessage {
  id: string;
  sender: "deliverer" | "supervisor" | "system";
  content: string;
  timestamp: Date;
  type?: "text" | "order_reported" | "order_cancelled";
  orderId?: string;
  orderNumber?: string;
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

export function DeliveryChat({ reportedOrders, cancelledOrders }: DeliveryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with system messages for reported/cancelled orders
  useEffect(() => {
    const systemMessages: ChatMessage[] = [];

    reportedOrders.forEach((order) => {
      systemMessages.push({
        id: `reported-${order.id}`,
        sender: "system",
        content: `Commande ${order.order_number || order.id.slice(0, 8)} reportée - Client: ${order.client_name}`,
        timestamp: new Date(),
        type: "order_reported",
        orderId: order.id,
        orderNumber: order.order_number || order.id.slice(0, 8),
      });
    });

    cancelledOrders.forEach((order) => {
      systemMessages.push({
        id: `cancelled-${order.id}`,
        sender: "system",
        content: `Commande ${order.order_number || order.id.slice(0, 8)} annulée - Client: ${order.client_name}`,
        timestamp: new Date(),
        type: "order_cancelled",
        orderId: order.id,
        orderNumber: order.order_number || order.id.slice(0, 8),
      });
    });

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      sender: "supervisor",
      content: "Bienvenue ! Je suis disponible pour vous aider avec vos livraisons.",
      timestamp: new Date(),
      type: "text",
    };

    setMessages([welcomeMessage, ...systemMessages]);
  }, [reportedOrders, cancelledOrders]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "deliverer",
      content: newMessage,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Simulate supervisor response after a delay
    setTimeout(() => {
      const response: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        sender: "supervisor",
        content: "Message reçu. Un superviseur vous répondra dans les plus brefs délais.",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, response]);
    }, 1000);
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.sender === "deliverer";
    const isSystem = message.sender === "system";

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <Card className={cn(
            "max-w-[90%] p-3",
            message.type === "order_reported" && "bg-warning/10 border-warning/30",
            message.type === "order_cancelled" && "bg-destructive/10 border-destructive/30"
          )}>
            <div className="flex items-center gap-2">
              {message.type === "order_reported" ? (
                <Clock className="w-4 h-4 text-warning" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{message.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  À relancer par le superviseur
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {message.orderNumber}
              </Badge>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={cn(
          "flex mb-3",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "max-w-[80%] rounded-lg px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted text-foreground rounded-bl-none"
          )}
        >
          <p className="text-sm">{message.content}</p>
          <p className={cn(
            "text-xs mt-1",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {format(message.timestamp, "HH:mm", { locale: fr })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Chat superviseur</h2>
        <p className="text-muted-foreground">
          Communiquez directement avec le superviseur
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
            Discussion avec le superviseur
            <span className="ml-auto flex items-center gap-1 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              En ligne
            </span>
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.map(renderMessage)}
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
