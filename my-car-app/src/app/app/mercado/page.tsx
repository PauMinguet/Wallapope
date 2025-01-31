'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Collapse,
  Slider,
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  LocalOffer as LocalOfferIcon,
  FlashOn as FlashOnIcon,
  DirectionsCar as CarIcon,
  LocalGasStation as FuelIcon,
  CalendarMonth as CalendarIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '@/hooks/useSubscription'
import Footer from '../../components/Footer'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const MotionTypography = motion(Typography)
const MotionBox = motion(Box)

interface BaseAnalytics {
  totalScans: number
  averageMarketPrice: number
  medianMarketPrice: number
  totalListingsAnalyzed: number
  validListingsPercentage: number
  brands: {
    [key: string]: {
      models: string[]
    }
  }
  priceRanges: {
    under5k: number
    '5kTo10k': number
    '10kTo20k': number
    '20kTo30k': number
    '30kTo50k': number
    over50k: number
  }
  fuelTypeDistribution: {
    [key: string]: number
  }
  yearDistribution: {
    [key: string]: number
  }
  lastUpdate: string
}

interface BrandAnalytics {
  totalScans: number
  averagePrice: number
  totalListings: number
  models: {
    [key: string]: {
      totalScans: number
      averagePrice: number
      totalListings: number
    }
  }
  fuelTypeDistribution: {
    [key: string]: number
  }
  yearDistribution: {
    [key: string]: number
  }
}

interface ModelAnalytics {
  totalScans: number
  averagePrice: number
  totalListings: number
  yearPriceDistribution: {
    [key: string]: {
      ranges: {
        [key: string]: number
      }
      averagePrice: number
      totalListings: number
    }
  }
}

const LoadingScreen = () => (
  <Box sx={{ 
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: '#000000',
    zIndex: 9999
  }}>
    <CircularProgress sx={{ color: 'white' }} />
  </Box>
)

