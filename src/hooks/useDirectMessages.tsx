import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
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
  receiver?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface DMContact {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_online: boolean;
}

export function useDirectMessages(contactUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate deterministic channel name for DM
  const getChannelName = useCallback((userId1: string, userId2: string) => {
    const ids = [userId1, userId2].sort();
    return `direct-${ids[0]}-${ids[1]}`;
  }, []);

  // Fetch messages for a specific DM conversation
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["direct-messages", contactUserId],
    queryFn: async () => {
      if (!user?.id || !contactUserId) return [];

      const channelName = getChannelName(user.id, contactUserId);

      const { data: messagesData, error } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, channel, content, message_type, order_id, is_read, created_at")
        .eq("channel", channelName)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error fetching DM messages:", error);
        throw error;
      }

      if (!messagesData || messagesData.length === 0) return [];

      // Get sender and receiver profiles
      const userIds = [...new Set([
        ...messagesData.map(m => m.sender_id),
        ...messagesData.map(m => m.receiver_id).filter((id): id is string => id !== null),
      ])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return messagesData.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || { id: msg.sender_id, full_name: "Utilisateur", avatar_url: null },
        receiver: msg.receiver_id ? (profileMap.get(msg.receiver_id) || { id: msg.receiver_id, full_name: "Utilisateur", avatar_url: null }) : undefined,
      })) as DirectMessage[];
    },
    enabled: !!user?.id && !!contactUserId,
    refetchInterval: 5000, // Polling fallback every 5 seconds (reduced from 3s)
  });

  // Fetch unread counts for all DM conversations
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["direct-messages-unread", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      // Get all DM messages where user is receiver and message is unread
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .like("channel", "direct-%");

      if (error) {
        console.error("Error fetching unread counts:", error);
        return {};
      }

      // Count unread by sender
      const counts: Record<string, number> = {};
      data?.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Send DM message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const channelName = getChannelName(user.id, receiverId);

      const insertData = {
        sender_id: user.id,
        receiver_id: receiverId,
        channel: channelName,
        content,
        message_type: "text",
        is_read: false,
      };

      const { error } = await supabase.from("messages").insert(insertData);

      if (error) {
        console.error("Error sending DM:", error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages-unread"] });
    },
    onError: (error) => {
      console.error("Error sending DM:", error);
      toast.error("Erreur lors de l'envoi du message");
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (senderId: string) => {
      if (!user?.id) return;

      const channelName = getChannelName(user.id, senderId);

      // Only update messages where current user is the receiver
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("channel", channelName)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking messages as read:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages-unread"] });
    },
  });

  // Real-time subscription for DM messages
  useEffect(() => {
    if (!user?.id || !contactUserId) return;

    const channelName = getChannelName(user.id, contactUserId);

    const realtimeChannel = supabase
      .channel(`dm-${channelName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channelName}`,
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          
          // Invalidate and refetch messages
          queryClient.invalidateQueries({ queryKey: ["direct-messages", contactUserId] });
          queryClient.invalidateQueries({ queryKey: ["direct-messages-unread"] });
          
          // Show notification for incoming messages
          if (newMsg.sender_id !== user.id) {
            toast.info("Nouveau message", {
              description: newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? "..." : ""),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channelName}`,
        },
        () => {
          // Refetch when messages are updated (e.g., marked as read)
          queryClient.invalidateQueries({ queryKey: ["direct-messages", contactUserId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [user?.id, contactUserId, getChannelName, queryClient]);

  return {
    messages,
    messagesLoading,
    sendMessage: (receiverId: string, content: string) => 
      sendMessageMutation.mutate({ receiverId, content }),
    sendingMessage: sendMessageMutation.isPending,
    markAsRead: (senderId: string) => markAsReadMutation.mutate(senderId),
    refetchMessages,
    unreadCounts,
    totalUnread: Object.values(unreadCounts).reduce((a, b) => a + b, 0),
  };
}
