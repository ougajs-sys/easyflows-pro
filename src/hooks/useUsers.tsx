import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  role: AppRole | null;
}

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const rolesByUserId = new Map((roles ?? []).map((role) => [role.user_id, role]));

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = rolesByUserId.get(profile.id);
        return {
          id: profile.id,
          email: '', // Email not accessible from profiles
          created_at: profile.created_at,
          profile: {
            full_name: profile.full_name,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
          },
          role: userRole?.role || null,
        };
      });

      return usersWithRoles;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return {
    users,
    isLoading,
    error,
    updateRole,
  };
}
