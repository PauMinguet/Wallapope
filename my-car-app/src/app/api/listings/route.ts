import { NextResponse } from 'next/server'
import { supabase } from '../../../../utils/supabase'

type VehicleType = 'coches' | 'motos' | 'furgos'

interface BaseVehicle {
  id: number
  modelo: string
}

interface Coche extends BaseVehicle {
  precio_compra: string
}

interface Moto extends BaseVehicle {
  model: string
  price_range: string
}

interface Furgo extends BaseVehicle {
  configuracion: string
  motor: string
  precio: string
}

interface Listing {
  title: string
  description: string
  price: number
  searches?: {
    model: string
  }
  configuracion?: string
  motor?: string
  listing_images_coches?: Array<{ image_url: string }>
  listing_images_motos?: Array<{ image_url: string }>
  listing_images_furgos?: Array<{ image_url: string }>
  [key: string]: any
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const vehicleType = (searchParams.get('type') || 'coches') as VehicleType

  const { data: targetData, error: targetError } = await supabase
    .from(vehicleType)
    .select('*')

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 })
  }

  const { data: listings, error: listingsError } = await supabase
    .from(`listings_${vehicleType}`)
    .select(`
      *,
      listing_images_${vehicleType} (
        image_url,
        image_order
      ),
      searches (
        model,
        marca,
        vehicle_type,
        search_url
      )
    `)
    .order('created_at', { ascending: false })

  if (listingsError) {
    console.error('Listings error:', listingsError)
    return NextResponse.json({ error: listingsError.message }, { status: 500 })
  }

  const filteredListings = (listings as Listing[]).filter(listing => {
    const lowerTitle = listing.title.toLowerCase()
    const lowerDesc = (listing.description || '').toLowerCase()
    const unwantedKeywords = ['accidentado', 'accidente', 'despiece', 'reparar']
    
    return !unwantedKeywords.some(keyword => 
      lowerTitle.includes(keyword) || lowerDesc.includes(keyword)
    )
  })

  const targetPrices = new Map(
    (targetData as (Coche | Moto | Furgo)[]).map(item => {
      if (vehicleType === 'coches') {
        const car = item as Coche
        const price = parseFloat(car.precio_compra.split('-')[0].replace('€', '').replace('.', '').replace(',', '.').trim())
        return [car.modelo, price] as const
      } 
      
      if (vehicleType === 'motos') {
        const moto = item as Moto
        const [min, max] = moto.price_range.split('-').map(p => 
          parseFloat(p.replace('€', '').replace('.', '').replace(',', '').trim())
        )
        return [moto.model, (min + max) / 2] as const
      } 
      
      if (vehicleType === 'furgos') {
        const van = item as Furgo
        const [min, max] = van.precio.split('-').map(p => 
          parseFloat(p.replace('€', '').replace('.', '').replace(',', '').trim())
        )
        return [`${van.modelo}-${van.configuracion}-${van.motor}`, (min + max) / 2] as const
      }
      
      return ['', 0] as const
    })
  )

  const listingsWithDiff = filteredListings
    .map(listing => {
      const isReserved = listing.title.toLowerCase().startsWith('reservado')
      const cleanTitle = isReserved 
        ? listing.title.replace(/^reservado\s+/i, '')
        : listing.title

      let targetPrice = 0
      if (vehicleType === 'furgos') {
        const key = `${listing.searches?.model || ''}-${listing.configuracion || ''}-${listing.motor || ''}`
        targetPrice = targetPrices.get(key) || 0
      } else {
        targetPrice = targetPrices.get(listing.searches?.model || '') || 0
      }

      return {
        ...listing,
        title: cleanTitle,
        isReserved,
        price_difference: targetPrice - (listing.price || 0),
        vehicle_type: vehicleType
      }
    })
    .sort((a, b) => b.price_difference - a.price_difference)

  const listingsWithFormattedImages = listingsWithDiff.map(listing => ({
    ...listing,
    listing_images: listing[`listing_images_${vehicleType}`] || []
  }))

  return NextResponse.json(listingsWithFormattedImages)
}

