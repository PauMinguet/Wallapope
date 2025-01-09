export interface BaseListing {
  id: number
  title: string
  description: string
  price: number
  price_text: string
  location: string
  searches?: {
    model: string
  }
}

export interface ScooterListing extends BaseListing {
  engine_cc: number
  listing_images_scooters: Array<{ image_url: string }>
}

export interface Listing extends BaseListing {
  search_id: number
  url: string
  price_difference: number
  year?: number
  kilometers?: number
  fuel_type?: string
  transmission?: string
  power_cv?: number
  motor?: string
  configuracion?: string
  engine_cc?: number
  isReserved: boolean
  vehicle_type: 'coches' | 'motos' | 'furgos' | 'scooters'
  listing_images: Array<{ image_url: string }>
  listing_images_coches?: Array<{ image_url: string }>
  listing_images_motos?: Array<{ image_url: string }>
  listing_images_furgos?: Array<{ image_url: string }>
  listing_images_scooters?: Array<{ image_url: string }>
  searches: {
    model: string
    marca: string
    vehicle_type: string
    search_url: string
  }
}

