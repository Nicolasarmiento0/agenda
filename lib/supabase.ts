import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const isBrowser = typeof window !== 'undefined'

const webStorage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(isBrowser ? localStorage.getItem(key) : null),
      setItem: (key: string, value: string) => Promise.resolve(isBrowser ? localStorage.setItem(key, value) : undefined),
      removeItem: (key: string) => Promise.resolve(isBrowser ? localStorage.removeItem(key) : undefined),
    }
  : AsyncStorage

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
