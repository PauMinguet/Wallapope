import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const getSupabaseClient = () => {
  // Only run on the client side
  if (typeof window === 'undefined') {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export const createClient = () => {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase client can only be created in the browser')
  }
  return client
} 