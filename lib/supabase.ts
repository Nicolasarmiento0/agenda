import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import { secureStorageAdapter } from './secureStorageAdapter'

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

const isBrowser = typeof window !== 'undefined'

const sessionStorageAdapter = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(isBrowser ? localStorage.getItem(key) : null),
      setItem: (key: string, value: string) => Promise.resolve(isBrowser ? localStorage.setItem(key, value) : undefined),
      removeItem: (key: string) => Promise.resolve(isBrowser ? localStorage.removeItem(key) : undefined),
    }
  : secureStorageAdapter

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
