'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select,
  SelectChangeEvent,
  MenuItem,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Box,
  Autocomplete,
  Slider,
  Menu,
  Paper,
  Chip,
  Skeleton
} from '@mui/material'
import { DirectionsCar, MyLocation, Notifications } from '@mui/icons-material'
import 'leaflet/dist/leaflet.css'
import ListingSkeleton from '../components/ListingSkeleton'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'

// Move MapComponent dynamic import to the top
const MapComponent = dynamic(
  () => import('../components/MapComponent'),
  { 
    ssr: false,
    loading: () => null
  }
)

// Spain's center coordinates
const SPAIN_CENTER = {
  lat: 40.4637,
  lng: -3.7492
}

interface Brand {
  id: number
  name: string
}

interface Model {
  id: number
  marca_id: number
  nome: string
}

interface ApiImage {
  original: string
  large: string
  medium: string
  small: string
  xsmall: string
  xlarge: string
  original_width: number
  original_height: number
}

interface ApiLocation {
  postal_code: string
  city: string
  country_code: string
}

interface ApiListingContent {
  id: string
  title: string
  storytelling: string
  price: number
  currency: string
  web_slug: string
  year: number
  km: number
  engine: string
  gearbox: string
  horsepower: number
  distance: number
  images: ApiImage[]
  location: ApiLocation
}

interface ApiListing {
  id: string
  type: string
  content: ApiListingContent
}

interface SearchFormData {
  brand: string
  model: string
  min_year: string
  max_year: string
  engine: string
  min_horse_power: string
  gearbox: string
  order_by: string
  latitude: number | null
  longitude: number | null
  distance: number
  location_text: string
  max_kilometers: number
}

interface SearchResult {
  listings: Array<{
    id: string
    title: string
    price: number
    price_text: string
    market_price: number
    market_price_text: string
    price_difference: number
    price_difference_percentage: string
    location: string
    year: number
    kilometers: number
    fuel_type: string
    transmission: string
    url: string
    horsepower: number
    distance: number
    listing_images: Array<{
      image_url: string
    }>
  }>
  suggested_listings?: Array<ApiListing>
  market_data?: {
    average_price: number
    average_price_text: string
    median_price: number
    median_price_text: string
    min_price: number
    min_price_text: string
    max_price: number
    max_price_text: string
    total_listings: number
    valid_listings: number
  }
  filtered_results: number
  total_results: number
  success: boolean
  search_parameters: Record<string, string>
  url: string
}

const initialFormData: SearchFormData = {
  brand: '',
  model: '',
  min_year: '',
  max_year: '',
  engine: '',
  min_horse_power: '',
  gearbox: '',
  order_by: 'price_low_to_high',
  latitude: null,
  longitude: null,
  distance: 100,
  location_text: '',
  max_kilometers: 100000
}

const distanceMarks = [
  { value: 0, label: '0' },
  { value: 20, label: '20' },
  { value: 40, label: '40' },
  { value: 60, label: '60' },
  { value: 80, label: '80' },
  { value: 100, label: '100' },
  { value: 120, label: '120' },
  { value: 140, label: '140' },
  { value: 160, label: '160' },
  { value: 180, label: '180' },
  { value: 200, label: '200' },
  { value: 300, label: '300' },
  { value: 400, label: '400' },
  { value: 500, label: 'No limit' }
]

const kilometerMarks = [
  { value: 0, label: '0' },
  { value: 20000, label: '20k' },
  { value: 40000, label: '40k' },
  { value: 60000, label: '60k' },
  { value: 80000, label: '80k' },
  { value: 100000, label: '100k' },
  { value: 120000, label: '120k' },
  { value: 140000, label: '140k' },
  { value: 160000, label: '160k' },
  { value: 180000, label: '180k' },
  { value: 200000, label: '200k' },
  { value: 220000, label: '220k' },
  { value: 240000, label: 'No limit' }
]

type SuggestionCategory = {
  listings: ApiListing[];
  label: string;
};

// Add interface for search parameters
interface SearchParameters {
  max_kilometers?: number;
  min_year?: number;
  distance?: number;
}

