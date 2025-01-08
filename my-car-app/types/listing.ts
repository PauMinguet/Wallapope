export interface Listing {
  id: number
  search_id: number
  url: string
  title: string
  price: number
  price_text: string
  price_difference: number
  location: string
  description: string
  year?: number
  kilometers?: number
  fuel_type?: string
  transmission?: string
  power_cv?: number
  motor?: string
  configuracion?: string
  isReserved: boolean
  vehicle_type: 'coches' | 'motos' | 'furgos'
  listing_images: Array<{ image_url: string }>
  listing_images_coches?: Array<{ image_url: string }>
  listing_images_motos?: Array<{ image_url: string }>
  listing_images_furgos?: Array<{ image_url: string }>
  searches: {
    model: string
    marca: string
    vehicle_type: string
    search_url: string
  }
}

