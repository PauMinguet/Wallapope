import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const { carRequestId, listingUrl, liked } = await request.json()

    if (!carRequestId || !listingUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (liked) {
      // Add like
      const { error } = await supabase
        .from('liked_cars')
        .insert([
          { car_request_id: carRequestId, listing_url: listingUrl }
        ])

      if (error) {
        // Ignore unique constraint violations (already liked)
        if (error.code !== '23505') {
          throw error
        }
      }
    } else {
      // Remove like
      const { error } = await supabase
        .from('liked_cars')
        .delete()
        .match({ car_request_id: carRequestId, listing_url: listingUrl })

      if (error) {
        throw error
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json(
      { error: 'Error saving like' },
      { status: 500 }
    )
  }
} 