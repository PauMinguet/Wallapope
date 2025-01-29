import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing required environment variables')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    // Get all listings from modo_rapido_listings
    const { data: listings, error } = await supabase
      .from('modo_rapido_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      console.error('Error fetching modo rapido listings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ listings: [], total: 0 })
    }

    // Remove duplicates based on listing_id
    const uniqueListings = listings.filter((listing, index, self) =>
      index === self.findIndex((l) => l.listing_id === listing.listing_id)
    )

    // Sort by price difference by default
    const sortedListings = uniqueListings.sort((a, b) => Math.abs(b.price_difference) - Math.abs(a.price_difference))

    // Apply pagination
    const paginatedListings = sortedListings.slice(offset, offset + limit)
    const total = sortedListings.length

    return NextResponse.json({
      listings: paginatedListings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error in car-listings endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 