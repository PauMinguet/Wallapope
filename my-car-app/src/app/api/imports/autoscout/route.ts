import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ImportListing } from '@/app/components/ImportListingGrid'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function GET() {
  try {
    // First get all runs ordered by creation date
    const { data: runs, error: runsError } = await supabase
      .from('autoscout_runs')
      .select('*')
      .order('created_at', { ascending: false })

    if (runsError) throw runsError

    // For each run, get its listings
    const runsWithListings = await Promise.all(
      runs.map(async (run) => {
        const { data: listings, error: listingsError } = await supabase
          .from('autoscout_listings')
          .select('*')
          .eq('run_id', run.id)
          .order('total_cost', { ascending: true })

        if (listingsError) throw listingsError

        // Transform listings to match ImportListing interface
        const transformedListings: ImportListing[] = listings.map(listing => ({
          id: listing.id.toString(),
          title: listing.version_name,
          price_chf: listing.price_chf,
          price_eur: listing.price_eur,
          import_fee: listing.import_fee,
          emissions_tax: listing.emissions_tax,
          emissions_tax_percentage: listing.emissions_tax_percentage,
          co2_emissions: listing.co2_emissions,
          total_cost: listing.total_cost,
          location: listing.seller_city,
          year: listing.registration_year,
          kilometers: listing.mileage,
          fuel_type: listing.fuel_type,
          transmission: listing.transmission_type,
          url: listing.listing_url,
          horsepower: listing.horse_power,
          boe_precio: run.precio_boe,
          listing_images: listing.images.map((url: string) => ({ image_url: url }))
        }))

        return {
          ...run,
          listings: transformedListings
        }
      })
    )

    return NextResponse.json(runsWithListings)
  } catch (error) {
    console.error('Error fetching AutoScout data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AutoScout data' },
      { status: 500 }
    )
  }
} 