import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInternalChat, ChatChannel, ChatUser } from "@/hooks/useInternalChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  MessageSquare, 
  Users,
  User,
  Loader2,
  Hash,
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

const channelConfig: Record<ChatChannel, { label: string; icon: React.ReactNode; description: string }> = {
  general: { label: "Général", icon: <Hash className="w-4 h-4" />, description: "Discussion générale pour toute l'équipe" },
  superviseurs: { label: "Superviseurs", icon: <Shield className="w-4 h-4" />, description: "Canal réservé aux superviseurs" },
  appelants: { label: "Appelants", icon: <Phone className="w-4 h-4" />, description: "Canal réservé aux appelants" },
  livreurs: { label: "Livreurs", icon: <Truck className="w-4 h-4" />, description: "Canal réservé aux livreurs" },
  direct: { label: "Messages privés", icon: <User className="w-4 h-4" />, description: "Conversations privées" },
};

interface InternalChatProps {
  fullHeight?: boolean;
}

export function InternalChat({ fullHeight = true }: InternalChatProps) {
  const { user, role } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel>("general");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    messagesLoading,
    availableUsers,
    sendMessage,
    sendingMessage,
    markAsRead,
    unreadCounts,
  } = useInternalChat(selectedChannel, selectedUser?.id);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    markAsRead();
  }, [selectedChannel, selectedUser?.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;
    sendMessage(newMessage.trim());
    setNewMessage("");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Filter channels based on role
  const getAvailableChannels = (): ChatChannel[] => {
    const channels: ChatChannel[] = ["general"];
    
    if (role === "administrateur" || role === "superviseur") {
      channels.push("superviseurs", "appelants", "livreurs");
    } else if (role === "appelant") {
      channels.push("appelants");
    } else if (role === "livreur") {
      channels.push("livreurs");
    }
    
    channels.push("direct");
    return channels;
  };

  const availableChannels = getAvailableChannels();

  // Group users by role
  const usersByRole = availableUsers.reduce((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {} as Record<string, ChatUser[]>);

  return (
    <div className={cn("flex flex-col", fullHeight ? "h-[calc(100vh-8rem)]" : "h-[600px]")}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Chat interne
        </h1>
        <p className="text-muted-foreground">Communication en temps réel avec votre équipe</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Channels & Users Sidebar */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 border-b flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Canaux & Contacts
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Channels */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Canaux</p>
                <div className="space-y-1">
                  {availableChannels.filter(c => c !== "direct").map((channel) => {
                    const config = channelConfig[channel];
                    const unread = unreadCounts[`internal-${channel}`] || 0;
                    const isActive = selectedChannel === channel && !selectedUser;
                    
                    return (
                      <button
                        key={channel}
                        onClick={() => {
                          setSelectedChannel(channel);
                          setSelectedUser(null);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                        )}
                      >
                        {config.icon}
                        <span className="flex-1 text-sm font-medium">{config.label}</span>
                        {unread > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5">
                            {unread}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Messages */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Messages privés</p>
                <div className="space-y-3">
                  {Object.entries(usersByRole).map(([userRole, users]) => {
                    const roleInfo = roleLabels[userRole] || { label: userRole, icon: <User className="w-3 h-3" />, color: "text-muted-foreground" };
                    
                    return (
                      <div key={userRole}>
                        <p className={cn("text-xs font-medium mb-1 flex items-center gap-1", roleInfo.color)}>
                          {roleInfo.icon}
                          {roleInfo.label}s
                        </p>
                        <div className="space-y-1">
                          {users.map((u) => {
                            const isActive = selectedChannel === "direct" && selectedUser?.id === u.id;
                            
                            return (
                              <button
                                key={u.id}
                                onClick={() => {
                                  setSelectedChannel("direct");
                                  setSelectedUser(u);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                  isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                                )}
                              >
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={u.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(u.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 text-sm truncate">
                                  {u.full_name || "Utilisateur"}
                                </span>
                                <Circle className="w-2 h-2 fill-success text-success" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      Aucun utilisateur disponible
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <CardHeader className="py-3 border-b flex-shrink-0">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChannel === "direct" && selectedUser ? (
                  <>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(selectedUser.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedUser.full_name}</p>
                      <p className={cn("text-xs flex items-center gap-1", roleLabels[selectedUser.role]?.color)}>
                        {roleLabels[selectedUser.role]?.icon}
                        {roleLabels[selectedUser.role]?.label}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {channelConfig[selectedChannel].icon}
                    <div>
                      <p className="font-medium">{channelConfig[selectedChannel].label}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {channelConfig[selectedChannel].description}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 rounded-full bg-success mr-1 animate-pulse" />
                En ligne
              </Badge>
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
                        <p className={cn(
                          "text-xs mt-1",
                          isOwn ? "text-muted-foreground" : "text-muted-foreground"
                        )}>
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
        </Card>
      </div>
    </div>
  );
}
