import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: AppRole;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

export function useRoleRequests() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  // Fetch all role requests (for admins)
  const { data: allRequests = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['role-requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each request
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(request => ({
        ...request,
        status: request.status as 'pending' | 'approved' | 'rejected',
        profile: profileMap.get(request.user_id) || null,
      })) as RoleRequest[];
    },
    enabled: isAdmin(),
  });

  // Fetch user's own requests
  const { data: myRequests = [], isLoading: isLoadingMine } = useQuery({
    queryKey: ['role-requests', 'mine', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(r => ({
        ...r,
        status: r.status as 'pending' | 'approved' | 'rejected',
      })) as RoleRequest[];
    },
    enabled: !!user,
  });

  // Create a new role request
  const createRequest = useMutation({
    mutationFn: async ({ requestedRole, reason }: { requestedRole: AppRole; reason?: string }) => {
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('role_requests')
        .insert({
          user_id: user.id,
          requested_role: requestedRole,
          reason: reason || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests'] });
    },
  });

  // Approve or reject a request (admin only)
  const reviewRequest = useMutation({
    mutationFn: async ({ requestId, status, userId, requestedRole }: { 
      requestId: string; 
      status: 'approved' | 'rejected';
      userId: string;
      requestedRole: AppRole;
    }) => {
      if (!user) throw new Error('Non authentifié');

      // If approved, use the RPC function for atomic operation
      if (status === 'approved') {
        const { error: approveError } = await supabase.rpc('approve_role_request', {
          p_request_id: requestId,
          p_reviewer_id: user.id,
        });

        if (approveError) throw approveError;

        // If the role is livreur, create a delivery_persons entry
        if (requestedRole === 'livreur') {
          // Check if entry already exists
          const { data: existingDp } = await supabase
            .from('delivery_persons')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!existingDp) {
            const { error: dpError } = await supabase
              .from('delivery_persons')
              .insert({
                user_id: userId,
                status: 'offline',
                is_active: true,
              });

            if (dpError) {
              console.error('Error creating delivery_persons entry:', dpError);
              // Non-blocking error - the role is already assigned
            }
          }
        }
      } else {
        // For rejection, use the reject RPC function
        const { error: rejectError } = await supabase.rpc('reject_role_request', {
          p_request_id: requestId,
          p_reviewer_id: user.id,
          p_reason: 'Demande rejetée par administrateur',
        });

        if (rejectError) throw rejectError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const pendingRequests = allRequests.filter(r => r.status === 'pending');
  const hasPendingRequest = myRequests.some(r => r.status === 'pending');

  return {
    allRequests,
    myRequests,
    pendingRequests,
    hasPendingRequest,
    isLoading: isLoadingAll || isLoadingMine,
    createRequest,
    reviewRequest,
  };
}
