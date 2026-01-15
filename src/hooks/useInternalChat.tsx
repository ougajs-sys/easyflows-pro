import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  channel: string;
  content: string;
  message_type: string | null;
  order_id: string | null;
  is_read: boolean | null;
  created_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChatUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export type ChatChannel = "general" | "superviseurs" | "appelants" | "livreurs" | "direct";

export function useInternalChat(selectedChannel: ChatChannel = "general", selectedUserId?: string) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  // Get channel name based on type and direct user
  const getChannelName = useCallback(() => {
    if (selectedChannel === "direct" && selectedUserId) {
      // For direct messages, create a consistent channel name
      const ids = [user?.id, selectedUserId].sort();
      return `direct-${ids[0]}-${ids[1]}`;
    }
    return `internal-${selectedChannel}`;
  }, [selectedChannel, selectedUserId, user?.id]);

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["internal-chat-messages", getChannelName()],
    queryFn: async () => {
      if (!user?.id) return [];

      const channelName = getChannelName();

      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", channelName)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
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
    refetchInterval: 5000, // Polling every 5 seconds as fallback
  });

  // Fetch users for direct messaging
  const { data: availableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["internal-chat-users", role],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all users with roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("confirmed", true);

      if (rolesError) throw rolesError;

      const userIds = userRoles.map(ur => ur.user_id).filter(id => id !== user.id);

      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Map roles to users
      const roleMap = new Map(userRoles.map(ur => [ur.user_id, ur.role]));

      return profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role: roleMap.get(p.id) || "unknown",
      })) as ChatUser[];
    },
    enabled: !!user?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const channelName = getChannelName();

      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedChannel === "direct" ? selectedUserId : null,
        channel: channelName,
        content,
        message_type: "text",
        is_read: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-chat-messages", getChannelName()] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const channelName = getChannelName();

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("channel", channelName)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["internal-chat-unread"] });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channelName = getChannelName();

    const realtimeChannel = supabase
      .channel(`internal-chat-${channelName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channelName}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Invalidate and refetch messages
          queryClient.invalidateQueries({ queryKey: ["internal-chat-messages", channelName] });
          
          // Show notification for incoming messages
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
  }, [user?.id, getChannelName, queryClient]);

  // Get unread count for channels
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["internal-chat-unread", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      const channels = ["internal-general", "internal-superviseurs", "internal-appelants", "internal-livreurs"];
      const counts: Record<string, number> = {};

      for (const channel of channels) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("channel", channel)
          .neq("sender_id", user.id)
          .eq("is_read", false);

        counts[channel] = count || 0;
      }

      return counts;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  return {
    messages,
    messagesLoading,
    availableUsers,
    usersLoading,
    sendMessage: (content: string) => sendMessageMutation.mutate(content),
    sendingMessage: sendMessageMutation.isPending,
    markAsRead: () => markAsReadMutation.mutate(),
    refetchMessages,
    unreadCounts,
    totalUnread: Object.values(unreadCounts).reduce((a, b) => a + b, 0),
  };
}
