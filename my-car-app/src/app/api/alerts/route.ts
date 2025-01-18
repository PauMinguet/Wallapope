import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req)
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // First get the user's email from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const { data, error } = await supabase
      .from('alertas')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return new NextResponse('Error fetching alerts', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req)
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // First get the user's email from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const body = await req.json()
    // Remove any user-related fields from the body
    const {...alertData } = body

    const { data, error } = await supabase
      .from('alertas')
      .insert({
        ...alertData,
        user_id: userData.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating alert:', error)
    return new NextResponse('Error creating alert', { status: 500 })
  }
} 