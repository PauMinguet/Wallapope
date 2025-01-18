import { createClient } from '@supabase/supabase-js'

// Log environment variables (without exposing sensitive data)
console.log('Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_KEY)

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function syncUser(user: {
  id: string
  firstName?: string | null
  lastName?: string | null
  emailAddresses: Array<{ emailAddress: string }>
}) {
  const email = user.emailAddresses[0]?.emailAddress
  if (!email) {
    console.error('No email found for user')
    return
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  try {
    const { error } = await supabase
      .from('users')
      .upsert(
        {
          email,
          full_name: fullName,
          clerk_id: user.id,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'clerk_id',
          ignoreDuplicates: false
        }
      )

    if (error) {
      console.error('Error syncing user:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in syncUser:', error)
    throw error
  }
}

export async function getCurrentUser(clerkId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

export async function updateUserProfile(clerkId: string, updates: Partial<{
  full_name: string
  phone: string
}>) {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('clerk_id', clerkId)

  if (error) {
    console.error('Error updating user:', error)
    throw error
  }
} 