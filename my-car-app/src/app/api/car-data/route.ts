import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const brandId = searchParams.get('brandId')

  try {
    if (type === 'brands') {
      console.log('Fetching brands...')
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .order('name')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Brands fetched successfully:', data?.length || 0, 'brands')
      return NextResponse.json(data)
    }

    if (type === 'models' && brandId) {
      console.log('Fetching models for brand:', brandId)
      const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .eq('marca_id', brandId)
        .order('nome')

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Models fetched successfully:', data?.length || 0, 'models')
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Error fetching data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 