function categorizeSuggestedListings(
  suggestedListings: ApiListing[],
  originalParams: SearchParameters
): Record<string, SuggestionCategory> {
  const categories: Record<string, SuggestionCategory> = {};
  
  suggestedListings.forEach(listing => {
    const content = listing.content;
    
    // Check for higher kilometers
    if (originalParams.max_kilometers && content.km > originalParams.max_kilometers) {
      if (!categories.kilometers) {
        categories.kilometers = {
          listings: [],
          label: 'resultados más con 10% más kms'
        };
      }
      categories.kilometers.listings.push(listing);
    }
    
    // Check for older year
    if (originalParams.min_year && content.year < originalParams.min_year) {
      if (!categories.year) {
        categories.year = {
          listings: [],
          label: `resultados más del ${content.year}`
        };
      }
      categories.year.listings.push(listing);
    }
    
    // Check for greater distance
    const listingDistance = content.distance / 1000; // Convert to km
    if (originalParams.distance && listingDistance > originalParams.distance) {
      if (!categories.distance) {
        categories.distance = {
          listings: [],
          label: 'resultados más a mayor distancia'
        };
      }
      categories.distance.listings.push(listing);
    }
  });
  
  // Update labels with correct counts
  if (categories.kilometers) {
    categories.kilometers.label = `${categories.kilometers.listings.length} ${categories.kilometers.label}`;
  }
  if (categories.year) {
    categories.year.label = `${categories.year.listings.length} ${categories.year.label}`;
  }
  if (categories.distance && originalParams.distance) {
    const maxDistance = Math.max(...categories.distance.listings.map(l => l.content.distance / 1000));
    const extraDistance = Math.round(maxDistance - originalParams.distance);
    categories.distance.label = `${categories.distance.listings.length} resultados más a ${extraDistance}km más de distancia`;
  }
  
  return categories;
}

