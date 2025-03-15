import { NextResponse, NextRequest } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { currentUser } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      )
    }

    // Get user email
    const email = user.emailAddresses[0]?.emailAddress
    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // Sync with users table
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    const { data: userData, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          email,
          full_name: fullName,
          clerk_id: userId,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'clerk_id',
          ignoreDuplicates: false
        }
      )
      .select('id, email')
      .single()

    if (upsertError) throw upsertError
    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to sync user' },
        { status: 500 }
      )
    }

    const {
      brand,
      model,
      engine,
      gearbox,
      min_year,
      max_year,
      max_kilometers,
      min_horse_power,
      max_price,
      description
    } = await req.json()

    // Convert empty strings to null for numeric fields
    const processedData = {
      user_id: userData.id, // Use the custom users table ID which is a proper UUID
      email: userData.email,
      brand,
      model,
      engine,
      gearbox,
      min_year: min_year === '' ? null : parseInt(min_year),
      max_year: max_year === '' ? null : parseInt(max_year),
      max_kilometers: max_kilometers === '' ? null : parseInt(max_kilometers),
      min_horse_power: min_horse_power === '' ? null : parseInt(min_horse_power),
      max_price: max_price === '' ? null : parseInt(max_price),
      description: description || null // Description is optional
    }

    // Insert into database
    const { data: result, error } = await supabase
      .from('car_requests')
      .insert(processedData)
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      requestId: result.id 
    })

  } catch (error) {
    console.error('Error creating car request:', error)
    return NextResponse.json(
      { 
        error: 'Error al crear la solicitud de coche', 
        details: error 
      },
      { status: 500 }
    )
  }
} 