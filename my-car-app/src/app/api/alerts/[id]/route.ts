import { NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const id = request.nextUrl.pathname.split('/').pop()

    // First get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    // Get the specific alert
    const { data: alert, error: alertError } = await supabase
      .from('alertas')
      .select('*')
      .eq('id', id)
      .single()

    if (alertError) throw alertError
    if (!alert) return new NextResponse('Alert not found', { status: 404 })

    // Verify the alert belongs to the user
    if (alert.user_id !== userData.id) {
      return new NextResponse('Unauthorized', { status: 403 })
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Error fetching alert:', error)
    return new NextResponse('Error fetching alert', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const id = request.nextUrl.pathname.split('/').pop()

    // First get the user's data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const body = await request.json()
    // Remove any user-related fields from the body
    const { ...alertData } = body

    // Verify the alert belongs to the user
    const { data: existingAlert, error: alertError } = await supabase
      .from('alertas')
      .select('user_id')
      .eq('id', id)
      .single()

    if (alertError) throw alertError
    if (!existingAlert) return new NextResponse('Alert not found', { status: 404 })
    if (existingAlert.user_id !== userData.id) return new NextResponse('Unauthorized', { status: 403 })

    const { data, error } = await supabase
      .from('alertas')
      .update({
        ...alertData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating alert:', error)
    return new NextResponse('Error updating alert', { status: 500 })
  }
}