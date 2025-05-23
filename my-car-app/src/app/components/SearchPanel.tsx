/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, Suspense } from 'react'
import { 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Box,
  CircularProgress,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert,
  Slider,
  Autocomplete,
} from '@mui/material'
import { 
  MyLocation,
} from '@mui/icons-material'
import dynamic from 'next/dynamic'
import { useUser, SignIn } from '@clerk/nextjs'
import ListingsGrid from './ListingsGrid'

const MapComponent = dynamic(
  () => import('./MapComponent'),
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

interface Listing {
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
  listing_images: Array<{ image_url: string }>
  market_search_url?: string
  search_url?: string
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
  location_text: string
  max_kilometers: number
}

interface SearchResult {
  listings: Listing[]
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
  market_search_url?: string
  search_url?: string
  filtered_results: number
  total_results: number
  success: boolean
  search_parameters: Record<string, string>
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'

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

const STORAGE_KEY = 'carSearchFormData'

const initialFormData: SearchFormData = {
  brand: '',
  model: '',
  min_year: '',
  max_year: '',
  engine: '',
  min_horse_power: '',
  gearbox: '',
  order_by: 'price_low_to_high',
  latitude: SPAIN_CENTER.lat,
  longitude: SPAIN_CENTER.lng,
  location_text: 'España',
  max_kilometers: 200000
}

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

export default function SearchPanel() {
  const [formData, setFormData] = useState<SearchFormData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Ensure we have coordinates, even if they're missing or null in saved data
          return {
            ...parsed,
            latitude: parsed.latitude !== null ? parsed.latitude : SPAIN_CENTER.lat,
            longitude: parsed.longitude !== null ? parsed.longitude : SPAIN_CENTER.lng,
            location_text: parsed.location_text || 'España'
          }
        } catch (e) {
          console.error('Error parsing saved form data:', e)
        }
      }
    }
    return initialFormData
  })
  
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const { isSignedIn } = useUser()
  const [showSignIn, setShowSignIn] = useState(false)
  const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loadingLocation, setLoadingLocation] = useState(false)

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

  // Initial data load
  useEffect(() => {
    fetchBrands()
  }, [])

  // Handle brand selection and model fetching
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

  const handleBrandChange = (event: React.SyntheticEvent | null, newValue: Brand | null) => {
    setSelectedBrand(newValue)
    setSelectedModel(null)
    setFormData(prev => ({
      ...prev,
      brand: newValue ? newValue.name : '',
      model: ''
    }))
  }

  const handleModelChange = (event: React.SyntheticEvent | null, newValue: Model | null) => {
    setSelectedModel(newValue)
    setFormData(prev => ({
      ...prev,
      model: newValue ? newValue.nome : ''
    }))
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
        ...(name === 'brand' ? { model: '' } : {})
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent | React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (!isSignedIn) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      setHasAttemptedSearch(true)
      setShowSignIn(true)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Always ensure we have latitude and longitude, even if they're not in formData
      const lat = formData.latitude !== null ? formData.latitude : SPAIN_CENTER.lat;
      const lng = formData.longitude !== null ? formData.longitude : SPAIN_CENTER.lng;
      
      // Create a copy of form data to ensure location is always included
      const searchParams = {
        ...formData,
        min_year: formData.min_year ? parseInt(formData.min_year) : undefined,
        max_year: formData.max_year ? parseInt(formData.max_year) : undefined,
        min_horse_power: formData.min_horse_power ? parseInt(formData.min_horse_power) : undefined,
        max_kilometers: formData.max_kilometers,
        min_sale_price: 3000,
        order_by: 'price_low_to_high',
        // Always include latitude and longitude
        latitude: lat,
        longitude: lng
      }

      const cleanParams = Object.fromEntries(
        Object.entries(searchParams)
          .filter(([key, value]) => 
            value !== '' && 
            value !== undefined && 
            value !== null
          )
          .map(([key, value]) => [key, String(value)])
      ) as Record<string, string>
      
      // Log the params being sent (for debugging)
      console.log('Sending search params:', cleanParams)

      const response = await fetch(`${BACKEND_URL}/api/search-single-car`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanParams)
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      
      if (data.error) {
        if (data.error === 'Could not determine market price') {
          setError(`No se encontraron suficientes datos de mercado para determinar el precio de referencia con estos parámetros.\nPrueba a ampliar el rango de búsqueda (años, kilómetros o distancia) para obtener más resultados.`)
        } else {
          setError(data.error)
        }
      } else {
        const transformedData = {
          listings: data.listings,
          market_data: data.market_data ? {
            average_price: data.market_data.average_price,
            average_price_text: formatPrice(data.market_data.average_price),
            median_price: data.market_data.median_price,
            median_price_text: formatPrice(data.market_data.median_price),
            min_price: data.market_data.min_price,
            min_price_text: formatPrice(data.market_data.min_price),
            max_price: data.market_data.max_price,
            max_price_text: formatPrice(data.market_data.max_price),
            total_listings: data.market_data.total_listings,
            valid_listings: data.market_data.valid_listings
          } : undefined,
          market_search_url: data.market_search_url,
          search_url: data.search_url,
          filtered_results: data.listings.length,
          total_results: data.market_data?.total_listings || 0,
          success: true,
          search_parameters: cleanParams
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

  // Add back location handlers
  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_text: 'Current Location'
        }))
        setLoadingLocation(false)
      },
      (error) => {
        setError('Unable to retrieve your location')
        console.error('Geolocation error:', error)
        setLoadingLocation(false)
      }
    )
  }

  const handleMapClick = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location_text: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }))
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Left Card - Main Filters */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)'
              }
            }}>
              <CardContent>
                <Grid container spacing={2}>
                  {/* Brand and Model */}
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Autocomplete
                          options={brands}
                          getOptionLabel={(option) => option.name}
                          loading={loadingBrands}
                          value={selectedBrand}
                          onChange={handleBrandChange}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Marca"
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
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Autocomplete
                          options={models}
                          getOptionLabel={(option) => option.nome}
                          loading={loadingModels}
                          value={selectedModel}
                          onChange={handleModelChange}
                          disabled={!selectedBrand}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Modelo"
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
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Engine and Transmission row */}
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth variant="outlined" size="small">
                          <Select
                            name="engine"
                            value={formData.engine}
                            displayEmpty
                            onChange={handleSelectChange}
                            sx={{
                              color: 'white',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255, 255, 255, 0.23)',
                              }
                            }}
                          >
                            <MenuItem value="">Motor</MenuItem>
                            <MenuItem value="gasoline">Gasolina</MenuItem>
                            <MenuItem value="gasoil">Diésel</MenuItem>
                            <MenuItem value="electric">Eléctrico</MenuItem>
                            <MenuItem value="hybrid">Híbrido</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6}>
                        <FormControl fullWidth variant="outlined" size="small">
                          <Select
                            name="gearbox"
                            value={formData.gearbox}
                            displayEmpty
                            onChange={handleSelectChange}
                            sx={{
                              color: 'white',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255, 255, 255, 0.23)',
                              }
                            }}
                          >
                            <MenuItem value="">Cambio</MenuItem>
                            <MenuItem value="manual">Manual</MenuItem>
                            <MenuItem value="automatic">Automático</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Year Slider */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                      Año: {formData.min_year || '2000'} - {formData.max_year || '2025'}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={[
                          parseInt(formData.min_year || '2000'),
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
                        min={2000}
                        max={2025}
                        step={1}
                        marks={[
                          { value: 2000, label: '2000' },
                          { value: 2025, label: '2025' }
                        ]}
                        sx={{ 
                          '& .MuiSlider-markLabel': {
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.75rem'
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          },
                          '& .MuiSlider-thumb': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          }
                        }}
                      />
                    </Box>
                  </Grid>

                  {/* CV Slider */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                      Min CV: {formData.min_horse_power || '0'}
                    </Typography>
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={parseInt(formData.min_horse_power || '0')}
                        onChange={(event: Event, newValue: number | number[]) => {
                          setFormData(prev => ({
                            ...prev,
                            min_horse_power: newValue.toString()
                          }));
                        }}
                        min={0}
                        max={500}
                        step={10}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 500, label: '500' }
                        ]}
                        sx={{ 
                          '& .MuiSlider-markLabel': {
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.75rem'
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          },
                          '& .MuiSlider-thumb': {
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Card - Map */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)'
              }
            }}>
              <CardContent sx={{ 
                p: { xs: 2, md: 3 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <Box sx={{ 
                  flexGrow: 1,
                  border: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative',
                  minHeight: '300px'
                }}>
                  <Suspense fallback={
                    <Box sx={{ 
                      width: '100%', 
                      height: '100%', 
                      bgcolor: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CircularProgress sx={{ color: 'white' }} />
                    </Box>
                  }>
                    <MapComponent
                      center={[
                        formData.latitude ?? SPAIN_CENTER.lat,
                        formData.longitude ?? SPAIN_CENTER.lng
                      ]}
                      onLocationSelect={handleMapClick}
                    />
                  </Suspense>
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={handleLocationRequest}
                  startIcon={<MyLocation />}
                  disabled={loadingLocation}
                  sx={{ 
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    py: 0.5,
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  {loadingLocation ? 'Cargando...' : 'Encuéntrame'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Search Button - Centered Below */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading}
              sx={{ 
                minWidth: '200px',
                height: '45px',
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 'bold',
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                }
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Buscar'}
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Search Results Section */}
      {results && (
        <Card 
          sx={{ 
            mt: 3,
            bgcolor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CardContent>
            {/* Market Data Summary */}
            {results.market_data && (
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Precio medio
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {results.market_data.average_price_text}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Precio mínimo
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {results.market_data.min_price_text}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Precio máximo
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {results.market_data.max_price_text}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Total anuncios
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        {results.market_data.total_listings}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Listings */}
            <ListingsGrid 
              listings={results.listings}
              loading={loading}
              showNoResults={!loading && (!results.listings || results.listings.length === 0)}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 2,
            '& .MuiAlert-message': {
              whiteSpace: 'pre-line'
            }
          }}
        >
          {error}
        </Alert>
      )}

      {showSignIn && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowSignIn(false)}
        >
          <Box 
            onClick={(e) => e.stopPropagation()}
            sx={{ 
              maxWidth: '400px',
              width: '90%',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <SignIn 
              afterSignInUrl={window.location.href}
              afterSignUpUrl={window.location.href}
            />
          </Box>
        </Box>
      )}
    </Box>
  )
} 