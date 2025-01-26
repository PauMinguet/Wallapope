'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Container, 
  Typography, 
  Button, 
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Box,
  Stack,
  Skeleton,
  Chip,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Notifications,
  DirectionsCar,
  LocalGasStation,
  Speed,
  BrandingWatermark,
  Settings,
  Place,
  LocationOn,
  CalendarToday,
  Email,
  NearMe,
} from '@mui/icons-material'
import { useUser } from '@clerk/nextjs'
import TopBar from '../../components/TopBar'
import { getCurrentUser } from '@/lib/db'
import { useSubscription } from '@/hooks/useSubscription'
import AlertDialogComponent from '../../components/AlertDialog'



interface Brand {
  id: number
  name: string
}

interface Model {
  id: number
  marca_id: number
  nome: string
}

interface Alert extends AlertFormData {
  id: string;
  created_at: string;
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
  min_price?: number;
  max_price?: number;
  email_notifications: boolean;
}

const defaultFormData: AlertFormData = {
  name: '',
  brand: '',
  model: '',
  min_year: '',
  max_year: '',
  engine: '',
  min_horse_power: '',
  gearbox: '',
  latitude: null,
  longitude: null,
  distance: 100,
  location_text: '',
  max_kilometers: 100000,
  email_notifications: true,
}




const LOCATION_STORAGE_KEY = 'user_location'


