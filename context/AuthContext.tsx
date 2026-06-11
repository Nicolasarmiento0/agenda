import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform, Linking } from 'react-native';
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
  category_name?: string | null;
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
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      const defaultNickname = email ? email.split('@')[0] : '';

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('AUTH: profiles query → role:', data?.role ?? null, '| error:', error?.message ?? null);

      if (data) {
        let finalRole = data.role;
        let profileData = { ...data };

        // Si no tiene nickname, lo completamos con la parte del correo
        if (!data.nickname && defaultNickname) {
          console.log('AUTH: Profile has no nickname. Setting to default:', defaultNickname);
          const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ nickname: defaultNickname })
            .eq('id', userId)
            .select()
            .single();

          if (!updateError && updateData) {
            profileData = updateData;
          }
        }

        if (!finalRole || finalRole === 'client') {
          const { data: workerCheck } = await supabase
            .from('workers')
            .select('id, business_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (workerCheck) {
            console.log('AUTH: User registered in workers table, auto-assigning role: worker');
            await supabase.from('profiles').update({ role: 'worker' }).eq('id', userId);
            profileData.role = 'worker';
            finalRole = 'worker';
          }
        }

        setProfile(profileData);

        if (finalRole === 'company') {
          console.log('AUTH: Fetching business for company user...');
          const { data: bRaw, error: bError } = await supabase
            .from('businesses')
            .select('*, service_categories(name)')
            .eq('owner_id', userId)
            .maybeSingle();

          if (bRaw) {
            console.log('AUTH: Business found:', bRaw.id, '| Status:', bRaw.status);
            const { service_categories, ...bData } = bRaw as any;
            setBusiness({ ...bData, category_name: service_categories?.name ?? null });
          } else {
            console.log('AUTH: No business found for this company user');
            setBusiness(null);
          }
          if (bError) console.error('AUTH: Error fetching business:', bError);
        } else if (profileData.role === 'worker') {
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
        
        // Si no existe el perfil (por ejemplo, registro OAuth), lo creamos con el defaultNickname
        if (defaultNickname) {
          console.log('AUTH: Creating default profile for new user...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              nickname: defaultNickname,
              role: 'client'
            })
            .select()
            .single();

          if (!createError && newProfile) {
            setProfile(newProfile);
            setBusiness(null);
            return;
          } else if (createError) {
            console.error('AUTH: Error creating default profile:', createError.message);
          }
        }

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

      const email = data.user.email || '';
      const defaultNickname = email ? email.split('@')[0] : '';

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileData) {
        let finalRole = profileData.role;
        let updatedProfile = { ...profileData };

        if (!profileData.nickname && defaultNickname) {
          const { data: updatedData } = await supabase
            .from('profiles')
            .update({ nickname: defaultNickname })
            .eq('id', data.user.id)
            .select()
            .single();

          if (updatedData) {
            updatedProfile = updatedData;
          }
        }

        if (!finalRole || finalRole === 'client') {
          const { data: workerCheck } = await supabase
            .from('workers')
            .select('id, business_id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (workerCheck) {
            console.log('AUTH: User registered in workers table, auto-assigning role: worker');
            await supabase.from('profiles').update({ role: 'worker' }).eq('id', data.user.id);
            updatedProfile.role = 'worker';
            finalRole = 'worker';
          }
        }

        setProfile(updatedProfile);

        if (finalRole === 'company') {
          const { data: bRaw } = await supabase
            .from('businesses')
            .select('*, service_categories(name)')
            .eq('owner_id', data.user.id)
            .maybeSingle();
          if (bRaw) {
            const { service_categories, ...bData } = bRaw as any;
            setBusiness({ ...bData, category_name: service_categories?.name ?? null });
          } else {
            setBusiness(null);
          }
        } else if (updatedProfile.role === 'worker') {
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
    const webUrl = Platform.OS === 'web'
      ? window.location.origin
      : (process.env.EXPO_PUBLIC_WEB_URL || 'https://nucoraapp.vercel.app');

    const redirectTo = webUrl;

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
      // Redirigir directamente al navegador externo del sistema móvil
      await Linking.openURL(data.url);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
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

      // TOKEN_REFRESHED: the profile hasn't changed — only update the JWT in memory.
      // Setting loading=true here was the root cause of the navigation reset on app resume.
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        setSession(newSession);

        if (newSession?.user) {
          setLoading(true);
          // setTimeout moves the fetch off Supabase's internal event thread,
          // preventing await from hanging in production bundles.
          setTimeout(() => {
            if (mounted) fetchProfile(newSession.user.id);
          }, 0);
        } else {
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