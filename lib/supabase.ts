import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

export const supabaseUrl = 'https://qkciuhruwwrsikmkhlqm.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2l1aHJ1d3dyc2lrbWtobHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjc2OTEsImV4cCI6MjA5Mjg0MzY5MX0.s8IgScQ-79kZTtA1Mx7XLVjUcNI-W_fbkJw-M7xtOIY'

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
