'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { 
  Container, 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Popover,
} from '@mui/material'
import {
  Email,
  CalendarToday,
  DirectionsCar,
  BrandingWatermark,
  Settings,
  LocalGasStation,
  Speed,
  LocationOn,
  Place,
  History,
  ExpandMore,
  ExpandLess,
  LocalOffer,
  TrendingDown,
  NearMe,
  ArrowBack,
  Edit,
} from '@mui/icons-material'
import TopBar from '../../../components/TopBar'
import ListingsGrid from '../../../components/ListingsGrid'
import { formatPrice } from '@/lib/utils'
import dynamic from 'next/dynamic'
import AlertDialog from '../../../components/AlertDialog'
import Footer from '../../../components/Footer'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'

interface AlertRun {
  id: string;
  created_at: string;
  listings: Listing[];
  market_data: MarketData;
}

interface AlertRunWithExpanded extends AlertRun {
  expanded: boolean;
}

interface MarketData {
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  total_listings: number;
  valid_listings: number;
  sample_size: number;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  price_text: string;
  market_price: number;
  market_price_text: string;
  price_difference: number;
  price_difference_percentage: string;
  location: string;
  year: number;
  kilometers: number;
  fuel_type: string;
  transmission: string;
  url: string;
  horsepower: number;
  distance: number;
  listing_images: ListingImage[];
}

interface ListingImage {
  image_url: string;
}

interface Alert {
  id: string;
  name: string;
  brand: string;
  model: string;
  min_year: string;
  max_year: string;
  engine: string;
  min_horse_power: string;
  gearbox: string;
  latitude: number;
  longitude: number;
  distance: number;
  location_text: string;
  max_kilometers: number;
  email_notifications: boolean;
  created_at: string;
  user_id: string;
}

interface ApiListing {
  id: string;
  content: {
    title: string;
    price: number;
    location: {
      city: string;
      postal_code: string;
    };
    year: number;
    km: number;
    engine: string;
    gearbox: string;
    horsepower: number;
    distance: number;
    web_slug: string;
    images: Array<{
      large?: string;
      original: string;
    }>;
  };
}

interface ApiResponse {
  listings: ApiListing[];
  market_data?: {
    average_price: number;
    median_price: number;
    min_price: number;
    max_price: number;
    total_listings: number;
    valid_listings: number;
    sample_size: number;
  };
}

interface AlertFormData {
  name: string;
  brand: string;
  model: string;
  min_year: string;
  max_year: string;
  engine: string;
  min_horse_power: string;
  gearbox: string;
  latitude: number | null;
  longitude: number | null;
  distance: number;
  location_text: string;
  max_kilometers: number;
  email_notifications: boolean;
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Format time
  const time = date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  })

  // If it's today
  if (date.toDateString() === today.toDateString()) {
    return `Hoy a las ${time}`
  }
  
  // If it's yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer a las ${time}`
  }

  // If it's this year
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(' a las', ',')
  }

  // If it's a different year
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(' a las', ',')
}

const MapComponent = dynamic(() => import('../../../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <Box sx={{ 
      width: '100%', 
      height: 300, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: 'rgba(255,255,255,0.05)',
      borderRadius: 2
    }}>
      <CircularProgress sx={{ color: 'white' }} />
    </Box>
  )
})

