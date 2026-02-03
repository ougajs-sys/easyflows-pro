import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePresence, UserPresence } from "@/hooks/usePresence";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  MessageSquare, 
  X,
  Loader2,
  Phone,
  Truck,
  Shield,
  Crown,
  Circle,
  ChevronLeft,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  administrateur: { label: "Admin", icon: <Crown className="w-3 h-3" />, color: "text-purple-500" },
  superviseur: { label: "Superviseur", icon: <Shield className="w-3 h-3" />, color: "text-blue-500" },
  appelant: { label: "Appelant", icon: <Phone className="w-3 h-3" />, color: "text-green-500" },
  livreur: { label: "Livreur", icon: <Truck className="w-3 h-3" />, color: "text-orange-500" },
};

// Hierarchical role descriptions
const roleDescriptions: Record<string, string> = {
  administrateur: "Communiquez avec tous les intervenants",
  superviseur: "Communiquez avec appelants, livreurs et administrateurs",
  appelant: "Communiquez avec vos superviseurs",
  livreur: "Communiquez avec vos superviseurs",
};

export function FloatingChat() {
  const { user, role } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<UserPresence | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Determine if chat should be shown BEFORE calling dependent hooks
  // This ensures hooks are always called in the same order
  const shouldShow = !!user && 
    location.pathname !== '/auth' && 
    !location.pathname.startsWith('/embed');

  // Get online users based on role - ALWAYS call this hook
  const { onlineUsers, isLoading: presenceLoading } = usePresence();

  // Get DM messages and functionality - ALWAYS call this hook
  // Pass undefined when not showing to disable queries
  const contactId = shouldShow ? selectedContact?.user_id : undefined;
  const {
    messages,
    messagesLoading,
    sendMessage,
    sendingMessage,
    markAsRead,
    unreadCounts,
    totalUnread,
  } = useDirectMessages(contactId);

  // Auto-scroll to bottom - ALWAYS call this hook
  useEffect(() => {
    if (!shouldShow) return;
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, shouldShow]);

  // Mark as read when viewing contact - ALWAYS call this hook
  useEffect(() => {
    if (!shouldShow) return;
    if (selectedContact?.user_id) {
      const unreadCount = unreadCounts[selectedContact.user_id] || 0;
      if (unreadCount > 0) {
        // Small delay to debounce rapid contact switches
        const timeoutId = setTimeout(() => {
          markAsRead(selectedContact.user_id);
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedContact?.user_id, unreadCounts, markAsRead, shouldShow]);

  // NOW we can do conditional rendering - all hooks have been called
  if (!shouldShow) {
    return null;
  }

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

  const handleBack = () => {
    setSelectedContact(null);
  };

  // Group online users by role
  const usersByRole = onlineUsers.reduce((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {} as Record<string, UserPresence[]>);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center",
          isOpen 
            ? "bg-muted hover:bg-muted/80" 
            : "bg-primary hover:bg-primary/90 hover:scale-110"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-foreground" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1 font-medium">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-xl shadow-2xl border border-border bg-background overflow-hidden transition-all duration-300",
            "animate-in fade-in-0 slide-in-from-bottom-4"
          )}
          style={{ height: 'min(550px, calc(100vh - 8rem))' }}
        >
          {selectedContact ? (
            // Chat View
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
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
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedContact.profile?.full_name || "Utilisateur"}</p>
                  <p className={cn("text-xs flex items-center gap-1", roleLabels[selectedContact.role]?.color)}>
                    {roleLabels[selectedContact.role]?.icon}
                    {roleLabels[selectedContact.role]?.label}
                    <span className={cn("ml-1", selectedContact.is_online ? "text-success" : "text-muted-foreground")}>
                      • {selectedContact.is_online ? "En ligne" : "Hors ligne"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((msg, index) => {
                      const isOwn = msg.sender_id === user?.id;
                      const showAvatar = index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;
                      
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            isOwn ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          {showAvatar ? (
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarImage src={msg.sender?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(msg.sender?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-7 flex-shrink-0" />
                          )}
                          <div className={cn("max-w-[75%]", isOwn && "text-right")}>
                            <div
                              className={cn(
                                "rounded-lg px-3 py-2 inline-block text-sm",
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-secondary text-secondary-foreground rounded-bl-sm"
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <p className="text-[10px] mt-0.5 text-muted-foreground">
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
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">Aucun message</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Démarrez la conversation !
                    </p>
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-3 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                    className="flex-1 h-9"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9" disabled={!newMessage.trim() || sendingMessage}>
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            // Contacts List View
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Messagerie</h3>
                    <p className="text-xs text-muted-foreground">
                      {role ? roleDescriptions[role] : "Chargement..."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contacts List */}
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
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
                          <p className={cn("text-xs font-medium mb-2 flex items-center gap-1 px-1", roleInfo.color)}>
                            {roleInfo.icon}
                            {roleInfo.label}s ({users.length})
                          </p>
                          <div className="space-y-1">
                            {users.map((contact) => {
                              const unreadCount = unreadCounts[contact.user_id] || 0;
                              
                              return (
                                <button
                                  key={contact.user_id}
                                  onClick={() => setSelectedContact(contact)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-secondary"
                                >
                                  <div className="relative">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={contact.profile?.avatar_url || undefined} />
                                      <AvatarFallback className="text-sm">
                                        {getInitials(contact.profile?.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <Circle className={cn(
                                      "w-3 h-3 absolute -bottom-0.5 -right-0.5 border-2 border-background rounded-full",
                                      contact.is_online 
                                        ? "fill-success text-success" 
                                        : "fill-muted-foreground text-muted-foreground"
                                    )} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {contact.profile?.full_name || "Utilisateur"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {contact.is_online ? "En ligne" : "Hors ligne"}
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
                      <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Aucun contact disponible
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 px-4">
                        {role === "superviseur" 
                          ? "Aucun appelant, livreur ou admin n'est disponible"
                          : role === "administrateur"
                          ? "Aucun utilisateur n'est disponible"
                          : "Aucun superviseur n'est disponible"}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </>
  );
}
