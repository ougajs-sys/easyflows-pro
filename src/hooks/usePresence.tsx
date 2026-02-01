import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface UserPresence {
  user_id: string;
  role: string;
  last_seen_at: string;
  updated_at: string;
  is_online?: boolean;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const ONLINE_THRESHOLD = 60000; // 1 minute - consider user online if last_seen within this time

export function usePresence() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Heartbeat mutation to update user presence
  const heartbeatMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !role) return;

      // Use type assertion to work around missing types in generated schema
      const { error } = await (supabase
        .from("user_presence") as any)
        .upsert({
          user_id: user.id,
          role: role,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("Error updating presence:", error);
        throw error;
      }
    },
  });

  // Setup heartbeat interval
  useEffect(() => {
    if (!user?.id || !role) return;

    // Initial heartbeat
    heartbeatMutation.mutate();

    // Setup interval
    const interval = setInterval(() => {
      heartbeatMutation.mutate();
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
    };
    // Intentionally excluding heartbeatMutation to prevent re-creating interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  // Fetch all authorized contacts with presence status
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["user-presence", role],
    queryFn: async () => {
      if (!user?.id || !role) return [];

      // Get allowed roles based on current user's role
      const allowedRoles = getAllowedRoles(role);
      
      if (allowedRoles.length === 0) return [];

      // First, fetch all profiles matching the allowed roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("role", allowedRoles)
        .neq("id", user.id);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) return [];

      // Get presence data for these users
      const userIds = profiles.map(p => p.id);
      const { data: presenceData, error: presenceError } = await (supabase
        .from("user_presence") as any)
        .select("user_id, role, last_seen_at, updated_at")
        .in("user_id", userIds);

      if (presenceError) {
        console.error("Error fetching presence:", presenceError);
        // Don't throw - we can still show users without presence data
      }

      // Create a map of presence data by user_id
      const presenceMap = new Map(
        (presenceData as {
          user_id: string;
          role: string;
          last_seen_at: string;
          updated_at: string;
        }[] || []).map(p => [p.user_id, p])
      );

      // Combine profiles with presence data
      const now = new Date().getTime();
      const allContacts: UserPresence[] = profiles.map((profile) => {
        const presence = presenceMap.get(profile.id);
        const isOnline = presence 
          ? (now - new Date(presence.last_seen_at).getTime()) < ONLINE_THRESHOLD
          : false;

        return {
          user_id: profile.id,
          role: profile.role,
          last_seen_at: presence?.last_seen_at || new Date(0).toISOString(), // Use epoch time for users without presence
          updated_at: presence?.updated_at || new Date(0).toISOString(),
          is_online: isOnline,
          profile: {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          },
        } as UserPresence;
      });

      return allContacts;
    },
    enabled: !!user?.id && !!role,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Setup Supabase Realtime Presence
  useEffect(() => {
    if (!user?.id || !role) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence
    channel
      .on("presence", { event: "sync" }, () => {
        // Invalidate queries when presence changes
        queryClient.invalidateQueries({ queryKey: ["user-presence"] });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track current user
          await channel.track({
            user_id: user.id,
            role: role,
            online_at: new Date().toISOString(),
          });
        }
      });

    setRealtimeChannel(channel);

    return () => {
      channel.unsubscribe();
      setRealtimeChannel(null);
    };
  }, [user?.id, role, queryClient]);

  // Subscribe to presence table changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("user-presence-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        () => {
          // Invalidate presence query when table changes
          queryClient.invalidateQueries({ queryKey: ["user-presence"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    onlineUsers,
    isLoading,
    realtimeChannel,
  };
}

// Helper function to determine allowed role pairs
function getAllowedRoles(currentRole: string): string[] {
  // Only superviseurs can chat with everyone
  // Others can only chat with superviseurs
  if (currentRole === "superviseur") {
    return ["appelant", "livreur", "administrateur"];
  }
  
  if (currentRole === "appelant" || currentRole === "livreur" || currentRole === "administrateur") {
    return ["superviseur"];
  }
  
  return [];
}
