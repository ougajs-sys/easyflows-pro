import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Schedule {
  id: string;
  user_id: string;
  type: 'delivery' | 'caller';
  date: string;
  start_time: string;
  end_time: string;
  zone: string | null;
  notes: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

export const useSchedules = (date?: string, type?: string) => {
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ["schedules", date, type],
    queryFn: async () => {
      let query = supabase
        .from("schedules")
        .select("*")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (date) {
        query = query.eq("date", date);
      }
      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(schedule => ({
        ...schedule,
        profiles: profileMap.get(schedule.user_id) || null,
      })) as Schedule[];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
      const { data, error } = await supabase
        .from("schedules")
        .insert(schedule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Schedule> & { id: string }) => {
      const { data, error } = await supabase
        .from("schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  return {
    schedules,
    isLoading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
};
