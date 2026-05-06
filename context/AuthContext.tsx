import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  avatar_url?: string;
  description?: string;
  maps_url?: string;
  opening_time?: string;
  closing_time?: string;
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
  // Ref para evitar doble llamada a fetchProfile entre getSession y onAuthStateChange
  const fetchedRef = React.useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
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
      }
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  // Solo actualiza el perfil en el estado, sin redirigir.
  // Usar esto cuando el usuario ya está autenticado y solo queremos refrescar datos (ej: tras cambiar avatar).
  const refreshProfile = useCallback(async () => {
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
  }, []);

  const updateProfileState = useCallback((updates: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setBusiness(null);
    setProfileLoaded(false);
    router.replace('/screens/home' as any);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchedRef.current = true;
        fetchProfile(session.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (_event === 'SIGNED_OUT') {
        // Solo reseteamos el estado cuando el usuario cierra sesión explícitamente
        setProfile(null);
        setBusiness(null);
        setProfileLoaded(false);
        fetchedRef.current = false;
      } else if (session && !fetchedRef.current) {
        // Sesión activa pero fetchProfile aún no corrió (ej: INITIAL_SESSION tardío)
        fetchedRef.current = true;
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const contextValue = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    business,
    loading,
    profileLoaded,
    refreshProfile,
    updateProfileState,
    signOut,
  }), [session, profile, business, loading, profileLoaded, refreshProfile, updateProfileState, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);