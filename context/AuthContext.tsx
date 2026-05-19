import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type Profile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  role: 'client' | 'company' | 'admin' | 'worker' | null;
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
  signInWithGoogle: () => Promise<void>;
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
  signInWithGoogle: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    console.log('AUTH: fetchProfile START → userId:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('AUTH: profiles query → role:', data?.role ?? null, '| error:', error?.message ?? null);

      if (data) {
        let finalRole = data.role;
        if (!finalRole || finalRole === 'client') {
          const { data: workerCheck } = await supabase
            .from('workers')
            .select('id, business_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (workerCheck) {
            console.log('AUTH: User registered in workers table, auto-assigning role: worker');
            await supabase.from('profiles').update({ role: 'worker' }).eq('id', userId);
            data.role = 'worker';
            finalRole = 'worker';
          }
        }

        setProfile(data);

        if (finalRole === 'company') {
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
        } else if (data.role === 'worker') {
          console.log('AUTH: Fetching business for worker user...');
          // Suponemos que el worker tiene un registro en la tabla `workers` que vincula a un business
          const { data: workerData, error: wError } = await supabase
            .from('workers')
            .select('business_id')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (workerData?.business_id) {
            const { data: bData } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', workerData.business_id)
              .maybeSingle();
            setBusiness(bData ?? null);
          } else {
            setBusiness(null);
          }
          if (wError) console.error('AUTH: Error fetching worker data:', wError);
        } else {
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
      console.log('AUTH: fetchProfile FINALLY → loading=false, profileLoaded=true');
      setProfileLoaded(true);
      setLoading(false);
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
        let finalRole = profileData.role;
        if (!finalRole || finalRole === 'client') {
          const { data: workerCheck } = await supabase
            .from('workers')
            .select('id, business_id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (workerCheck) {
            console.log('AUTH: User registered in workers table, auto-assigning role: worker');
            await supabase.from('profiles').update({ role: 'worker' }).eq('id', data.user.id);
            profileData.role = 'worker';
            finalRole = 'worker';
          }
        }

        setProfile(profileData);

        if (finalRole === 'company') {
          const { data: bData } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', data.user.id)
            .maybeSingle();
          setBusiness(bData ?? null);
        } else if (profileData.role === 'worker') {
          const { data: workerData } = await supabase
            .from('workers')
            .select('business_id')
            .eq('user_id', data.user.id)
            .maybeSingle();
          if (workerData?.business_id) {
            const { data: bData } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', workerData.business_id)
              .maybeSingle();
            setBusiness(bData ?? null);
          } else {
            setBusiness(null);
          }
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

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Platform.OS === 'web'
      ? undefined
      : makeRedirectUri({ scheme: 'myapp', path: 'auth/callback' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) throw error;

    if (Platform.OS !== 'web' && data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo!);
      if (result.type === 'success') {
        const fragment = result.url.split('#')[1] ?? '';
        const query = result.url.split('?')[1] ?? '';
        const params = new URLSearchParams(fragment || query);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      console.log('AUTH: onAuthStateChange event:', event);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setBusiness(null);
        setProfileLoaded(false);
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);

        if (newSession?.user) {
          setLoading(true);
          // ✅ setTimeout saca el fetch del hilo interno de Supabase,
          // evitando que el await quede colgado en el bundle de producción.
          setTimeout(() => {
            if (mounted) fetchProfile(newSession.user.id);
          }, 0);
        } else {
          // Sin sesión activa (usuario no logueado)
          setProfileLoaded(true);
          setLoading(false);
        }
        return;
      }

      // USER_UPDATED, PASSWORD_RECOVERY, etc.
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    signInWithGoogle,
  }), [session, profile, business, loading, profileLoaded, refreshProfile, updateProfileState, signOut, signInWithGoogle]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);