export default function MercadoPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const { loading: subscriptionLoading, isSubscribed } = useSubscription()
  const [initialLoad, setInitialLoad] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [baseAnalytics, setBaseAnalytics] = useState<BaseAnalytics | null>(null)
  const [brandAnalytics, setBrandAnalytics] = useState<BrandAnalytics | null>(null)
  const [modelAnalytics, setModelAnalytics] = useState<ModelAnalytics | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [yearRange, setYearRange] = useState<[number, number]>([2000, new Date().getFullYear()])
  const [availableYears, setAvailableYears] = useState<[number, number]>([2000, new Date().getFullYear()])
  const [ , setDataScope] = useState<'all' | 'brand' | 'model'>('all')
  const [loadingBrand, setLoadingBrand] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)

  const getPriceDistributionData = useCallback((modelData: ModelAnalytics | null) => {
    if (!modelData?.yearPriceDistribution) return []

    // Collect all prices and their counts from the ranges
    const priceData: { price: number, count: number }[] = []
    
    Object.entries(modelData.yearPriceDistribution)
      .filter(([year]) => {
        const yearNum = parseInt(year)
        return yearNum >= yearRange[0] && yearNum <= yearRange[1]
      })
      .forEach(([year, yearData]) => {
        if (!yearData.ranges) {
          console.warn(`No ranges data for year ${year}`)
          return
        }
        
        Object.entries(yearData.ranges).forEach(([range, count]) => {
          if (count > 0) {
            try {
              // Convert range to a representative price
              let price: number
              if (range === '50000+' || range === 'over50k') {
                price = 50000
              } else if (range === 'under5k') {
                price = 2500 // midpoint of 0-5k
              } else {
                // Handle both formats: '5000-10000' and '5kTo10k'
                const isNewFormat = range.includes('kTo')
                if (isNewFormat) {
                  const [start, end] = range.split('kTo').map(n => parseInt(n))
                  if (isNaN(start) || isNaN(end)) {
                    console.warn(`Invalid range format: ${range}`)
                    return
                  }
                  price = ((start * 1000) + (end * 1000)) / 2
                } else {
                  const [start, end] = range.split('-').map(n => parseInt(n))
                  if (isNaN(start) || isNaN(end)) {
                    console.warn(`Invalid range format: ${range}`)
                    return
                  }
                  price = (start + end) / 2
                }
              }
              priceData.push({ price, count })
            } catch (error) {
              console.warn(`Error processing range ${range}:`, error)
            }
          }
        })
      })

    if (priceData.length === 0) return []

    // Find min and max prices
    const minPrice = Math.min(...priceData.map(d => d.price))
    const maxPrice = Math.max(...priceData.map(d => d.price))

    // Create dynamic ranges based on the data spread
    const numRanges = 8 // Target number of ranges
    const rangeSize = Math.ceil((maxPrice - minPrice) / numRanges)
    
    // Create continuous ranges
    const ranges: { min: number, max: number, count: number }[] = []
    let currentMin = minPrice
    
    while (currentMin < maxPrice) {
      const currentMax = Math.min(currentMin + rangeSize, maxPrice)
      ranges.push({
        min: currentMin,
        max: currentMax,
        count: 0
      })
      currentMin = currentMax
    }

    // Ensure we have at least one range for prices over 50k
    if (maxPrice >= 50000 && ranges[ranges.length - 1].min < 50000) {
      ranges.push({
        min: 50000,
        max: maxPrice,
        count: 0
      })
    }

    // Distribute data into ranges
    priceData.forEach(({ price, count }) => {
      const range = ranges.find(r => price >= r.min && price <= r.max)
      if (range) {
        range.count += count
      }
    })

    // Convert to chart format, only including ranges with data
    return ranges
      .filter(range => range.count > 0)
      .map(({ min, max, count }) => {
        let label
        if (min >= 50000) {
          label = '>50k€'
        } else {
          const minK = (min/1000).toFixed(0)
          const maxK = (max/1000).toFixed(0)
          label = `${minK}-${maxK}k€`
        }
        return {
          range: `${min}-${max}`,
          count,
          label
        }
      })
      .sort((a, b) => {
        const [aMin] = a.range.split('-').map(n => parseInt(n))
        const [bMin] = b.range.split('-').map(n => parseInt(n))
        return aMin - bMin
      })
  }, [yearRange])

  // Fetch base analytics
  const fetchBaseAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/market-analytics/base')
      if (!response.ok) {
        throw new Error('Failed to fetch base analytics')
      }
      const data = await response.json()
      setBaseAnalytics(data)
    } catch (err) {
      console.error('Error fetching base analytics:', err)
      setError('Error al cargar los datos básicos del mercado')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch brand analytics
  const fetchBrandAnalytics = useCallback(async (brand: string) => {
    try {
      setLoadingBrand(true)
      const response = await fetch(`/api/market-analytics/brand/${encodeURIComponent(brand)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch brand analytics')
      }
      const data = await response.json()
      setBrandAnalytics(data)
    } catch (err) {
      console.error('Error fetching brand analytics:', err)
      setError('Error al cargar los datos de la marca')
    } finally {
      setLoadingBrand(false)
    }
  }, [])

  // Fetch model analytics
  const fetchModelAnalytics = useCallback(async (brand: string, model: string) => {
    try {
      setLoadingModel(true)
      const response = await fetch(`/api/market-analytics/model/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch model analytics')
      }
      const data = await response.json()
      setModelAnalytics(data)
    } catch (err) {
      console.error('Error fetching model analytics:', err)
      setError('Error al cargar los datos del modelo')
    } finally {
      setLoadingModel(false)
    }
  }, [])

  // Authentication and subscription check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
      return
    }

    if (!subscriptionLoading) {
      if (!isSubscribed) {
        router.push('/pricing')
      } else {
        setInitialLoad(false)
      }
    }
  }, [subscriptionLoading, isSubscribed, router, isLoaded, isSignedIn])

  // Initial load of base analytics
  useEffect(() => {
    if (!initialLoad && !subscriptionLoading && isSignedIn) {
      fetchBaseAnalytics()
    }
  }, [isSignedIn, initialLoad, subscriptionLoading, fetchBaseAnalytics])

  // Load brand analytics when brand is selected
  useEffect(() => {
    if (selectedBrand) {
      fetchBrandAnalytics(selectedBrand)
      setSelectedModel('') // Reset model selection
      setModelAnalytics(null)
    } else {
      setBrandAnalytics(null)
    }
  }, [selectedBrand, fetchBrandAnalytics])

  // Load model analytics when model is selected
  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetchModelAnalytics(selectedBrand, selectedModel)
    } else {
      setModelAnalytics(null)
    }
  }, [selectedBrand, selectedModel, fetchModelAnalytics])

  // Update year range when model analytics change
  useEffect(() => {
    if (modelAnalytics?.yearPriceDistribution) {
      const years = Object.keys(modelAnalytics.yearPriceDistribution).map(Number)
      if (years.length > 0) {
        const minYear = Math.min(...years)
        const maxYear = Math.max(...years)
        setAvailableYears([minYear, maxYear])
        setYearRange([minYear, maxYear])
      }
    }
  }, [modelAnalytics])

  // Show loading screen during initial load or subscription check
  if (initialLoad || subscriptionLoading || !isLoaded) {
    return <LoadingScreen />
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#000000'
      }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3, bgcolor: '#000000', minHeight: '100vh' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
    }}>
      {/* Background Pattern */}
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
      </Box>

      {/* Content Container */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <MotionTypography 
            variant="h4" 
            sx={{ 
              mb: 1, 
              fontWeight: 700,
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Análisis de Mercado
          </MotionTypography>

          <MotionTypography 
            variant="body1" 
            sx={{ 
              mb: 4,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 600
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Explora las tendencias actuales del mercado de coches de segunda mano. Datos actualizados en tiempo real para ayudarte a tomar mejores decisiones.
          </MotionTypography>

          {/* Market Overview Section */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{ mb: 4 }}
          >
            <Card sx={{ 
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 3
                }}>
                  <Box sx={{ 
                    p: 2,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #4169E120, #9400D340)',
                    color: '#4169E1',
                  }}>
                    <AnalyticsIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ 
                      color: 'white',
                      fontWeight: 600,
                      mb: 0.5
                    }}>
                      Resumen del Mercado
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      Visión general del mercado de coches
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                        {baseAnalytics?.totalScans.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Análisis Realizados Hoy
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                        {formatPrice(baseAnalytics?.averageMarketPrice || 0)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Precio Medio
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                        {baseAnalytics?.totalListingsAnalyzed.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Anuncios Analizados Hoy
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                        {Object.keys(baseAnalytics?.brands || {}).length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Marcas Analizadas
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </MotionBox>

          {/* Brand Selection Section */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            sx={{ mb: 4 }}
          >
            <Card sx={{ 
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 3
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      p: 2,
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #FF408120, #9400D340)',
                      color: '#FF4081',
                    }}>
                      <CarIcon sx={{ fontSize: 40 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ 
                        color: 'white',
                        fontWeight: 600,
                        mb: 0.5
                      }}>
                        Análisis por Marca
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Selecciona una marca para ver análisis detallado
                      </Typography>
                    </Box>
                  </Box>
                  <FormControl 
                    variant="outlined" 
                    sx={{ 
                      minWidth: 200,
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255,255,255,0.3)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255,255,255,0.7)',
                      },
                      '& .MuiSelect-icon': {
                        color: 'rgba(255,255,255,0.7)',
                      },
                    }}
                  >
                    <InputLabel>Seleccionar Marca</InputLabel>
                    <Select
                      value={selectedBrand}
                      label="Seleccionar Marca"
                      onChange={(e) => {
                        e.preventDefault()
                        const value = e.target.value
                        setSelectedBrand(value)
                        setSelectedModel('') // Reset model selection when brand changes
                        setDataScope(value ? 'brand' : 'all')
                      }}
                      disabled={loadingBrand}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: 'rgba(0,0,0,0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            '& .MuiMenuItem-root': {
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                              },
                              '&.Mui-selected': {
                                bgcolor: 'rgba(65,105,225,0.2)',
                                '&:hover': {
                                  bgcolor: 'rgba(65,105,225,0.3)',
                                },
                              },
                            },
                          },
                        },
                      }}
                    >
                      <MenuItem value="">Todas las marcas</MenuItem>
                      {Object.entries(baseAnalytics?.brands || {}).map(([brand]) => (
                        <MenuItem key={brand} value={brand}>
                          {brand}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Brand Stats Section - Only show when a brand is selected */}
                <Collapse in={!!selectedBrand}>
                  <Box sx={{ position: 'relative' }}>
                    {loadingBrand && (
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.7)',
                        zIndex: 1,
                        borderRadius: 1
                      }}>
                        <CircularProgress />
                      </Box>
                    )}
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                            {brandAnalytics?.totalScans.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Análisis
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                            {formatPrice(brandAnalytics?.averagePrice || 0)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Precio Medio
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                            {brandAnalytics?.totalListings.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Anuncios
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                            {Object.keys(brandAnalytics?.models || {}).length}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Modelos
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Model Selection */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 3
                  }}>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                      Modelos de {selectedBrand}
                    </Typography>
                    <FormControl 
                      variant="outlined"
                      sx={{ 
                        minWidth: 200,
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255,255,255,0.7)',
                        },
                        '& .MuiSelect-icon': {
                          color: 'rgba(255,255,255,0.7)',
                        },
                      }}
                    >
                      <InputLabel>Seleccionar Modelo</InputLabel>
                      <Select
                        value={selectedModel}
                        label="Seleccionar Modelo"
                        onChange={(e) => {
                          e.preventDefault()
                          const value = e.target.value
                          setSelectedModel(value)
                          setDataScope(value ? 'model' : 'brand')
                        }}
                        disabled={!brandAnalytics || loadingModel}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: 'rgba(0,0,0,0.9)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              '& .MuiMenuItem-root': {
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'rgba(255,255,255,0.1)',
                                },
                                '&.Mui-selected': {
                                  bgcolor: 'rgba(65,105,225,0.2)',
                                  '&:hover': {
                                    bgcolor: 'rgba(65,105,225,0.3)',
                                  },
                                },
                              },
                            },
                          },
                        }}
                      >
                        <MenuItem value="">Todos los modelos</MenuItem>
                        {brandAnalytics && Object.keys(brandAnalytics.models).map((model) => (
                          <MenuItem key={model} value={model}>
                            {model}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {brandAnalytics && Object.keys(brandAnalytics.models).map((model) => (
                      <Chip
                        key={model}
                        label={`${model} (${brandAnalytics.models[model].totalScans})`}
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedModel(model)
                          setDataScope('model')
                        }}
                        disabled={loadingModel}
                        sx={{
                          bgcolor: model === selectedModel ? 'primary.main' : 'rgba(255,255,255,0.05)',
                          color: 'white',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: model === selectedModel ? 'primary.dark' : 'rgba(255,255,255,0.1)',
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </MotionBox>

          {/* Model Stats Section - Only show when a model is selected */}
          <Collapse in={!!selectedModel}>
            <Box sx={{ position: 'relative' }}>
              {loadingModel && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.7)',
                  zIndex: 1,
                  borderRadius: 1
                }}>
                  <CircularProgress />
                </Box>
              )}
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{ mb: 4 }}
              >
                <Card sx={{ 
                  background: 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 3
                    }}>
                      <Box sx={{ 
                        p: 2,
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #00C85320, #4169E140)',
                        color: '#00C853',
                      }}>
                        <TimelineIcon sx={{ fontSize: 40 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ 
                          color: 'white',
                          fontWeight: 600,
                          mb: 0.5
                        }}>
                          Análisis de {selectedBrand} {selectedModel}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          Estadísticas detalladas del modelo
                        </Typography>
                      </Box>
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: 'white', mb: 2 }}>
                            Distribución de Precios
                          </Typography>
                          <Box sx={{ height: 300 }}>
                            <ResponsiveContainer>
                              <BarChart
                                data={getPriceDistributionData(modelAnalytics || null)}
                                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis 
                                  dataKey="label" 
                                  stroke="rgba(255,255,255,0.5)"
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis stroke="rgba(255,255,255,0.5)" />
                                <Tooltip
                                  contentStyle={{
                                    background: 'rgba(0,0,0,0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'white'
                                  }}
                                  formatter={(value) => [`${value} coches`, 'Cantidad']}
                                  labelFormatter={(label) => label}
                                />
                                <Bar dataKey="count" fill="#00C853" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: 'white', mb: 2 }}>
                            Rango de Años
                          </Typography>
                          <Box sx={{ px: 3, pt: 2, pb: 4 }}>
                            <Slider
                              value={yearRange}
                              onChange={(_, newValue) => setYearRange(newValue as [number, number])}
                              min={availableYears[0]}
                              max={availableYears[1]}
                              step={1}
                              marks={[
                                { value: availableYears[0], label: availableYears[0].toString() },
                                { value: availableYears[1], label: availableYears[1].toString() }
                              ]}
                              valueLabelDisplay="on"
                              sx={{
                                '& .MuiSlider-rail': {
                                  backgroundColor: 'rgba(255,255,255,0.1)',
                                },
                                '& .MuiSlider-track': {
                                  backgroundColor: '#4169E1',
                                },
                                '& .MuiSlider-thumb': {
                                  backgroundColor: '#4169E1',
                                  '&:hover, &.Mui-focusVisible': {
                                    boxShadow: '0 0 0 8px rgba(65,105,225,0.16)',
                                  },
                                },
                                '& .MuiSlider-valueLabel': {
                                  backgroundColor: '#4169E1',
                                },
                                '& .MuiSlider-mark': {
                                  backgroundColor: 'rgba(255,255,255,0.3)',
                                },
                                '& .MuiSlider-markLabel': {
                                  color: 'rgba(255,255,255,0.5)',
                                },
                              }}
                            />
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </MotionBox>
            </Box>
          </Collapse>

          {/* Global Stats */}
          <Grid container spacing={3}>
            {baseAnalytics && [
              {
                title: 'Modo Rápido',
                description: 'Análisis automático de oportunidades en tiempo real',
                icon: <FlashOnIcon sx={{ fontSize: 40 }} />,
                color: '#FF4081',
                stats: [
                  { label: 'Análisis realizados', value: baseAnalytics.totalScans.toString() },
                  { label: 'Anuncios analizados', value: baseAnalytics.totalListingsAnalyzed.toLocaleString() },
                  { label: 'Tasa de validez', value: `${baseAnalytics.validListingsPercentage.toFixed(1)}%` },
                ],
                link: '/app/mercado/modo-rapido'
              },
              {
                title: 'Precios del Mercado',
                description: 'Análisis detallado de las fluctuaciones de precios',
                icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
                color: '#4169E1',
                stats: [
                  { label: 'Precio medio', value: formatPrice(baseAnalytics.averageMarketPrice) },
                  { label: 'Precio mediano', value: formatPrice(baseAnalytics.medianMarketPrice) },
                  { label: 'Última actualización', value: formatDate(baseAnalytics.lastUpdate) },
                ]
              },
              {
                title: 'Rangos de Precio',
                description: 'Distribución de vehículos por rango de precio',
                icon: <LocalOfferIcon sx={{ fontSize: 40 }} />,
                color: '#00C853',
                stats: [
                  { label: 'Menos de 10k', value: `${baseAnalytics.priceRanges.under5k + baseAnalytics.priceRanges['5kTo10k']} coches` },
                  { label: '10k - 30k', value: `${baseAnalytics.priceRanges['10kTo20k'] + baseAnalytics.priceRanges['20kTo30k']} coches` },
                  { label: 'Más de 30k', value: `${baseAnalytics.priceRanges['30kTo50k'] + baseAnalytics.priceRanges.over50k} coches` },
                ]
              },
              {
                title: 'Tipos de Combustible',
                description: 'Distribución por tipo de combustible',
                icon: <FuelIcon sx={{ fontSize: 40 }} />,
                color: '#FFB300',
                stats: Object.entries(baseAnalytics.fuelTypeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([type, count]) => ({
                    label: type,
                    value: `${count} búsquedas`
                  }))
              },
              {
                title: 'Distribución por Año',
                description: 'Análisis de rangos de año más buscados',
                icon: <CalendarIcon sx={{ fontSize: 40 }} />,
                color: '#FF5722',
                stats: Object.entries(baseAnalytics.yearDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([range, count]) => ({
                    label: range,
                    value: `${count} búsquedas`
                  }))
              }
            ].map((stat, index) => (
              <Grid item xs={12} md={6} key={stat.title}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
                >
                  <Card 
                    component={stat.link ? 'a' : 'div'}
                    href={stat.link}
                    sx={{ 
                      height: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: { xs: 3, md: 4 },
                      transition: 'all 0.3s ease-in-out',
                      textDecoration: 'none',
                      '&:hover': {
                        borderColor: stat.color,
                        background: 'rgba(255,255,255,0.03)',
                        transform: 'translateY(-4px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 3
                      }}>
                        <Box sx={{ 
                          p: 2,
                          borderRadius: '50%',
                          background: `linear-gradient(45deg, ${stat.color}20, ${stat.color}40)`,
                          color: stat.color,
                        }}>
                          {stat.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: 'white',
                            mb: 0.5
                          }}>
                            {stat.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {stat.description}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ 
                        borderColor: 'rgba(255,255,255,0.1)',
                        my: 2
                      }} />

                      <Grid container spacing={2}>
                        {stat.stats.map((item) => (
                          <Grid item xs={4} key={item.label}>
                            <Typography
                              variant="h6"
                              sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}
                            >
                              {item.value}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.75rem'
                              }}
                            >
                              {item.label}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      <Footer />
    </Box>
  )
} 