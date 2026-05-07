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
  instagram_url?: string;
  opening_time?: string;
  closing_time?: string;
  category_id?: string;
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
  const fetchedRef = React.useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        console.log('AUTH: Profile fetched:', data.role);
        setProfile(data);

        if (data.role === 'company') {
          console.log('AUTH: Fetching business for company user...');
          const { data: bData, error: bError } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', userId)
            .maybeSingle();

          if (bData) {
            console.log('AUTH: Business found:', bData.id, '| Status:', bData.status);
            setBusiness(bData);
          } else {
            console.log('AUTH: No business found for this company user');
            setBusiness(null);
          }
          if (bError) console.error('AUTH: Error fetching business:', bError);
        } else {
          // Si el rol no es company, aseguramos que business quede en null
          setBusiness(null);
        }
      } else {
        console.log('AUTH: No profile found for userId:', userId);
        setProfile(null);
        setBusiness(null);
      }
    } catch (error: any) {
      console.error('AUTH: Critical error in fetchProfile:', error);
    } finally {
      // ✅ profileLoaded siempre se activa al final, sin importar el resultado
      setProfileLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
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
            .maybeSingle();
          setBusiness(bData ?? null);
        } else {
          setBusiness(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
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
    router.replace('/screens/global/home' as any);
  }, []);

  useEffect(() => {
    // ─── Flujo 1: sesión existente al abrir la app ───────────────────────────
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('AUTH: getSession error:', error);
        if (error.message.includes('Refresh Token Not Found')) {
          await supabase.auth.signOut();
          setSession(null);
          setProfileLoaded(true);
          setLoading(false);
          return;
        }
      }

      setSession(session);

      if (session) {
        fetchedRef.current = true;
        await fetchProfile(session.user.id);
      } else {
        setProfileLoaded(true);
      }

      setLoading(false);
    }).catch(err => {
      console.error('AUTH: getSession catch:', err);
      setProfileLoaded(true);
      setLoading(false);
    });

    // ─── Flujo 2: cambios de sesión en tiempo real (login, logout, refresh) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (_event === 'SIGNED_OUT') {
        setProfile(null);
        setBusiness(null);
        setProfileLoaded(false);
        fetchedRef.current = false;
        // loading ya debería estar en false, pero lo aseguramos
        setLoading(false);
      } else if (session && !fetchedRef.current) {
        fetchedRef.current = true;
        setProfileLoaded(false);
        setLoading(true);
        await fetchProfile(session.user.id);
        setLoading(false);
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