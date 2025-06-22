import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Mock server client that uses the same client-side implementation
// This removes the dependency on next/headers for solo operator usage
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Disable session persistence for server-side usage
      autoRefreshToken: false, // Disable auto refresh for server-side usage
    },
  })
}