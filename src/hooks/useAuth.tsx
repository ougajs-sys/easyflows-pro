import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  isDelivery: () => boolean;
  isCaller: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Fetch role - use maybeSingle() to handle case where role doesn't exist yet
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setRole(null);
      } else if (roleData) {
        setRole(roleData.role);
      } else {
        // No role found - this is expected for new users during signup
        // Log this occurrence to help identify if role creation is failing
        console.warn('No role found for user:', userId, '- This should be temporary during signup process');
        setRole(null);
      }
    } catch (err) {
      console.error('Unexpected error in fetchUserData:', err);
      setRole(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event);
        
        // Handle token refresh failure - redirect to login
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing session...');
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          // Clear local storage and redirect
          localStorage.removeItem('sb-qpxzuglvvfvookzmpgfe-auth-token');
          if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
            window.location.href = '/auth';
          }
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        // Fetch user data directly without setTimeout to prevent race conditions
        if (session?.user) {
          fetchUserData(session.user.id).finally(() => {
            setLoading(false);
          });
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Handle session retrieval error (expired/invalid token)
      if (error) {
        console.warn('Session retrieval error:', error.message);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
        // Clear potentially corrupted token
        localStorage.removeItem('sb-qpxzuglvvfvookzmpgfe-auth-token');
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const isAdmin = () => role === 'administrateur';
  const isSupervisor = () => role === 'superviseur';
  const isDelivery = () => role === 'livreur';
  const isCaller = () => role === 'appelant';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signUp,
        signIn,
        signOut,
        isAdmin,
        isSupervisor,
        isDelivery,
        isCaller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