export default function SearchPage() {
  const [formData, setFormData] = useState<SearchFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const yearOptions = Array.from({ length: 36 }, (_, i) => (2025 - i).toString())
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [selectedSuggestionCategory, setSelectedSuggestionCategory] = useState<string | null>(null)
  const [suggestionCategories, setSuggestionCategories] = useState<Record<string, SuggestionCategory>>({})
  
  const handleSubscriptionClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleSubscriptionClose = () => {
    setAnchorEl(null)
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id.toString())
    } else {
      setModels([])
    }
  }, [selectedBrand])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/car-data?type=brands')
      if (!response.ok) throw new Error('Failed to fetch brands')
      const data = await response.json()
      setBrands(data || [])
    } catch (err) {
      console.error('Error fetching brands:', err)
      setError('Error cargando las marcas')
    } finally {
      setLoadingBrands(false)
    }
  }

  const fetchModels = async (brandId: string) => {
    setLoadingModels(true)
    try {
      const response = await fetch(`/api/car-data?type=models&brandId=${brandId}`)
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      setModels(data || [])
    } catch (err) {
      console.error('Error fetching models:', err)
      setError('Error cargando los modelos')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Reset model when brand changes
        ...(name === 'brand' ? { model: '' } : {})
      }))
    }
  }

  const handleBrandChange = (event: React.SyntheticEvent | null, newValue: Brand | null) => {
    setSelectedBrand(newValue)
    setSelectedModel(null)
    setFormData(prev => ({
      ...prev,
      brand: newValue ? newValue.name : '',
      model: '' // Reset model when brand changes
    }))
  }

  const handleModelChange = (event: React.SyntheticEvent | null, newValue: Model | null) => {
    setSelectedModel(newValue)
    setFormData(prev => ({
      ...prev,
      model: newValue ? newValue.nome : ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    console.log('Submitting form data:', formData)
    
    try {
      // Convert numeric fields to numbers
      const searchParams = {
        ...formData,
        min_year: formData.min_year ? parseInt(formData.min_year) : undefined,
        max_year: formData.max_year ? parseInt(formData.max_year) : undefined,
        min_horse_power: formData.min_horse_power ? parseInt(formData.min_horse_power) : undefined,
        max_kilometers: formData.max_kilometers
      }

      // Remove empty fields from the request
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => 
          value !== '' && 
          value !== undefined && 
          value !== null
        )
      )

      console.log('Sending request with params:', cleanParams)

      const response = await fetch(`${BACKEND_URL}/api/search-single-car`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanParams)
      })

      const data = await response.json()
      console.log('=== API Response ===')
      console.log('Status:', response.status)
      console.log('Raw response:', data)
      console.log('Raw market data:', data.market_data)
      console.log('===================')
      
      if (data.error) {
        setError(data.error)
      } else {
        // Transform the listings to match our frontend format
        const marketData = data.market_data || {}
        const marketPrice = marketData.average_price || 0
        console.log('Market price:', marketPrice)
        console.log('Raw market data:', marketData)
        
        const transformedData: SearchResult = {
          success: data.success,
          filtered_results: data.filtered_results,
          total_results: data.total_results,
          search_parameters: data.search_parameters,
          url: data.search_url,
          market_data: marketData ? {
            average_price: marketData.average_price || 0,
            average_price_text: formatPrice(marketData.average_price || 0),
            median_price: marketData.median_price || 0,
            median_price_text: formatPrice(marketData.median_price || 0),
            min_price: marketData.min_price || 0,
            min_price_text: formatPrice(marketData.min_price || 0),
            max_price: marketData.max_price || 0,
            max_price_text: formatPrice(marketData.max_price || 0),
            total_listings: marketData.total_listings || 0,
            valid_listings: marketData.valid_listings || 0
          } : undefined,
          listings: data.listings.map((listing: ApiListing) => {
            const price = listing.content.price
            const priceDifference = marketPrice - price
            const differencePercentage = (priceDifference / marketPrice) * 100

            return {
              id: listing.id,
              title: listing.content.title,
              description: listing.content.storytelling,
              price: price,
              price_text: formatPrice(price),
              market_price: marketPrice,
              market_price_text: formatPrice(marketPrice),
              price_difference: priceDifference,
              price_difference_percentage: `${Math.abs(differencePercentage).toFixed(1)}%`,
              location: `${listing.content.location.city}, ${listing.content.location.postal_code}`,
              year: listing.content.year,
              kilometers: listing.content.km,
              fuel_type: listing.content.engine,
              transmission: listing.content.gearbox,
              url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
              horsepower: listing.content.horsepower,
              distance: listing.content.distance,
              listing_images: listing.content.images.map((img: ApiImage) => ({
                image_url: img.large || img.original
              }))
            }
          }),
          suggested_listings: data.suggested_listings || []
        }
        
        console.log('Transformed data:', transformedData)
        console.log('Transformed market data:', transformedData.market_data)
        
        // Log suggested listings
        const suggestedListings = transformedData.suggested_listings
        if (suggestedListings && suggestedListings.length > 0) {
          console.log('=== Suggested Listings ===')
          console.log(`Found ${suggestedListings.length} suggested listings:`)
          suggestedListings.forEach((listing, index) => {
            console.log(`\nSuggested Listing ${index + 1}:`)
            console.log(`Title: ${listing.content.title}`)
            console.log(`Price: ${listing.content.price}€`)
            console.log(`Year: ${listing.content.year}`)
            console.log(`KM: ${listing.content.km}`)
            console.log(`Location: ${listing.content.location.city}`)
            console.log(`URL: https://es.wallapop.com/item/${listing.content.web_slug}`)
          })
          console.log('========================')
        }
        
        setResults(transformedData)
      }
    } catch (err) {
      setError('Failed to perform search')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_text: 'Current Location'
        }))
      },
      (error) => {
        setLocationError('Unable to retrieve your location')
        console.error('Geolocation error:', error)
      }
    )
  }

  const handleDistanceChange = (event: Event | null, newValue: number | number[]) => {
    setFormData(prev => ({
      ...prev,
      distance: newValue as number
    }))
  }

  const handleMapClick = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location_text: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }))
  }

  useEffect(() => {
    if (results?.suggested_listings && results.search_parameters) {
      const categories = categorizeSuggestedListings(results.suggested_listings, results.search_parameters);
      setSuggestionCategories(categories);
      setSelectedSuggestionCategory(null);
    }
  }, [results]);

  return (
    <Container maxWidth="lg" sx={{ 
      py: 4,
      '& .MuiCard-root': {
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8]
        }
      }
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 3,
        position: 'relative'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 3,
        }}>
          <DirectionsCar sx={{ 
            fontSize: 40, 
            color: 'primary.main',
            animation: 'float 3s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' }
            }
          }} />
          <Box>
            <Typography variant="h5" component="h1" sx={{ 
              fontWeight: 'bold',
              lineHeight: 1.2,
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Buscador de Coches
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Busca coches con análisis de precios de mercado
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          color="warning"
          onClick={handleSubscriptionClick}
          startIcon={<Notifications />}
          sx={{ 
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap'
          }}
        >
          Alertas Premium
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleSubscriptionClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Paper sx={{ p: 2, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              Planes de Suscripción
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Recibe alertas cuando aparezcan chollos que coincidan con tus criterios
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" color="primary">
                      Básico
                    </Typography>
                    <Chip label="4,99€/mes" color="primary" size="small" />
                  </Box>
                  <Typography variant="body2" paragraph>
                    • 1 búsqueda personalizada
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Alertas diarias por email
                  </Typography>
                  <Button variant="outlined" fullWidth>
                    Empezar
                  </Button>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" color="primary">
                        Pro
                      </Typography>
                      <Chip label="Popular" size="small" color="warning" />
                    </Box>
                    <Chip label="9,99€/mes" color="primary" size="small" />
                  </Box>
                  <Typography variant="body2" paragraph>
                    • 5 búsquedas personalizadas
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Alertas instantáneas por email y SMS
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Análisis detallado de precios
                  </Typography>
                  <Button variant="contained" fullWidth>
                    Empezar
                  </Button>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" color="primary">
                      Empresas
                    </Typography>
                    <Chip label="24,99€/mes" color="primary" size="small" />
                  </Box>
                  <Typography variant="body2" paragraph>
                    • Búsquedas ilimitadas
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • API de acceso
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Soporte prioritario
                  </Typography>
                  <Button variant="outlined" fullWidth>
                    Contactar
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Menu>

      </Box>

      <Card sx={{ 
        mb: 2, 
        bgcolor: 'background.paper',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4]
        }
      }}>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={brands}
                      getOptionLabel={(option) => option.name}
                      loading={loadingBrands}
                      value={selectedBrand}
                      onChange={handleBrandChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Marca"
                          variant="outlined"
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingBrands ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={models}
                      getOptionLabel={(option) => option.nome}
                      loading={loadingModels}
                      value={selectedModel}
                      onChange={handleModelChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Modelo"
                          variant="outlined"
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingModels ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={yearOptions}
                      value={formData.min_year || null}
                      onChange={(event, newValue) => {
                        setFormData(prev => ({
                          ...prev,
                          min_year: newValue || ''
                        }))
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Año mínimo"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={yearOptions}
                      value={formData.max_year || null}
                      onChange={(event, newValue) => {
                        setFormData(prev => ({
                          ...prev,
                          max_year: newValue || ''
                        }))
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Año máximo"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel>Tipo de motor</InputLabel>
                      <Select
                        name="engine"
                        value={formData.engine}
                        label="Tipo de motor"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="">Cualquiera</MenuItem>
                        <MenuItem value="gasoline">Gasolina</MenuItem>
                        <MenuItem value="gasoil">Diésel</MenuItem>
                        <MenuItem value="electric">Eléctrico</MenuItem>
                        <MenuItem value="hybrid">Híbrido</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Potencia mínima (CV)"
                      name="min_horse_power"
                      type="number"
                      value={formData.min_horse_power}
                      onChange={handleInputChange}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel>Cambio</InputLabel>
                      <Select
                        name="gearbox"
                        value={formData.gearbox}
                        label="Cambio"
                        onChange={handleSelectChange}
                      >
                        <MenuItem value="">Cualquiera</MenuItem>
                        <MenuItem value="manual">Manual</MenuItem>
                        <MenuItem value="automatic">Automático</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Distancia de búsqueda: {formData.distance === 500 ? 'Sin límite' : `${formData.distance} km`}
                    </Typography>
                    <Slider
                      value={formData.distance}
                      onChange={handleDistanceChange}
                      step={null}
                      marks={distanceMarks}
                      min={0}
                      max={500}
                      sx={{ 
                        '& .MuiSlider-markLabel': {
                          display: 'none'
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Kilómetros máximos: {formData.max_kilometers === 240000 ? 'Sin límite' : `${(formData.max_kilometers / 1000).toFixed(0)}k`}
                    </Typography>
                    <Slider
                      value={formData.max_kilometers}
                      onChange={(event: Event | null, newValue: number | number[]) => {
                        setFormData(prev => ({
                          ...prev,
                          max_kilometers: newValue as number
                        }))
                      }}
                      step={null}
                      marks={kilometerMarks}
                      min={0}
                      max={240000}
                      sx={{ 
                        '& .MuiSlider-markLabel': {
                          display: 'none'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Box sx={{ 
                    width: '300px',
                    height: '150px',
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <Suspense fallback={
                      <Box sx={{ 
                        width: '100%', 
                        height: '100%', 
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CircularProgress />
                      </Box>
                    }>
                      <MapComponent
                        center={[
                          formData.latitude ?? SPAIN_CENTER.lat,
                          formData.longitude ?? SPAIN_CENTER.lng
                        ]}
                        onLocationSelect={handleMapClick}
                        distance={formData.distance}
                      />
                    </Suspense>
                  </Box>

                  <Button
                    variant="contained"
                    onClick={handleLocationRequest}
                    startIcon={<MyLocation />}
                    fullWidth
                    sx={{ height: 36 }}
                  >
                    Encuentrame
                  </Button>

                  {locationError && (
                    <Typography color="error" variant="caption" textAlign="center">
                      {locationError}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center'}}>
              <Button 
                variant="contained" 
                size="large"
                type="submit"
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Buscar'}
              </Button>
            </Box>
          </CardContent>
        </form>
      </Card>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: { transform: 'translateY(-20px)', opacity: 0 },
              to: { transform: 'translateY(0)', opacity: 1 }
            }
          }}
        >
          {error === 'Search failed' ? 'Error en la búsqueda' : 
           error === 'No listings found' ? 'No se encontraron resultados' : 
           'Ha ocurrido un error'}
        </Alert>
      )}

      {loading ? (
        <>
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
          </Box>
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <ListingSkeleton />
              </Grid>
            ))}
          </Grid>
        </>
      ) : results && (
        <Box sx={{
          animation: 'fadeIn 0.5s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 }
          }
        }}>
          {/* Market Analysis Card */}
          {results.market_data && (
            <Card sx={{ 
              mb: 3, 
              bgcolor: 'background.paper',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: (theme) => theme.shadows[4]
              }
            }}>
              <CardContent sx={{ p: 2 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item>
                    <Typography variant="h6" sx={{ mr: 3 }}>
                      Análisis de Mercado
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography component="span" color="text.secondary" sx={{ mr: 1 }}>
                      Media:
                    </Typography>
                    <Typography component="span" sx={{ mr: 3, fontWeight: 'bold' }}>
                      {results.market_data.average_price_text}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography component="span" color="text.secondary" sx={{ mr: 1 }}>
                      Rango:
                    </Typography>
                    <Typography component="span" sx={{ mr: 3, fontWeight: 'bold' }}>
                      {results.market_data.min_price_text} - {results.market_data.max_price_text}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography component="span" color="text.secondary" sx={{ mr: 1 }}>
                      Total anuncios:
                    </Typography>
                    <Typography component="span" sx={{ fontWeight: 'bold' }}>
                      {results.market_data.total_listings}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Listings */}
          {results.listings?.length > 0 ? (
            <>
              <Typography variant="h6" sx={{ 
                mb: 2,
                fontWeight: 'bold',
                color: 'text.primary'
              }}>
                {results.listings.length} anuncios encontrados
              </Typography>

              <Grid container spacing={3}>
                {results.listings.map((listing, index) => (
                  <Grid item xs={12} sm={6} md={4} key={listing.id}>
                    <Box sx={{
                      animation: `fadeSlideIn 0.5s ease-out ${index * 0.1}s both`,
                      '@keyframes fadeSlideIn': {
                        from: { 
                          opacity: 0,
                          transform: 'translateY(20px)'
                        },
                        to: { 
                          opacity: 1,
                          transform: 'translateY(0)'
                        }
                      }
                    }}>
                      <Card sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        bgcolor: 'background.paper',
                        position: 'relative',
                        overflow: 'visible'
                      }}>
                        {/* Price Difference Stamp */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            zIndex: 1,
                            bgcolor: '#d32f2f',
                            color: '#fff',
                            width: 75,
                            height: 75,
                            borderRadius: '50%',
                            fontWeight: 'bold',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: 'rotate(-12deg)',
                            border: '2px solid rgba(255,255,255,0.3)',
                            padding: '2px',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: -2,
                              left: -2,
                              right: -2,
                              bottom: -2,
                              borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.4)',
                            }
                          }}
                        >
                          <Typography 
                            sx={{ 
                              fontSize: '0.9rem',
                              lineHeight: 1,
                              fontWeight: 'bold',
                              textAlign: 'center',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                              mb: 0.5
                            }}
                          >
                            {Math.round(Math.abs(listing.price_difference)).toLocaleString('es-ES')}
                            €
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.7rem',
                              lineHeight: 1,
                              textAlign: 'center',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                              opacity: 0.9
                            }}
                          >
                            {listing.price_difference_percentage}
                          </Typography>
                        </Box>
                        <CardContent sx={{ flex: 1, p: 2 }}>
                          {listing.listing_images?.[0]?.image_url && (
                            <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 2 }}>
                              <Image 
                                src={listing.listing_images[0].image_url} 
                                alt={listing.title}
                                fill
                                style={{
                                  objectFit: 'cover',
                                  borderRadius: 8
                                }}
                              />
                            </Box>
                          )}
                          <Typography variant="h6" gutterBottom noWrap>
                            {listing.title}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                              <Typography variant="h5" color="primary">
                                {listing.price_text}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Mercado: {listing.market_price_text}
                              </Typography>
                            </Box>
                          </Box>
                          <Grid container spacing={1} sx={{ mb: 2 }}>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">Año</Typography>
                              <Typography variant="body2">{listing.year}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">KM</Typography>
                              <Typography variant="body2">{listing.kilometers?.toLocaleString() || 'N/D'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">Potencia</Typography>
                              <Typography variant="body2">{listing.horsepower ? `${listing.horsepower} CV` : 'N/D'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">Motor</Typography>
                              <Typography variant="body2">{listing.fuel_type || 'N/D'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">Cambio</Typography>
                              <Typography variant="body2">{listing.transmission || 'N/D'}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="text.secondary">Distancia</Typography>
                              <Typography variant="body2">{listing.distance ? `${listing.distance} km` : 'N/D'}</Typography>
                            </Grid>
                          </Grid>
                          <Button 
                            variant="outlined" 
                            fullWidth
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 'auto' }}
                          >
                            Ver Anuncio
                          </Button>
                        </CardContent>
                      </Card>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : (
            <Alert 
              severity="info"
              sx={{
                animation: 'slideIn 0.3s ease-out',
                '@keyframes slideIn': {
                  from: { transform: 'translateY(-20px)', opacity: 0 },
                  to: { transform: 'translateY(0)', opacity: 1 }
                }
              }}
            >
              No se encontraron anuncios con los criterios seleccionados. Prueba a ajustar los parámetros de búsqueda.
            </Alert>
          )}

          {Object.keys(suggestionCategories).length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {Object.entries(suggestionCategories).map(([key, category]) => (
                  <Grid item key={key}>
                    <Button
                      variant={selectedSuggestionCategory === key ? "contained" : "outlined"}
                      onClick={() => setSelectedSuggestionCategory(selectedSuggestionCategory === key ? null : key)}
                      sx={{
                        borderRadius: 4,
                        textTransform: 'none',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                        }
                      }}
                    >
                      {category.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
              
              {selectedSuggestionCategory && suggestionCategories[selectedSuggestionCategory] && (
                <Grid container spacing={2}>
                  {suggestionCategories[selectedSuggestionCategory].listings.map((listing: ApiListing) => {
                    const price = listing.content.price;
                    const marketPrice = results?.market_data?.median_price || 0;
                    const priceDifference = marketPrice - price;
                    const differencePercentage = (priceDifference / marketPrice) * 100;

                    const transformedListing = {
                      id: listing.id,
                      title: listing.content.title,
                      description: listing.content.storytelling,
                      price: price,
                      price_text: formatPrice(price),
                      market_price: marketPrice,
                      market_price_text: formatPrice(marketPrice),
                      price_difference: priceDifference,
                      price_difference_percentage: `${Math.abs(differencePercentage).toFixed(1)}%`,
                      location: `${listing.content.location.city}, ${listing.content.location.postal_code}`,
                      year: listing.content.year,
                      kilometers: listing.content.km,
                      fuel_type: listing.content.engine,
                      transmission: listing.content.gearbox,
                      url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
                      horsepower: listing.content.horsepower,
                      distance: listing.content.distance,
                      listing_images: listing.content.images.map((img: ApiImage) => ({
                        image_url: img.large || img.original
                      }))
                    };

                    return (
                      <Grid item xs={12} sm={6} md={4} key={listing.id}>
                        <Box sx={{
                          animation: 'fadeSlideIn 0.5s ease-out both',
                          '@keyframes fadeSlideIn': {
                            from: { 
                              opacity: 0,
                              transform: 'translateY(20px)'
                            },
                            to: { 
                              opacity: 1,
                              transform: 'translateY(0)'
                            }
                          }
                        }}>
                          <Card sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            bgcolor: 'background.paper',
                            position: 'relative',
                            overflow: 'visible'
                          }}>
                            {/* Price Difference Stamp */}
                            <Box
                              sx={{
                                position: 'absolute',
                                top: -10,
                                right: -10,
                                zIndex: 1,
                                bgcolor: '#d32f2f',
                                color: '#fff',
                                width: 75,
                                height: 75,
                                borderRadius: '50%',
                                fontWeight: 'bold',
                                boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: 'rotate(-12deg)',
                                border: '2px solid rgba(255,255,255,0.3)',
                                padding: '2px',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  top: -2,
                                  left: -2,
                                  right: -2,
                                  bottom: -2,
                                  borderRadius: '50%',
                                  border: '2px solid rgba(255,255,255,0.4)',
                                }
                              }}
                            >
                              <Typography 
                                sx={{ 
                                  fontSize: '0.9rem',
                                  lineHeight: 1,
                                  fontWeight: 'bold',
                                  textAlign: 'center',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                  mb: 0.5
                                }}
                              >
                                {Math.round(Math.abs(transformedListing.price_difference)).toLocaleString('es-ES')}€
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.7rem',
                                  lineHeight: 1,
                                  textAlign: 'center',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                  opacity: 0.9
                                }}
                              >
                                {transformedListing.price_difference_percentage}
                              </Typography>
                            </Box>
                            <CardContent sx={{ flex: 1, p: 2 }}>
                              {transformedListing.listing_images?.[0]?.image_url && (
                                <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 2 }}>
                                  <Image 
                                    src={transformedListing.listing_images[0].image_url} 
                                    alt={transformedListing.title}
                                    fill
                                    style={{
                                      objectFit: 'cover',
                                      borderRadius: 8
                                    }}
                                  />
                                </Box>
                              )}
                              <Typography variant="h6" gutterBottom noWrap>
                                {transformedListing.title}
                              </Typography>
                              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h5" color="primary">
                                  {transformedListing.price_text}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color={priceDifference > 0 ? 'success.main' : 'error.main'}
                                >
                                  {transformedListing.price_difference_percentage}
                                </Typography>
                              </Box>
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {transformedListing.year} · {transformedListing.kilometers.toLocaleString()}km · {transformedListing.fuel_type}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {transformedListing.location}
                                </Typography>
                              </Box>
                              <Button 
                                href={transformedListing.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                variant="contained" 
                                fullWidth 
                                sx={{ mt: 2 }}
                              >
                                Ver anuncio
                              </Button>
                            </CardContent>
                          </Card>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          )}
        </Box>
      )}
    </Container>
  )
} 