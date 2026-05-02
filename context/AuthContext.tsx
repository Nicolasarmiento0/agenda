import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  role: 'client' | 'company' | 'admin' | null;
};

export type Business = {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  business: Business | null;
  loading: boolean;
  profileLoaded: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updates: Partial<Profile>) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  business: null,
  loading: true,
  profileLoaded: false,
  refreshProfile: async () => { },
  updateProfileState: () => { },
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const navigateByRole = (role: string | null, businessData?: Business | null) => {
    if (!role) {
      router.replace('/screens/role-select' as any);
    } else if (role === 'admin') {
      router.replace('/screens/admin-dashboard' as any);
    } else if (role === 'company') {
      if (!businessData) {
        router.replace('/screens/business-setup' as any);
      } else if (businessData.status === 'pending' || businessData.status === 'rejected') {
        router.replace('/screens/business-pending' as any);
      } else {
        router.replace('/screens/dashboard-company' as any);
      }
    } else {
      router.replace('/screens/dashboard' as any);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        
        let businessData = null;
        if (data.role === 'company') {
          const { data: bData } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', userId)
            .single();
          
          if (bData) {
            businessData = bData;
            setBusiness(businessData);
          } else {
            setBusiness(null);
          }
        }

        navigateByRole(data.role, businessData);
      }
    } finally {
      setProfileLoaded(true);
    }
  };

  // Solo actualiza el perfil en el estado, sin redirigir.
  // Usar esto cuando el usuario ya está autenticado y solo queremos refrescar datos (ej: tras cambiar avatar).
  const refreshProfile = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profileData) {
      setProfile(profileData);
      
      if (profileData.role === 'company') {
        const { data: bData } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', data.user.id)
          .single();
        if (bData) {
          setBusiness(bData);
        } else {
          setBusiness(null);
        }
      }
    }
  };

  const updateProfileState = (updates: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setBusiness(null);
    setProfileLoaded(false);
    router.replace('/screens/loginscreen' as any);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfileLoaded(true);
        router.replace('/screens/home' as any);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setBusiness(null);
        setProfileLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      business,
      loading,
      profileLoaded,
      refreshProfile,
      updateProfileState,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);