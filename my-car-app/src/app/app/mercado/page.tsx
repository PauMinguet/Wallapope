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
  Stack,
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

interface MarketAnalytics {
  totalScans: number
  averageMarketPrice: number
  medianMarketPrice: number
  totalListingsAnalyzed: number
  validListingsPercentage: number
  brandAnalysis: {
    [key: string]: {
      totalScans: number
      averagePrice: number
      totalListings: number
      models: string[]
      priceDistribution: {
        [year: string]: {
          ranges: {
            '0-5000': number
            '5000-10000': number
            '10000-15000': number
            '15000-20000': number
            '20000-30000': number
            '30000-50000': number
            '50000+': number
          }
        }
      }
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
  const [analytics, setAnalytics] = useState<MarketAnalytics | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('all')

  // Handle subscription check and redirect
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

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/market-analytics')
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const data = await response.json()
      setAnalytics(data)
      // Set first brand as default if none selected
      if (!selectedBrand && data.brandAnalysis) {
        const brands = Object.keys(data.brandAnalysis)
        if (brands.length > 0) {
          setSelectedBrand(brands[0])
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError('Error al cargar los datos del mercado')
    } finally {
      setLoading(false)
    }
  }, [selectedBrand])

  useEffect(() => {
    if (!initialLoad && !subscriptionLoading && isSignedIn) {
      fetchAnalytics()
    }
  }, [isSignedIn, initialLoad, subscriptionLoading, fetchAnalytics])

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

  const getBrandStats = () => {
    if (!analytics || !selectedBrand) return null
    return analytics.brandAnalysis[selectedBrand]
  }

  interface PriceRange {
    [key: string]: number
  }

  interface YearRanges {
    ranges: {
      [key: string]: number
    }
  }

  interface PriceDistribution {
    [year: string]: YearRanges
  }

  interface BrandStats {
    priceDistribution?: PriceDistribution
  }

  const getPriceDistributionData = (brandStats: BrandStats) => {
    if (!brandStats?.priceDistribution) return []

    const yearData = selectedYear === 'all' 
      ? Object.values(brandStats.priceDistribution).reduce((acc: PriceRange, curr: YearRanges) => {
          Object.entries(curr.ranges).forEach(([range, count]) => {
            acc[range] = (acc[range] || 0) + count
          })
          return acc
        }, {})
      : brandStats.priceDistribution[selectedYear]?.ranges || {}

    return Object.entries(yearData).map(([range, count]) => ({
      range: range,
      count: count,
    }))
  }

  const getAvailableYears = (brandStats: BrandStats) => {
    if (!brandStats?.priceDistribution) return []
    return Object.keys(brandStats.priceDistribution)
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

  const brandStats = getBrandStats()

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
              mb: 3,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 600
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Explora las tendencias actuales del mercado de coches de segunda mano. Datos actualizados en tiempo real para ayudarte a tomar mejores decisiones.
          </MotionTypography>

          {/* Brand Selector */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{ mb: 4 }}
          >
            <FormControl 
              fullWidth 
              variant="outlined" 
              sx={{ 
                maxWidth: 300,
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
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                {analytics && Object.entries(analytics.brandAnalysis)
                  .sort((a, b) => b[1].totalScans - a[1].totalScans)
                  .map(([brand, data]) => (
                    <MenuItem key={brand} value={brand}>
                      {brand} ({data.totalScans} análisis)
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          </MotionBox>

          {/* Brand Stats */}
          {brandStats && (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              sx={{ mb: 4 }}
            >
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 2,
                  color: 'white',
                  fontWeight: 600
                }}
              >
                Estadísticas de {selectedBrand}
              </Typography>
              <Grid container spacing={2}>
                {/* Brand Overview Card */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    height: '100%'
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
                          <CarIcon sx={{ fontSize: 40 }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ 
                            color: 'white',
                            fontWeight: 600,
                            mb: 0.5
                          }}>
                            Resumen de Marca
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Métricas principales
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ 
                        borderColor: 'rgba(255,255,255,0.1)',
                        my: 2
                      }} />

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {formatPrice(brandStats.averagePrice)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Precio medio
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {brandStats.totalScans}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Análisis realizados
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {brandStats.totalListings}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Anuncios analizados
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {brandStats.models.length}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Modelos diferentes
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Models Card */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    height: '100%'
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
                          background: 'linear-gradient(45deg, #FF408120, #9400D340)',
                          color: '#FF4081',
                        }}>
                          <AnalyticsIcon sx={{ fontSize: 40 }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ 
                            color: 'white',
                            fontWeight: 600,
                            mb: 0.5
                          }}>
                            Modelos Analizados
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Distribución por modelo
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ 
                        borderColor: 'rgba(255,255,255,0.1)',
                        my: 2
                      }} />

                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {brandStats.models.map((model) => (
                          <Chip
                            key={model}
                            label={model}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.05)',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.1)',
                              }
                            }}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Price Distribution Card */}
                <Grid item xs={12}>
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
                          <LocalOfferIcon sx={{ fontSize: 40 }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ 
                            color: 'white',
                            fontWeight: 600,
                            mb: 0.5
                          }}>
                            Distribución de Precios
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Análisis de precios para {selectedBrand}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ 
                        borderColor: 'rgba(255,255,255,0.1)',
                        my: 2
                      }} />

                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2
                      }}>
                        <Box>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {formatPrice(brandStats.averagePrice)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Precio medio
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {formatPrice(Math.min(...brandStats.models.map(() => brandStats.averagePrice * 0.8)))}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Precio mínimo
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                            {formatPrice(Math.max(...brandStats.models.map(() => brandStats.averagePrice * 1.2)))}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Precio máximo
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Price Distribution Graph Card */}
                <Grid item xs={12}>
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
                        mb: 3
                      }}>
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}>
                          <Box sx={{ 
                            p: 2,
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #FF408120, #4169E140)',
                            color: '#FF4081',
                          }}>
                            <TimelineIcon sx={{ fontSize: 40 }} />
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ 
                              color: 'white',
                              fontWeight: 600,
                              mb: 0.5
                            }}>
                              Distribución de Precios por Año
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              Análisis detallado de rangos de precio
                            </Typography>
                          </Box>
                        </Box>
                        <FormControl 
                          variant="outlined" 
                          size="small"
                          sx={{ 
                            minWidth: 120,
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
                          <InputLabel>Año</InputLabel>
                          <Select
                            value={selectedYear}
                            label="Año"
                            onChange={(e) => setSelectedYear(e.target.value)}
                          >
                            <MenuItem value="all">Todos</MenuItem>
                            {getAvailableYears(brandStats).map((year) => (
                              <MenuItem key={year} value={year}>
                                {year}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      <Divider sx={{ 
                        borderColor: 'rgba(255,255,255,0.1)',
                        my: 2
                      }} />

                      <Box sx={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart
                            data={getPriceDistributionData(brandStats)}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke="rgba(255,255,255,0.1)"
                            />
                            <XAxis 
                              dataKey="range"
                              stroke="rgba(255,255,255,0.5)"
                              tick={{ fill: 'rgba(255,255,255,0.5)' }}
                            />
                            <YAxis 
                              stroke="rgba(255,255,255,0.5)"
                              tick={{ fill: 'rgba(255,255,255,0.5)' }}
                            />
                            <Tooltip
                              contentStyle={{
                                background: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: 'white'
                              }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="#4169E1"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </MotionBox>
          )}

          {/* Global Stats */}
          <Grid container spacing={3}>
            {analytics && [
              {
                title: 'Modo Rápido',
                description: 'Análisis automático de oportunidades en tiempo real',
                icon: <FlashOnIcon sx={{ fontSize: 40 }} />,
                color: '#FF4081',
                stats: [
                  { label: 'Análisis realizados', value: analytics.totalScans.toString() },
                  { label: 'Anuncios analizados', value: analytics.totalListingsAnalyzed.toLocaleString() },
                  { label: 'Tasa de validez', value: `${analytics.validListingsPercentage.toFixed(1)}%` },
                ],
                link: '/app/mercado/modo-rapido'
              },
              {
                title: 'Precios del Mercado',
                description: 'Análisis detallado de las fluctuaciones de precios',
                icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
                color: '#4169E1',
                stats: [
                  { label: 'Precio medio', value: formatPrice(analytics.averageMarketPrice) },
                  { label: 'Precio mediano', value: formatPrice(analytics.medianMarketPrice) },
                  { label: 'Última actualización', value: formatDate(analytics.lastUpdate) },
                ]
              },
              {
                title: 'Rangos de Precio',
                description: 'Distribución de vehículos por rango de precio',
                icon: <LocalOfferIcon sx={{ fontSize: 40 }} />,
                color: '#00C853',
                stats: [
                  { label: 'Menos de 10k', value: `${analytics.priceRanges.under5k + analytics.priceRanges['5kTo10k']} coches` },
                  { label: '10k - 30k', value: `${analytics.priceRanges['10kTo20k'] + analytics.priceRanges['20kTo30k']} coches` },
                  { label: 'Más de 30k', value: `${analytics.priceRanges['30kTo50k'] + analytics.priceRanges.over50k} coches` },
                ]
              },
              {
                title: 'Tipos de Combustible',
                description: 'Distribución por tipo de combustible',
                icon: <FuelIcon sx={{ fontSize: 40 }} />,
                color: '#FFB300',
                stats: Object.entries(analytics.fuelTypeDistribution)
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
                stats: Object.entries(analytics.yearDistribution)
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