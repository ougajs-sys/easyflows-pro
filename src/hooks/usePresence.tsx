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

      const { error } = await supabase
        .from("user_presence")
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
  }, [user?.id, role]);

  // Fetch online users with DB fallback
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["user-presence", role],
    queryFn: async () => {
      if (!user?.id || !role) return [];

      // Get allowed roles based on current user's role
      const allowedRoles = getAllowedRoles(role);
      
      if (allowedRoles.length === 0) return [];

      // Fetch presence data for allowed roles
      const { data: presenceData, error: presenceError } = await supabase
        .from("user_presence")
        .select("user_id, role, last_seen_at, updated_at")
        .in("role", allowedRoles)
        .neq("user_id", user.id);

      if (presenceError) {
        console.error("Error fetching presence:", presenceError);
        throw presenceError;
      }

      if (!presenceData || presenceData.length === 0) return [];

      // Get user profiles
      const userIds = presenceData.map(p => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Filter only online users and enrich with profile data
      const now = new Date().getTime();
      const onlineUsersData: UserPresence[] = presenceData
        .map(p => {
          const lastSeen = new Date(p.last_seen_at).getTime();
          const isOnline = (now - lastSeen) < ONLINE_THRESHOLD;
          
          if (!isOnline) return null;

          const profile = profileMap.get(p.user_id);
          
          return {
            ...p,
            is_online: true,
            profile: profile ? {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            } : undefined,
          };
        })
        .filter((p): p is UserPresence => p !== null);

      return onlineUsersData;
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
