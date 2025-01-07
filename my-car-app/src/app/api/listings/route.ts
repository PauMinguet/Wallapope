import { NextResponse } from 'next/server'
import { supabase } from '../../../../utils/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images (
        image_url,
        image_order
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