export default function AlertasPage() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [ , setFormData] = useState<AlertFormData>(defaultFormData)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ , setBrands] = useState<Brand[]>([])
  const [ , setModels] = useState<Model[]>([])
  const [ , setLoadingBrands] = useState(true)
  const [ , setLoadingModels] = useState(false)
  const [selectedBrand, ] = useState<Brand | null>(null)
  const [ , setLocationError] = useState<string | null>(null)
  const [ , setUserData] = useState<{ id: string } | null>(null)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)

  // Require at least 'basic' subscription to access alerts
  const { loading: subscriptionLoading } = useSubscription('basic')

  // Update the authentication check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    }
  }, [isSignedIn, isLoaded, router])

  const fetchUserData = useCallback(async () => {
    if (!user?.id) return
    const data = await getCurrentUser(user.id)
    setUserData(data)
  }, [user?.id])

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchUserData()
    }
  }, [isSignedIn, user?.id, fetchUserData])

  useEffect(() => {
    fetchBrands()
    if (isSignedIn) {
      fetchAlerts()
    }
  }, [isSignedIn])

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id.toString())
    } else {
      setModels([])
    }
  }, [selectedBrand])

  // Load user's default location when opening the dialog
  useEffect(() => {
    const loadUserLocation = async () => {
      if (!isSignedIn || !isDialogOpen || editingAlert) return

      // Try to get location from localStorage first
      const cachedLocation = localStorage.getItem(LOCATION_STORAGE_KEY)
      if (cachedLocation) {
        const data = JSON.parse(cachedLocation)
        setFormData(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
          location_text: `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
          distance: data.distance || 100
        }))
        return
      }

      // If not in localStorage, fetch from API
      try {
        const response = await fetch('/api/user/location')
        if (!response.ok) throw new Error('Failed to fetch location')
        
        const data = await response.json()
        if (data.latitude && data.longitude) {
          // Save to localStorage for future use
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(data))
          
          setFormData(prev => ({
            ...prev,
            latitude: data.latitude,
            longitude: data.longitude,
            location_text: `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
            distance: data.distance || 100
          }))
        }
      } catch (error) {
        console.error('Error loading location:', error)
        setLocationError('Error cargando la ubicación')
      }
    }

    loadUserLocation()
  }, [isSignedIn, isDialogOpen, editingAlert])

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

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/alerts')
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError('Error cargando las alertas')
    } finally {
      setLoading(false)
    }
  }


  const handleCreateAlert = async (formData: AlertFormData) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to create alert')
      await fetchAlerts()
    } catch (err) {
      console.error('Error creating alert:', err)
      setError('Error al crear la alerta')
    }
  }

  // Show loading state while checking authentication
  if (!isLoaded) {
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

  // Only return null if we're actually redirecting
  if (!isSignedIn && isLoaded) {
    return null
  }

  if (subscriptionLoading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#000000'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    )
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
        {/* Gradient blobs */}
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

      <Container maxWidth="lg" sx={{ py: { xs: 10, md: 12 }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Mis Alertas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingAlert(null)
              setIsDialogOpen(true)
            }}
            sx={{
              background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              fontWeight: 500,
              '&:hover': {
                background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
              }
            }}
          >
            Nueva Alerta
          </Button>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((n) => (
              <Grid item xs={12} key={n}>
                <Card sx={{ 
                  height: '100%',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <CardContent>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                        <Skeleton variant="text" width={200} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                      </Box>
                    </Box>

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
                            <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                            <Skeleton variant="text" width={100} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                          </Box>
                          <Stack spacing={1.5}>
                            {[1, 2, 3].map((item) => (
                              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Skeleton variant="circular" width={20} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                <Skeleton variant="text" width={140} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                              </Box>
                            ))}
                          </Stack>
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
                            <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                            <Skeleton variant="text" width={120} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                          </Box>
                          <Stack spacing={1.5}>
                            {[1, 2, 3, 4].map((item) => (
                              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Skeleton variant="circular" width={20} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                <Skeleton variant="text" width={160} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                              </Box>
                            ))}
                          </Stack>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                            <Skeleton variant="text" width={100} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                          </Box>
                          <Stack spacing={1.5}>
                            {[1, 2].map((item) => (
                              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Skeleton variant="circular" width={20} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                <Skeleton variant="text" width={140} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Notifications Section */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Skeleton variant="rounded" width={180} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 16 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : alerts.length > 0 ? (
          <Grid container spacing={3}>
            {alerts.map((alert) => (
              <Grid item xs={12} key={alert.id}>
                <Card 
                  onClick={() => router.push(`/app/alertas/${alert.id}`)}
                  sx={{ 
                    height: '100%',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      transform: 'translateY(-2px)',
                      '& .alert-title': {
                        background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1
                      }}>
                        <Notifications sx={{ color: 'white' }} />
                        <Typography 
                          variant="h6" 
                          className="alert-title"
                          sx={{ 
                            color: 'white', 
                            fontWeight: 500,
                            transition: 'all 0.3s ease-in-out'
                          }}
                        >
                          {alert.name}
                        </Typography>
                        <Typography
                          sx={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.875rem',
                            ml: 2,
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.3s ease',
                            '& .arrow': {
                              transition: 'transform 0.3s ease',
                              ml: 0.5,
                              opacity: 0.7
                            },
                            '.MuiCard-root:hover &': {
                              color: 'white',
                              '& .arrow': {
                                transform: 'translateX(4px)',
                                opacity: 1
                              }
                            }
                          }}
                        >
                          Ver detalles <span className="arrow">→</span>
                        </Typography>
                      </Box>
                    </Box>

                    {/* Details Grid */}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Place sx={{ color: 'white' }} />
                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                              Ubicación
                            </Typography>
                          </Box>
                          <Grid container spacing={2}>
                            {alert.location_text && (
                              <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LocationOn sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                  <Typography sx={{ color: 'white' }}>
                                    {alert.location_text}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                            {alert.distance && (
                              <Grid item xs={12}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <NearMe sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                  <Typography sx={{ color: 'white' }}>
                                    Radio de {alert.distance} km
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
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
            ))}
          </Grid>
        ) : (
          <Card sx={{ 
            p: 4, 
            textAlign: 'center',
            bgcolor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Typography variant="h6" gutterBottom>
              No tienes alertas configuradas
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
              Crea una alerta para recibir notificaciones cuando aparezcan coches que coincidan con tus criterios
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsDialogOpen(true)}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                }
              }}
            >
              Crear Primera Alerta
            </Button>
          </Card>
        )}

        {/* Create/Edit Alert Dialog */}
        <AlertDialogComponent
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          initialData={editingAlert || undefined}
          onSubmit={handleCreateAlert}
          isEditing={!!editingAlert}
        />
      </Container>
    </Box>
  )
} 