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

interface Listing {
  id: string
  title: string
  price: number
  price_text: string
  price_difference: number
  price_difference_percentage: string
  market_price: number
  market_price_text: string
  location: string
  year: number
  kilometers: number
  fuel_type: string
  transmission: string
  url: string
  listing_images: Array<{ image_url: string }>
}

interface Run {
  listings: Listing[]
  created_at: string
}

export async function GET() {
  try {
    // Get all runs from modo_rapido_runs
    const { data: runs, error } = await supabase
      .from('modo_rapido_runs')
      .select('listings, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching modo rapido runs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!runs || runs.length === 0) {
      return NextResponse.json([])
    }

    // Merge all listings from all runs
    const allListings = runs.reduce<Listing[]>((acc, run: Run) => {
      const runListings = run.listings || []
      return [...acc, ...runListings]
    }, [])

    // Remove duplicates based on listing id
    const uniqueListings = allListings.filter((listing, index, self) =>
      index === self.findIndex((l) => l.id === listing.id)
    )

    // Sort by price difference by default
    const sortedListings = uniqueListings.sort((a, b) => Math.abs(b.price_difference) - Math.abs(a.price_difference))

    return NextResponse.json(sortedListings)
  } catch (error) {
    console.error('Error in car-listings endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 