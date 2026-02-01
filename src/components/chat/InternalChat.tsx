import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePresence, UserPresence } from "@/hooks/usePresence";
import { useDirectMessages, DMContact } from "@/hooks/useDirectMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  MessageSquare, 
  Users,
  Loader2,
  Phone,
  Truck,
  Shield,
  Crown,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  administrateur: { label: "Admin", icon: <Crown className="w-3 h-3" />, color: "text-purple-500" },
  superviseur: { label: "Superviseur", icon: <Shield className="w-3 h-3" />, color: "text-blue-500" },
  appelant: { label: "Appelant", icon: <Phone className="w-3 h-3" />, color: "text-green-500" },
  livreur: { label: "Livreur", icon: <Truck className="w-3 h-3" />, color: "text-orange-500" },
};

interface InternalChatProps {
  fullHeight?: boolean;
}

export function InternalChat({ fullHeight = true }: InternalChatProps) {
  const { user, role } = useAuth();
  const [selectedContact, setSelectedContact] = useState<UserPresence | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get online users based on role
  const { onlineUsers, isLoading: presenceLoading } = usePresence();

  // Get DM messages and functionality
  const {
    messages,
    messagesLoading,
    sendMessage,
    sendingMessage,
    markAsRead,
    unreadCounts,
  } = useDirectMessages(selectedContact?.user_id);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Mark as read when viewing contact
  useEffect(() => {
    if (selectedContact?.user_id) {
      markAsRead(selectedContact.user_id);
    }
  }, [selectedContact?.user_id, markAsRead]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage || !selectedContact) return;
    sendMessage(selectedContact.user_id, newMessage.trim());
    setNewMessage("");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Group online users by role
  const usersByRole = onlineUsers.reduce((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {} as Record<string, UserPresence[]>);

  return (
    <div className={cn("flex flex-col", fullHeight ? "h-[calc(100vh-8rem)]" : "h-[600px]")}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Messagerie directe
        </h1>
        <p className="text-muted-foreground">
          {role === "superviseur" 
            ? "Communiquez avec les appelants, livreurs et administrateurs"
            : "Communiquez avec les superviseurs"}
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Contacts Sidebar */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 border-b flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contacts
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {presenceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : Object.entries(usersByRole).length > 0 ? (
                Object.entries(usersByRole).map(([userRole, users]) => {
                  const roleInfo = roleLabels[userRole] || { 
                    label: userRole, 
                    icon: <Shield className="w-3 h-3" />, 
                    color: "text-muted-foreground" 
                  };
                  
                  return (
                    <div key={userRole}>
                      <p className={cn("text-xs font-medium mb-2 flex items-center gap-1", roleInfo.color)}>
                        {roleInfo.icon}
                        {roleInfo.label}s ({users.length})
                      </p>
                      <div className="space-y-1">
                        {users.map((contact) => {
                          const isActive = selectedContact?.user_id === contact.user_id;
                          const unreadCount = unreadCounts[contact.user_id] || 0;
                          
                          return (
                            <button
                              key={contact.user_id}
                              onClick={() => setSelectedContact(contact)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                              )}
                            >
                              <div className="relative">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={contact.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(contact.profile?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <Circle className={cn(
                                  "w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full",
                                  contact.is_online 
                                    ? "fill-success text-success" 
                                    : "fill-muted-foreground text-muted-foreground"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {contact.profile?.full_name || "Utilisateur"}
                                </p>
                              </div>
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs px-1.5 min-w-[20px] justify-center">
                                  {unreadCount}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    Aucun contact autorisé
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role === "superviseur" 
                      ? "Aucun appelant, livreur ou admin disponible"
                      : "Aucun superviseur disponible"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <CardHeader className="py-3 border-b flex-shrink-0">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedContact.profile?.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(selectedContact.profile?.full_name)}</AvatarFallback>
                      </Avatar>
                      <Circle className={cn(
                        "w-3 h-3 absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full",
                        selectedContact.is_online 
                          ? "fill-success text-success" 
                          : "fill-muted-foreground text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">{selectedContact.profile?.full_name || "Utilisateur"}</p>
                      <p className={cn("text-xs flex items-center gap-1", roleLabels[selectedContact.role]?.color)}>
                        {roleLabels[selectedContact.role]?.icon}
                        {roleLabels[selectedContact.role]?.label}
                        <span className={cn("ml-1", selectedContact.is_online ? "text-success" : "text-muted-foreground")}>
                          • {selectedContact.is_online ? "En ligne" : "Hors ligne"}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {messagesLoading ? (
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
                              {msg.is_read && isOwn && <span className="ml-1">✓</span>}
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

              {/* Message Input */}
              <div className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || sendingMessage}>
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-lg font-medium text-muted-foreground">
                  Sélectionnez un contact
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choisissez un contact pour démarrer une conversation
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
