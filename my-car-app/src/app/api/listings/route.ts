import { NextResponse } from 'next/server'
import { supabase } from '../../../../utils/supabase'

export async function GET() {
  // First get all cars with their target prices
  const { data: cars, error: carsError } = await supabase
    .from('coches')
    .select('modelo, precio_compra')

  if (carsError) {
    return NextResponse.json({ error: carsError.message }, { status: 500 })
  }

  // Get listings with their images and search model and vehicle_type
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select(`
      *,
      listing_images (
        image_url,
        image_order
      ),
      searches (
        model,
        vehicle_type
      )
    `)
    .order('created_at', { ascending: false })  // Get most recent first

  if (listingsError) {
    console.error('Listings error:', listingsError)
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  // Debug log
  console.log('Total listings:', listings?.length)
  console.log('Listings with vehicle types:', listings?.map(l => ({
    title: l.title,
    vehicle_type: l.searches?.vehicle_type,
    price: l.price
  })))

  // Create a map of model to target price
  const targetPrices = new Map(cars.map(car => {
    const minPrice = parseFloat(
      car.precio_compra
        .split('-')[0]
        .replace('€', '')
        .replace('.', '')
        .replace(',', '.')
        .trim()
    )
    return [car.modelo, minPrice]
  }))

  // Calculate price differences and sort
  const listingsWithDiff = listings
    .map(listing => {
      let targetPrice = 0
      
      // If it's a scooter, use 900 as reference price
      if (listing.searches?.vehicle_type === 'scooter') {
        targetPrice = 900
      } else {
        // Otherwise use the car's target price
        const searchModel = listing.searches?.model
        targetPrice = searchModel ? targetPrices.get(searchModel) || 0 : 0
      }

      const priceDiff = targetPrice - (listing.price || 0)
      
      // Debug log for price calculations
      console.log('Listing calculation:', {
        title: listing.title,
        type: listing.searches?.vehicle_type,
        price: listing.price,
        targetPrice,
        priceDiff
      })

      return {
        ...listing,
        price_difference: priceDiff
      }
    })
    .sort((a, b) => b.price_difference - a.price_difference)

  // Debug log final sorted results
  console.log('Sorted listings:', listingsWithDiff.map(l => ({
    title: l.title,
    type: l.searches?.vehicle_type,
    price: l.price,
    diff: l.price_difference
  })))

  return NextResponse.json(listingsWithDiff)
}

