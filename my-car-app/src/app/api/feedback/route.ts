import { createClient } from '@supabase/supabase-js'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const { userId } = getAuth(request)
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await request.json()
    const { email, feedback_text } = body

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        clerk_id: userId,
        email,
        feedback_text,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return new NextResponse('Error submitting feedback', { status: 500 })
  }
} 