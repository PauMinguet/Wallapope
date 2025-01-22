import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = getAuth(request)
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Error fetching user:', error)
    return new NextResponse('Error fetching user', { status: 500 })
  }
} 