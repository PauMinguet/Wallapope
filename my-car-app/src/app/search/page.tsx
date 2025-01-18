'use client'

import React, { useState, useEffect, Suspense } from 'react'
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
  Slider
} from '@mui/material'
import {MyLocation } from '@mui/icons-material'
import 'leaflet/dist/leaflet.css'
import TopBar from '../components/TopBar'
import ListingsGrid from '../components/ListingsGrid'
import { useUser, SignUpButton } from '@clerk/nextjs'

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
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [selectedSuggestionCategory, setSelectedSuggestionCategory] = useState<string | null>(null)
  const [suggestionCategories, setSuggestionCategories] = useState<Record<string, SuggestionCategory>>({})
  const { isSignedIn } = useUser()

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
    
    if (!isSignedIn) {
      return // The SignUpButton will handle showing the modal
    }
    
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

  // Add common styles for input fields
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.23)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.5)',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'white',
      }
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
      '&.Mui-focused': {
        color: 'white'
      }
    },
    '& .MuiAutocomplete-clearIndicator, & .MuiAutocomplete-popupIndicator': {
      color: 'rgba(255, 255, 255, 0.7)'
    }
  }

  return (
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
      color: 'white'
    }}>
      <TopBar />
      
      {/* Fixed Background Pattern */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          overflow: 'hidden'
        }}
      >
        {/* Top Left Blob */}
        <Box
          sx={{
            position: 'absolute',
            top: '5%',
            left: '0%',
            width: '50%',
            height: '60%',
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            filter: 'blur(150px)',
            opacity: 0.07,
            borderRadius: '50%',
            transform: 'rotate(-45deg)'
          }}
        />
        {/* Center Right Blob */}
        <Box
          sx={{
            position: 'absolute',
            top: '40%',
            right: '-10%',
            width: '50%',
            height: '60%',
            background: 'linear-gradient(45deg, #9400D3, #4169E1)',
            filter: 'blur(150px)',
            opacity: 0.07,
            borderRadius: '50%',
            transform: 'rotate(30deg)'
          }}
        />
        {/* Bottom Left Blob */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            left: '20%',
            width: '40%',
            height: '60%',
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            filter: 'blur(150px)',
            opacity: 0.07,
            borderRadius: '50%',
            transform: 'rotate(-15deg)'
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ 
        py: { xs: 10, md: 12 },
        position: 'relative',
        zIndex: 1
      }}>
        {/* Title Section */}
        <Box sx={{ textAlign: 'left', mb: { xs: 4, md: 6 } }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Encuentra tu coche ideal
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 500,
              mb: { xs: 1, md: 1.5 },
              color: 'rgba(255,255,255,0.7)',
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
            }}
          >
            Personaliza tu búsqueda y descubre las mejores ofertas del mercado
          </Typography>
        </Box>

        <Card sx={{ 
          mb: 2, 
          bgcolor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.2)'
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
                            sx={inputStyles}
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
                        sx={{
                          '& .MuiAutocomplete-paper': {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                          },
                          '& .MuiAutocomplete-option': {
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                            '&[aria-selected="true"]': {
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }
                          }
                        }}
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
                            sx={inputStyles}
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
                        sx={{
                          '& .MuiAutocomplete-paper': {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                          },
                          '& .MuiAutocomplete-option': {
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                            '&[aria-selected="true"]': {
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: 'white' }}>
                        Año: {formData.min_year || 1990} - {formData.max_year || 2025}
                      </Typography>
                      <Slider
                        value={[
                          parseInt(formData.min_year || '1990'),
                          parseInt(formData.max_year || '2025')
                        ]}
                        onChange={(event: Event, newValue: number | number[]) => {
                          const [min, max] = newValue as number[];
                          setFormData(prev => ({
                            ...prev,
                            min_year: min.toString(),
                            max_year: max.toString()
                          }));
                        }}
                        min={1990}
                        max={2025}
                        step={1}
                        marks={[
                          { value: 1990, label: '1990' },
                          { value: 2000, label: '2000' },
                          { value: 2010, label: '2010' },
                          { value: 2020, label: '2020' },
                          { value: 2025, label: '2025' }
                        ]}
                        sx={{ 
                          '& .MuiSlider-markLabel': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          },
                          '& .MuiSlider-thumb': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: '0 0 0 8px rgba(65, 105, 225, 0.16)'
                            }
                          },
                          '& .MuiSlider-rail': {
                            background: 'rgba(255,255,255,0.2)',
                          },
                          '& .MuiSlider-mark': {
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            height: 8,
                            width: 2,
                            '&.MuiSlider-markActive': {
                              backgroundColor: 'rgba(255,255,255,0.7)',
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-focused': { color: 'white' } }}>
                          Tipo de motor
                        </InputLabel>
                        <Select
                          name="engine"
                          value={formData.engine}
                          label="Tipo de motor"
                          onChange={handleSelectChange}
                          sx={{
                            color: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'white',
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'white',
                            }
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: 'rgba(0, 0, 0, 0.9)',
                                color: 'white',
                                '& .MuiMenuItem-root': {
                                  '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    '&:hover': {
                                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    }
                                  }
                                }
                              }
                            }
                          }}
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
                        sx={inputStyles}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-focused': { color: 'white' } }}>
                          Cambio
                        </InputLabel>
                        <Select
                          name="gearbox"
                          value={formData.gearbox}
                          label="Cambio"
                          onChange={handleSelectChange}
                          sx={{
                            color: 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'white',
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'white',
                            }
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: 'rgba(0, 0, 0, 0.9)',
                                color: 'white',
                                '& .MuiMenuItem-root': {
                                  '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    '&:hover': {
                                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    }
                                  }
                                }
                              }
                            }
                          }}
                        >
                          <MenuItem value="">Cualquiera</MenuItem>
                          <MenuItem value="manual">Manual</MenuItem>
                          <MenuItem value="automatic">Automático</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: 'white' }}>
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
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          },
                          '& .MuiSlider-thumb': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: '0 0 0 8px rgba(65, 105, 225, 0.16)'
                            }
                          },
                          '& .MuiSlider-rail': {
                            background: 'rgba(255,255,255,0.2)',
                          },
                          '& .MuiSlider-mark': {
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            height: 8,
                            width: 2,
                            '&.MuiSlider-markActive': {
                              backgroundColor: 'rgba(255,255,255,0.7)',
                            }
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: 'white' }}>
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
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          },
                          '& .MuiSlider-thumb': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: '0 0 0 8px rgba(65, 105, 225, 0.16)'
                            }
                          },
                          '& .MuiSlider-rail': {
                            background: 'rgba(255,255,255,0.2)',
                          },
                          '& .MuiSlider-mark': {
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            height: 8,
                            width: 2,
                            '&.MuiSlider-markActive': {
                              backgroundColor: 'rgba(255,255,255,0.7)',
                            }
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
                      sx={{ 
                        height: 36,
                        background: '#2C3E93',
                        color: 'rgba(255,255,255,0.95)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        fontWeight: 500,
                        '&:hover': {
                          background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                        },
                        marginBottom: 2
                      }}
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
                {isSignedIn ? (
                  <Button 
                    variant="contained" 
                    size="large"
                    type="submit"
                    disabled={loading}
                    sx={{ 
                      minWidth: 200,
                      background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                      color: 'rgba(255,255,255,0.95)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      fontWeight: 500,
                      '&:hover': {
                        background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                      },
                      '&:disabled': {
                        background: 'rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.3)'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Buscar'}
                  </Button>
                ) : (
                  <SignUpButton mode="modal">
                    <Button 
                      variant="contained" 
                      size="large"
                      sx={{ 
                        minWidth: 200,
                        background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                        color: 'rgba(255,255,255,0.95)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        fontWeight: 500,
                        '&:hover': {
                          background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                        }
                      }}
                    >
                      Registrarse para buscar
                    </Button>
                  </SignUpButton>
                )}
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

        {results && (
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
                bgcolor: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item>
                      <Typography variant="h6" sx={{ mr: 3, color: 'white' }}>
                        Análisis de Mercado
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                        Media:
                      </Typography>
                      <Typography component="span" sx={{ mr: 3, fontWeight: 'bold', color: 'white' }}>
                        {results.market_data.average_price_text}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                        Rango:
                      </Typography>
                      <Typography component="span" sx={{ mr: 3, fontWeight: 'bold', color: 'white' }}>
                        {results.market_data.min_price_text} - {results.market_data.max_price_text}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                        Total anuncios:
                      </Typography>
                      <Typography component="span" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {results.market_data.total_listings}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Main Listings */}
            {results.listings?.length > 0 && (
              <>
                <Typography variant="h6" sx={{ 
                  mb: 2,
                  fontWeight: 'bold',
                  color: 'text.primary'
                }}>
                  {results.listings.length} anuncios encontrados
                </Typography>

                <ListingsGrid 
                  listings={results.listings} 
                  loading={loading}
                  showNoResults={!loading && (!results.listings || results.listings.length === 0)}
                />
              </>
            )}

            {/* Suggested Listings */}
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
                  <ListingsGrid 
                    listings={suggestionCategories[selectedSuggestionCategory].listings.map(listing => ({
                      id: listing.id,
                      title: listing.content.title,
                      description: listing.content.storytelling,
                      price: listing.content.price,
                      price_text: formatPrice(listing.content.price),
                      market_price: results.market_data?.median_price || 0,
                      market_price_text: formatPrice(results.market_data?.median_price || 0),
                      price_difference: (results.market_data?.median_price || 0) - listing.content.price,
                      price_difference_percentage: `${Math.abs(((results.market_data?.median_price || 0) - listing.content.price) / (results.market_data?.median_price || 1) * 100).toFixed(1)}%`,
                      location: `${listing.content.location.city}, ${listing.content.location.postal_code}`,
                      year: listing.content.year,
                      kilometers: listing.content.km,
                      fuel_type: listing.content.engine,
                      transmission: listing.content.gearbox,
                      url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
                      horsepower: listing.content.horsepower,
                      distance: listing.content.distance,
                      listing_images: listing.content.images.map(img => ({
                        image_url: img.large || img.original
                      }))
                    }))}
                  />
                )}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  )
} 