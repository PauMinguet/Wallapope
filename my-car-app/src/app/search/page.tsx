'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
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
  Autocomplete
} from '@mui/material'
import { DirectionsCar } from '@mui/icons-material'

const BACKEND_URL = 'http://localhost:10000'

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
    listing_images: Array<{
      image_url: string
    }>
  }>
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
  order_by: 'price_low_to_high'
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

  const handleBrandChange = (_: React.SyntheticEvent, newValue: Brand | null) => {
    setSelectedBrand(newValue)
    setSelectedModel(null)
    setFormData(prev => ({
      ...prev,
      brand: newValue ? newValue.name : '',
      model: '' // Reset model when brand changes
    }))
  }

  const handleModelChange = (_: React.SyntheticEvent, newValue: Model | null) => {
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
        min_horse_power: formData.min_horse_power ? parseInt(formData.min_horse_power) : undefined
      }

      // Remove empty fields from the request
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => value !== '' && value !== undefined)
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
        const marketPrice = marketData.median_price || marketData.market_price || 0
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
              price_difference_percentage: `${differencePercentage > 0 ? '+' : ''}${differencePercentage.toFixed(1)}%`,
              location: `${listing.content.location.city}, ${listing.content.location.postal_code}`,
              year: listing.content.year,
              kilometers: listing.content.km,
              fuel_type: listing.content.engine,
              transmission: listing.content.gearbox,
              url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
              listing_images: listing.content.images.map((img: ApiImage) => ({
                image_url: img.large || img.original
              }))
            }
          })
        }
        console.log('Transformed data:', transformedData)
        console.log('Transformed market data:', transformedData.market_data)
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        mb: 4,
        textAlign: 'center'
      }}>
        <DirectionsCar sx={{ 
          fontSize: 80, 
          color: 'primary.main', 
          mb: 2 
        }} />
        <Typography variant="h3" component="h1" sx={{ 
          mb: 2,
          fontWeight: 'bold' 
        }}>
          Buscador de Coches
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ 
          maxWidth: 600,
          mx: 'auto'
        }}>
          Busca coches con análisis de precios de mercado
        </Typography>
      </Box>

      <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
        <form onSubmit={handleSubmit}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  fullWidth
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
              {selectedBrand && (
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    fullWidth
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
              )}
              <Grid item xs={12} md={3}>
                <Autocomplete
                  fullWidth
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
                    />
                  )}
                  ListboxProps={{
                    style: { maxHeight: '400px' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  fullWidth
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
                    />
                  )}
                  ListboxProps={{
                    style: { maxHeight: '400px' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
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
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Potencia mínima (CV)"
                  name="min_horse_power"
                  type="number"
                  value={formData.min_horse_power}
                  onChange={handleInputChange}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth variant="outlined">
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
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error === 'Search failed' ? 'Error en la búsqueda' : 
           error === 'No listings found' ? 'No se encontraron resultados' : 
           'Ha ocurrido un error'}
        </Alert>
      )}

      {results && (
        <div>
          {/* Market Analysis Card */}
          {results.market_data && (
            <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: 2 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item>
                    <Typography variant="h6" sx={{ mr: 3 }}>
                      Análisis de Mercado
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography component="span" color="text.secondary" sx={{ mr: 1 }}>
                      Mediana:
                    </Typography>
                    <Typography component="span" sx={{ mr: 3, fontWeight: 'bold' }}>
                      {results.market_data.median_price_text}
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
              <Typography variant="h6" sx={{ mb: 2 }}>
                {results.listings.length} anuncios encontrados
              </Typography>

              <Grid container spacing={3}>
                {results.listings.map((listing) => (
                  <Grid item xs={12} sm={6} md={4} key={listing.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', position: 'relative', overflow: 'visible' }}>
                      {/* Price Difference Stamp */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          zIndex: 1,
                          bgcolor: '#d32f2f',
                          color: '#fff',
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: 'rotate(-12deg)',
                          border: '2px solid rgba(255,255,255,0.3)',
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
                          }}
                        >
                          {listing.price_difference > 0 ? '-' : '+'}
                          {Math.abs(listing.price_difference).toLocaleString('es-ES')}
                          €
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
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Año</Typography>
                            <Typography variant="body2">{listing.year}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">KM</Typography>
                            <Typography variant="body2">{listing.kilometers?.toLocaleString() || 'N/D'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Motor</Typography>
                            <Typography variant="body2">{listing.fuel_type || 'N/D'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Cambio</Typography>
                            <Typography variant="body2">{listing.transmission || 'N/D'}</Typography>
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
                  </Grid>
                ))}
              </Grid>
            </>
          ) : (
            <Alert severity="info">
              No se encontraron anuncios con los criterios seleccionados. Prueba a ajustar los parámetros de búsqueda.
            </Alert>
          )}
        </div>
      )}
    </Container>
  )
} 