export default function AlertDetailPage() {
  const pathname = usePathname()
  const id = pathname.split('/')[3]
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [alertRuns, setAlertRuns] = useState<AlertRunWithExpanded[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<AlertRun | null>(null)
  const [mapAnchorEl, setMapAnchorEl] = useState<HTMLElement | null>(null)
  const openMap = Boolean(mapAnchorEl)
  const [visibleTestResults, setVisibleTestResults] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // First get the user's data from Supabase
      const userResponse = await fetch(`/api/user`)
      if (!userResponse.ok) throw new Error('Failed to fetch user data')
      const userData = await userResponse.json()

      // Fetch alert details
      const alertResponse = await fetch(`/api/alerts/${id}`, {
        method: 'GET'
      })
      
      if (!alertResponse.ok) {
        if (alertResponse.status === 404) {
          router.push('/app/alertas')
          return
        }
        throw new Error('Failed to fetch alert')
      }
      
      const alertData = await alertResponse.json()

      // Check if the user owns this alert using the Supabase user ID
      if (alertData.user_id !== userData.id) {
        router.push('/app/alertas')
        return
      }

      setAlert(alertData)

      // Fetch alert runs
      const runsResponse = await fetch(`/api/alerts/${id}/runs`, {
        method: 'GET'
      })
      if (!runsResponse.ok) throw new Error('Failed to fetch alert runs')
      const runsData = await runsResponse.json()
      setAlertRuns(runsData.map((run: AlertRun) => ({ ...run, expanded: false })))
    } catch (err) {
      console.error('Error fetching alert details:', err)
      setError('Error cargando los detalles de la alerta')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push('/')
      return
    }

    loadData()
  }, [isSignedIn, isLoaded, loadData, router])

  const handleTestAlert = async () => {
    if (!alert) return
    
    setIsTesting(true)
    setError(null)

    const searchParams = {
      brand: alert.brand,
      model: alert.model,
      min_year: alert.min_year || undefined,
      max_year: alert.max_year || undefined,
      engine: alert.engine === 'Gasolina' ? 'gasoline' : 
              alert.engine === 'Diesel' ? 'gasoil' : 
              alert.engine === 'Eléctrico' ? 'electric' : 
              alert.engine === 'Híbrido' ? 'hybrid' : undefined,
      min_horse_power: alert.min_horse_power || undefined,
      gearbox: alert.gearbox === 'Manual' ? 'manual' : 
               alert.gearbox === 'Automático' ? 'automatic' : undefined,
      latitude: alert.latitude,
      longitude: alert.longitude,
      distance: alert.distance,
      max_kilometers: alert.max_kilometers
    }

    // Clean up empty values
    const cleanParams = Object.fromEntries(
      Object.entries(searchParams).filter(([, value]) => 
        value !== '' && 
        value !== null && 
        value !== undefined
      )
    );

    try {
      const response = await fetch(`${BACKEND_URL}/api/search-single-car`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanParams)
      })

      if (!response.ok) throw new Error('Failed to test alert')

      const data = await response.json() as ApiResponse
      console.log('Raw data:', data)

      // Transform market data
      const transformedMarketData = data.market_data ? {
        average_price: data.market_data.average_price,
        average_price_text: formatPrice(data.market_data.average_price),
        median_price: data.market_data.median_price,
        median_price_text: formatPrice(data.market_data.median_price),
        min_price: data.market_data.min_price,
        min_price_text: formatPrice(data.market_data.min_price),
        max_price: data.market_data.max_price,
        max_price_text: formatPrice(data.market_data.max_price),
        total_listings: data.market_data.total_listings,
        valid_listings: data.market_data.valid_listings,
        sample_size: data.market_data.sample_size
      } : undefined;

      // Transform listings to match the expected format
      const transformedListings = data.listings?.map((listing: ApiListing) => {
        const marketPrice = transformedMarketData?.median_price || 0;
        const price = listing.content.price;
        const priceDifference = marketPrice - price;
        const differencePercentage = (priceDifference / marketPrice) * 100;

        return {
          id: listing.id,
          title: listing.content.title,
          price: price,
          price_text: formatPrice(price),
          market_price: marketPrice,
          market_price_text: formatPrice(marketPrice),
          price_difference: priceDifference,
          price_difference_percentage: `${Math.abs(differencePercentage).toFixed(1)}%`,
          location: `${listing.content.location.city}, ${listing.content.location.postal_code}`,
          year: listing.content.year,
          kilometers: listing.content.km,
          fuel_type: listing.content.engine === 'gasoline' ? 'Gasolina' :
                    listing.content.engine === 'gasoil' ? 'Diesel' :
                    listing.content.engine === 'electric' ? 'Eléctrico' :
                    listing.content.engine === 'hybrid' ? 'Híbrido' :
                    listing.content.engine,
          transmission: listing.content.gearbox === 'manual' ? 'Manual' :
                       listing.content.gearbox === 'automatic' ? 'Automático' :
                       listing.content.gearbox,
          url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
          horsepower: listing.content.horsepower,
          distance: Math.round(listing.content.distance),
          listing_images: listing.content.images.map(img => ({
            image_url: img.large || img.original
          }))
        };
      }) || [];

      const transformedData: AlertRun = {
        id: new Date().toISOString(), // Generate a unique ID for the test run
        created_at: new Date().toISOString(),
        listings: transformedListings,
        market_data: data.market_data || {
          average_price: 0,
          median_price: 0,
          min_price: 0,
          max_price: 0,
          total_listings: 0,
          valid_listings: 0,
          sample_size: 0
        }
      };

      setTestResults(transformedData)
      
      // Save the test run
      await fetch(`/api/alerts/${alert.id}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedData)
      })

      // Refresh alert runs
      loadData()
    } catch (err) {
      console.error('Error testing alert:', err)
      setError('Error al probar la alerta')
    } finally {
      setIsTesting(false)
    }
  }

  const handleRunExpand = (runId: string) => {
    setAlertRuns(prevRuns => 
      prevRuns.map(run => ({
        ...run,
        expanded: run.id === runId ? !run.expanded : run.expanded
      }))
    )
  }

  const handleMapClick = (event: React.MouseEvent<HTMLElement>) => {
    setMapAnchorEl(event.currentTarget)
  }

  const handleMapClose = () => {
    setMapAnchorEl(null)
  }

  const handleEditAlert = async (formData: AlertFormData) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to update alert')
      await loadData()
      setIsEditDialogOpen(false)
    } catch (err) {
      console.error('Error updating alert:', err)
      setError('Error al actualizar la alerta')
    }
  }

  if (!isLoaded || loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: '#000000'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    )
  }

  if (!alert) return null

  return (
    <>
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
      color: 'white'
    }}>
      <TopBar />
      
      {/* Background Pattern */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <Box sx={{
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
        }} />
        <Box sx={{
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
        }} />
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 }, position: 'relative', zIndex: 1 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => router.push('/app/alertas')}
              sx={{ 
                color: 'white',
                '&:hover': {
                  background: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {alert.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setIsEditDialogOpen(true)}
              startIcon={<Edit />}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Editar
            </Button>
            <Button
              variant="contained"
              onClick={handleTestAlert}
              disabled={isTesting}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                }
              }}
            >
              {isTesting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Probar'}
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Alert Details Card */}
          <Grid item xs={12}>
            <Card sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent>
                <Grid container spacing={3}>
                  {/* Vehicle Section */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderRadius: 1,
                      height: '100%'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <DirectionsCar sx={{ color: 'white' }} />
                        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                          Vehículo
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        {alert.brand && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BrandingWatermark sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                {alert.brand} {alert.model}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {(alert.min_year || alert.max_year) && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CalendarToday sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                {alert.min_year && alert.max_year 
                                  ? `${alert.min_year} - ${alert.max_year}`
                                  : alert.min_year 
                                    ? `Desde ${alert.min_year}`
                                    : `Hasta ${alert.max_year}`
                                }
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Grid>

                  {/* Specifications Section */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderRadius: 1,
                      height: '100%'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Settings sx={{ color: 'white' }} />
                        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                          Especificaciones
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        {alert.engine && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocalGasStation sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                {alert.engine}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {alert.min_horse_power && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Speed sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                Mínimo {alert.min_horse_power} CV
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {alert.gearbox && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Settings sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                {alert.gearbox}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {alert.max_kilometers && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Speed sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                Máximo {alert.max_kilometers.toLocaleString()} km
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Grid>

                  {/* Location Section */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderRadius: 1,
                      height: '100%'
                    }}>
                      <Grid container spacing={2}>
                        {alert.location_text && (
                          <Grid item xs={12}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              borderRadius: 2,
                              p: 1,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.08)',
                              }
                            }}
                            onClick={handleMapClick}
                            >
                              <Place sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white', flex: 1 }}>
                                Ubicación
                              </Typography>
                              <IconButton 
                                size="small"
                                sx={{ 
                                  color: 'rgba(255,255,255,0.7)',
                                  '&:hover': {
                                    color: 'white',
                                    bgcolor: 'rgba(255,255,255,0.1)'
                                  }
                                }}
                              >
                                <LocationOn />
                              </IconButton>
                            </Box>
                          </Grid>
                        )}
                        {alert.distance && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOn sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                              <Typography sx={{ color: 'white' }}>
                                Radio de {alert.distance} km
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>

                      {/* Map Popover */}
                      <Popover
                        open={openMap}
                        anchorEl={mapAnchorEl}
                        onClose={handleMapClose}
                        anchorOrigin={{
                          vertical: 'center',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'center',
                          horizontal: 'left',
                        }}
                        sx={{
                          '& .MuiPopover-paper': {
                            bgcolor: 'rgba(0,0,0,0.9)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            width: 400,
                            height: 300
                          }
                        }}
                      >
                        <Box sx={{ height: 300 }}>
                          <MapComponent
                            center={[alert.latitude, alert.longitude]}
                            distance={alert.distance}
                          />
                        </Box>
                      </Popover>
                    </Box>
                  </Grid>
                </Grid>

                {/* Notifications */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {alert.email_notifications && (
                    <Chip 
                      icon={<Email sx={{ color: 'white !important' }} />}
                      label={`Resultados por email cada día a las ${new Date(alert.created_at).getHours().toString().padStart(2, '0')}:00`}
                      size="small"
                      sx={{
                        background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                        color: 'white',
                        '& .MuiChip-icon': {
                          color: 'white'
                        }
                      }}
                    />
                  )}
                  <Chip 
                    icon={<CalendarToday sx={{ color: 'white !important' }} />}
                    label={`Caduca el ${new Date(new Date(alert.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}`}
                    size="small"
                    sx={{
                      background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                      color: 'white',
                      '& .MuiChip-icon': {
                        color: 'white'
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Test Results */}
          {testResults && (
            <Grid item xs={12}>
              <Card sx={{ 
                bgcolor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <CardContent>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        Resultados de la Prueba
                      </Typography>
                      {testResults.market_data && (
                        <Box sx={{ display: 'flex', gap: 3 }}>
                          <Box>
                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                              Precio Medio
                            </Typography>
                            <Typography sx={{ 
                              color: 'white',
                              fontWeight: 'bold',
                              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}>
                              {formatPrice(testResults.market_data.average_price)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                              Total Anuncios
                            </Typography>
                            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                              {testResults.market_data.total_listings}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                    <Button
                      size="small"
                      onClick={() => setVisibleTestResults(!visibleTestResults)}
                      sx={{
                        color: 'white',
                        '&:hover': {
                          background: 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      {visibleTestResults ? 'Ocultar Detalles' : 'Mostrar Detalles'}
                    </Button>
                  </Box>

                  {visibleTestResults && (
                    <>
                      {testResults.market_data && (
                        <Box sx={{ 
                          display: 'flex',
                          justifyContent: 'center',
                          mt: 3,
                          mb: 3
                        }}>
                          <Card sx={{ 
                            bgcolor: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.1)',
                            maxWidth: 'fit-content'
                          }}>
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="subtitle1" sx={{ 
                                mb: 2, 
                                color: 'white',
                                textAlign: 'center',
                                fontWeight: 500,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                pb: 1
                              }}>
                                Análisis de Mercado
                              </Typography>
                              <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
                                <Grid item>
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                      Precio Medio
                                    </Typography>
                                    <Typography sx={{ 
                                      fontWeight: 'bold', 
                                      color: 'white',
                                      background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                                      backgroundClip: 'text',
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      fontSize: '1.25rem'
                                    }}>
                                      {formatPrice(testResults.market_data.average_price)}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item>
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                      Rango de Precios
                                    </Typography>
                                    <Typography sx={{ fontWeight: 'bold', color: 'white' }}>
                                      {formatPrice(testResults.market_data.min_price)} - {formatPrice(testResults.market_data.max_price)}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item>
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                      Total Anuncios
                                    </Typography>
                                    <Typography sx={{ fontWeight: 'bold', color: 'white' }}>
                                      {testResults.market_data.total_listings}
                                    </Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Box>
                      )}

                      <ListingsGrid 
                        listings={testResults.listings}
                        loading={isTesting}
                        showNoResults={!isTesting && (!testResults.listings || testResults.listings.length === 0)}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Alert Run History */}
          <Grid item xs={12}>
            <Card sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              mt: 3
            }}>
              <Box sx={{
                top: 8,
                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                borderRadius: '4px 4px 0 0',
                px: 4,
                py: 1.5,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}>
                <History sx={{ 
                  color: 'white',
                  fontSize: 28
                }} />
                <Typography variant="h6" sx={{ 
                  color: 'white', 
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  fontSize: '1.25rem'
                }}>
                  Historial de Ejecuciones
                </Typography>
              </Box>

              <CardContent sx={{ pt: 5, pb: 3 }}>
                {alertRuns.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    {alertRuns.map((run, ) => (
                      <Card key={run.id} sx={{
                        bgcolor: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 2,
                        border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.08)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                        }
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box 
                            onClick={() => handleRunExpand(run.id)}
                            sx={{ 
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              flexWrap: 'wrap'
                            }}>
                              <Typography sx={{ 
                                color: 'white',
                                fontWeight: 500,
                                fontSize: '1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: 'fit-content'
                              }}>
                                <CalendarToday sx={{ 
                                  fontSize: 20,
                                  color: 'rgba(255,255,255,0.7)'
                                }} />
                                {formatDateTime(run.created_at)}
                              </Typography>
                              
                              {run.market_data && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  gap: 2, 
                                  flexWrap: 'wrap',
                                  alignItems: 'center'
                                }}>
                                  {/* Best Deal Badge */}
                                  {run.listings.length > 0 && (
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      background: 'linear-gradient(45deg, rgba(46, 196, 182, 0.2), rgba(46, 196, 182, 0.1))',
                                      borderRadius: '20px',
                                      px: 2,
                                      py: 0.5,
                                      border: '1px solid rgba(46, 196, 182, 0.2)'
                                    }}>
                                      <LocalOffer sx={{ 
                                        color: '#2EC4B6',
                                        fontSize: 18
                                      }} />
                                      <Box>
                                        <Typography sx={{ 
                                          color: '#2EC4B6',
                                          fontWeight: 'bold',
                                          fontSize: '1rem',
                                          lineHeight: 1
                                        }}>
                                          {formatPrice(Math.min(...run.listings.map((l: Listing) => l.price)))}
                                        </Typography>
                                        <Typography sx={{ 
                                          color: 'rgba(46, 196, 182, 0.8)',
                                          fontSize: '0.7rem',
                                          lineHeight: 1
                                        }}>
                                          Mejor precio
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}

                                  {/* Price Below Market Badge */}
                                  {run.listings.some((l: Listing) => l.price < run.market_data.median_price) && (
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      background: 'linear-gradient(45deg, rgba(255, 99, 71, 0.2), rgba(255, 99, 71, 0.1))',
                                      borderRadius: '20px',
                                      px: 2,
                                      py: 0.5,
                                      border: '1px solid rgba(255, 99, 71, 0.2)'
                                    }}>
                                      <TrendingDown sx={{ 
                                        color: '#FF6347',
                                        fontSize: 18
                                      }} />
                                      <Box>
                                        <Typography sx={{ 
                                          color: '#FF6347',
                                          fontWeight: 'bold',
                                          fontSize: '1rem',
                                          lineHeight: 1
                                        }}>
                                          {run.listings.filter((l: Listing) => l.price < run.market_data.median_price).length}
                                        </Typography>
                                        <Typography sx={{ 
                                          color: 'rgba(255, 99, 71, 0.8)',
                                          fontSize: '0.7rem',
                                          lineHeight: 1
                                        }}>
                                          Bajo mercado
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}

                                  {/* Low Mileage Badge */}
                                  {run.listings.some((l: Listing) => l.kilometers < 100000) && (
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      background: 'linear-gradient(45deg, rgba(65, 105, 225, 0.2), rgba(65, 105, 225, 0.1))',
                                      borderRadius: '20px',
                                      px: 2,
                                      py: 0.5,
                                      border: '1px solid rgba(65, 105, 225, 0.2)'
                                    }}>
                                      <Speed sx={{ 
                                        color: '#4169E1',
                                        fontSize: 18
                                      }} />
                                      <Box>
                                        <Typography sx={{ 
                                          color: '#4169E1',
                                          fontWeight: 'bold',
                                          fontSize: '1rem',
                                          lineHeight: 1
                                        }}>
                                          {Math.min(...run.listings.map((l: Listing) => l.kilometers)).toLocaleString()}
                                        </Typography>
                                        <Typography sx={{ 
                                          color: 'rgba(65, 105, 225, 0.8)',
                                          fontSize: '0.7rem',
                                          lineHeight: 1
                                        }}>
                                          Menos km
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}

                                  {/* Nearby Badge */}
                                  {run.listings.some((l: Listing) => l.distance < 50) && (
                                    <Box sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      background: 'linear-gradient(45deg, rgba(50, 205, 50, 0.2), rgba(50, 205, 50, 0.1))',
                                      borderRadius: '20px',
                                      px: 2,
                                      py: 0.5,
                                      border: '1px solid rgba(50, 205, 50, 0.2)'
                                    }}>
                                      <NearMe sx={{ 
                                        color: '#32CD32',
                                        fontSize: 18
                                      }} />
                                      <Box>
                                        <Typography sx={{ 
                                          color: '#32CD32',
                                          fontWeight: 'bold',
                                          fontSize: '1rem',
                                          lineHeight: 1
                                        }}>
                                          {Math.min(...run.listings.map((l: Listing) => l.distance))} km
                                        </Typography>
                                        <Typography sx={{ 
                                          color: 'rgba(50, 205, 50, 0.8)',
                                          fontSize: '0.7rem',
                                          lineHeight: 1
                                        }}>
                                          Más cercano
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                            {run.expanded ? 
                              <ExpandLess sx={{ color: 'white' }} /> : 
                              <ExpandMore sx={{ color: 'white' }} />
                            }
                          </Box>

                          {run.expanded && (
                            <Box sx={{ mt: 3 }}>
                              {run.market_data && (
                                <Box sx={{ 
                                  display: 'flex',
                                  justifyContent: 'center',
                                  mb: 3
                                }}>
                                  <Card sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    maxWidth: 'fit-content'
                                  }}>
                                    <CardContent sx={{ p: 2 }}>
                                      <Typography variant="subtitle1" sx={{ 
                                        mb: 2, 
                                        color: 'white',
                                        textAlign: 'center',
                                        fontWeight: 500,
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        pb: 1
                                      }}>
                                        Análisis de Mercado
                                      </Typography>
                                      <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
                                        <Grid item>
                                          <Box sx={{ textAlign: 'center' }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                              Precio Medio
                                            </Typography>
                                            <Typography sx={{ 
                                              fontWeight: 'bold', 
                                              color: 'white',
                                              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                                              backgroundClip: 'text',
                                              WebkitBackgroundClip: 'text',
                                              WebkitTextFillColor: 'transparent',
                                              fontSize: '1.25rem'
                                            }}>
                                              {formatPrice(run.market_data.average_price)}
                                            </Typography>
                                          </Box>
                                        </Grid>
                                        <Grid item>
                                          <Box sx={{ textAlign: 'center' }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                              Rango de Precios
                                            </Typography>
                                            <Typography sx={{ fontWeight: 'bold', color: 'white' }}>
                                              {formatPrice(run.market_data.min_price)} - {formatPrice(run.market_data.max_price)}
                                            </Typography>
                                          </Box>
                                        </Grid>
                                        <Grid item>
                                          <Box sx={{ textAlign: 'center' }}>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                              Total Anuncios
                                            </Typography>
                                            <Typography sx={{ fontWeight: 'bold', color: 'white' }}>
                                              {run.market_data.total_listings}
                                            </Typography>
                                          </Box>
                                        </Grid>
                                      </Grid>
                                    </CardContent>
                                  </Card>
                                </Box>
                              )}
                              <ListingsGrid 
                                listings={run.listings}
                                loading={false}
                                showNoResults={!run.listings || run.listings.length === 0}
                              />
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    No hay ejecuciones registradas todavía
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <AlertDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        initialData={{
          name: alert.name,
          brand: alert.brand,
          model: alert.model,
          min_year: alert.min_year,
          max_year: alert.max_year,
          engine: alert.engine,
          min_horse_power: alert.min_horse_power,
          gearbox: alert.gearbox,
          latitude: alert.latitude,
          longitude: alert.longitude,
          distance: alert.distance,
          location_text: alert.location_text,
          max_kilometers: alert.max_kilometers,
          email_notifications: alert.email_notifications
        }}
        onSubmit={handleEditAlert}
        isEditing={true}
      />
    </Box>
    <Footer />
    </>
  )
} 