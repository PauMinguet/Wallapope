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
    const sortBy = url.searchParams.get('sortBy') || 'discount'
    const minYear = url.searchParams.get('minYear')
    
    // Fixed values
    const ITEMS_PER_PAGE = 25
    const TOTAL_ITEMS = 100
    const offset = (page - 1) * ITEMS_PER_PAGE


    // Build the query based on sort parameter
    let query = supabase
      .from('modo_rapido_listings')
      .select('*')

    // Apply minimum year filter if provided
    if (minYear) {
      query = query.gte('year', parseInt(minYear))
    }

    // Add appropriate ordering based on sortBy parameter
    switch (sortBy) {
      case 'distance':
        query = query.order('distance', { ascending: true })
        break
      case 'percentage':
        // We'll sort by percentage after fetching
        query = query.order('created_at', { ascending: false })
        break
      case 'discount':
      default:
        query = query.order('price_difference', { ascending: false })
    }

    // Get exactly 100 unique listings
    const { data: listings, error } = await query
      .limit(TOTAL_ITEMS)

    if (error) {
      console.error('Error fetching modo rapido listings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ 
        listings: [], 
        total: 0,
        page: 1,
        totalPages: 1
      })
    }

    // Remove duplicates based on listing_id
    const uniqueListings = listings.filter((listing, index, self) =>
      index === self.findIndex((l) => l.listing_id === listing.listing_id)
    )

    // Sort by percentage if that's the selected sort option
    if (sortBy === 'percentage') {
      uniqueListings.sort((a, b) => {
        const percentA = parseFloat(a.price_difference_percentage.replace('%', ''))
        const percentB = parseFloat(b.price_difference_percentage.replace('%', ''))
        return percentB - percentA // Descending order
      })
    }

    // Get the page slice
    const paginatedListings = uniqueListings.slice(offset, offset + ITEMS_PER_PAGE)

    return NextResponse.json({
      listings: paginatedListings,
      total: uniqueListings.length,
      page,
      totalPages: Math.ceil(uniqueListings.length / ITEMS_PER_PAGE)
    })

  } catch (error) {
    console.error('Error in car-listings endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 