console.log('🔥 AuthContext file loading...');
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/integrations/supabase/database-types';

export type AppRole = 'admin' | 'moderator' | 'user';

interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  initialized: boolean;

  // Auth methods
  signInWithGoogle: (keepLoggedIn?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>;
  requestMakerStatus: () => Promise<Profile>;

  // Computed states - SINGLE SOURCE OF TRUTH
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isMaker: boolean;
  isBadgeMaker: boolean;
  
  // Admin access methods
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
  canManageBadges: boolean;
  canEditBadge: (badgeTeamName: string | null) => boolean;
  getDisplayRole: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('🚀 AuthProvider mounting...');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const maxLoadTime = setTimeout(() => {
      if (isMounted) {
        console.log('🔐 Auth initialization timeout');
        setLoading(false);
        setInitialized(true);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔐 Auth state change:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch both profile and roles together
          setTimeout(async () => {
            if (isMounted) {
              await Promise.all([
                fetchProfile(session.user.id),
                fetchUserRoles(session.user.id)
              ]);
              setLoading(false);
              setInitialized(true);
              clearTimeout(maxLoadTime);
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
          setInitialized(true);
          clearTimeout(maxLoadTime);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error('🔐 Error getting initial session:', error);
        setLoading(false);
        setInitialized(true);
        clearTimeout(maxLoadTime);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(maxLoadTime);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('🔐 Error fetching profile:', error);
        setProfile(null);
      } else if (data) {
        console.log('🔐 Profile fetched:', { role: data.role, maker_approved: data.maker_approved });
        setProfile(data as unknown as Profile);
      } else {
        console.log('🔐 No profile found');
        setProfile(null);
      }
    } catch (error) {
      console.error('🔐 Exception fetching profile:', error);
      setProfile(null);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('🔐 Error fetching roles:', error);
        setRoles([]);
      } else {
        const fetchedRoles = (data || []).map(r => r.role as AppRole);
        console.log('🔐 User roles fetched:', fetchedRoles);
        setRoles(fetchedRoles);
      }
    } catch (error) {
      console.error('🔐 Exception fetching roles:', error);
      setRoles([]);
    }
  };

  const signInWithGoogle = async (keepLoggedIn: boolean = false) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        ...(keepLoggedIn && {
          persistSession: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        })
      }
    });

    if (error) throw error;

    if (keepLoggedIn) {
      localStorage.setItem('keepLoggedIn', 'true');
    } else {
      localStorage.removeItem('keepLoggedIn');
    }
  };

  const signOut = async () => {
    localStorage.removeItem('keepLoggedIn');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    const updatedProfile = data as unknown as Profile;
    setProfile(updatedProfile);
    return updatedProfile;
  };

  const requestMakerStatus = async () => {
    const result = await updateProfile({ wants_to_be_maker: true });

    try {
      // Send Discord notification without hook dependency
      await supabase.functions.invoke('send-discord-notification', {
        body: {
          type: 'maker_request',
          data: {
            title: '🛠️ New Maker Request',
            description: `**${profile?.display_name || user?.email || 'User'}** has requested maker status.`,
            fields: [
              ...(user?.email ? [{ name: 'Email', value: user.email, inline: true }] : []),
            ],
          }
        }
      });

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'maker_request',
          to: 'admin@mybadgelife.app',
          data: {
            userName: profile?.display_name || user?.email,
            userEmail: user?.email,
            requestMessage: `User ${profile?.display_name || user?.email} has requested maker status.`,
            userProfileUrl: `${window.location.origin}/admin#users`,
            adminUrl: `${window.location.origin}/admin`,
            registrationDate: profile?.created_at,
            userId: user?.id
          }
        }
      });
    } catch (error) {
      console.error('🔐 Failed to send notifications:', error);
    }

    return result;
  };

  // SINGLE SOURCE OF TRUTH FOR ALL ROLE CHECKS
  const isAuthenticated = !!user;
  const isAdmin = roles.includes('admin') || profile?.role === 'admin';
  const isModerator = roles.includes('moderator');
  const isMaker = profile?.role === 'maker' && profile?.maker_approved;
  const isBadgeMaker = isMaker; // alias

  // Admin access logic - consolidated and consistent
  const canAccessAdmin = !loading && initialized && (isAdmin || isMaker);
  const canManageUsers = isAdmin;
  const canManageTeams = isAdmin;
  const canManageBadges = isAdmin || isMaker;

  const canEditBadge = (badgeTeamName: string | null) => {
    if (isAdmin) return true;
    if (isMaker) {
      return badgeTeamName === profile?.assigned_team;
    }
    return false;
  };

  const getDisplayRole = () => {
    if (isAdmin) return 'Admin';
    if (isMaker) return 'Badge Maker';
    if (profile?.role === 'maker' && !profile?.maker_approved) return 'Pending Badge Maker';
    if (isModerator) return 'Moderator';
    return 'User';
  };

  console.log('🔐 AuthContext state:', {
    loading,
    initialized,
    isAuthenticated,
    isAdmin,
    isMaker,
    canAccessAdmin,
    profileRole: profile?.role,
    userRoles: roles
  });

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    loading,
    initialized,
    signInWithGoogle,
    signOut,
    updateProfile,
    requestMakerStatus,
    isAuthenticated,
    isAdmin,
    isModerator,
    isMaker,
    isBadgeMaker,
    canAccessAdmin,
    canManageUsers,
    canManageTeams,
    canManageBadges,
    canEditBadge,
    getDisplayRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}