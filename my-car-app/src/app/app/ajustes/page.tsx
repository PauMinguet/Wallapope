'use client'

import { useState, useEffect } from 'react'
import { Container, Typography, Box, Paper, Stack, Switch, FormControlLabel, Button, Slider, CircularProgress } from '@mui/material'
import { motion } from 'framer-motion'
import { MyLocation } from '@mui/icons-material'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'

const MapComponent = dynamic(
  () => import('../../components/MapComponent'),
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

const distanceMarks = [
  { value: 0, label: '0', showOnMobile: true },
  { value: 20, label: '20' },
  { value: 40, label: '40' },
  { value: 60, label: '60', showOnMobile: true },
  { value: 80, label: '80' },
  { value: 100, label: '100', showOnMobile: true },
  { value: 120, label: '120' },
  { value: 140, label: '140' },
  { value: 160, label: '160' },
  { value: 180, label: '180' },
  { value: 200, label: '200', showOnMobile: true },
  { value: 300, label: '300', showOnMobile: true },
  { value: 400, label: '400' },
  { value: 500, label: 'No limit', showOnMobile: true }
]

const MotionTypography = motion(Typography)

const LOCATION_STORAGE_KEY = 'user_location'

export default function AjustesPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const { loading: subscriptionLoading, isSubscribed } = useSubscription()
  const [initialLoad, setInitialLoad] = useState(true)
  const [location, setLocation] = useState({
    latitude: SPAIN_CENTER.lat,
    longitude: SPAIN_CENTER.lng
  })
  const [distance, setDistance] = useState<number>(100)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600)
    }
    
    if (!initialLoad && !subscriptionLoading) {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [initialLoad, subscriptionLoading])

  // Load user's location and distance
  useEffect(() => {
    if (initialLoad || subscriptionLoading || !isSignedIn) return

    const loadUserLocation = async () => {
      // Try to get location from localStorage first
      const cachedLocation = localStorage.getItem(LOCATION_STORAGE_KEY)
      if (cachedLocation) {
        const data = JSON.parse(cachedLocation)
        setLocation({
          latitude: data.latitude,
          longitude: data.longitude
        })
        if (data.distance) {
          setDistance(data.distance)
        }
        return
      }

      try {
        const response = await fetch('/api/user/location')
        if (!response.ok) throw new Error('Failed to fetch location')
        
        const data = await response.json()
        if (data.latitude && data.longitude) {
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude
          })
          if (data.distance) {
            setDistance(data.distance)
          }
          // Save to localStorage for future use
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(data))
        }
      } catch (error) {
        console.error('Error loading location:', error)
        setLocationError('Error cargando la ubicación')
      }
    }

    loadUserLocation()
  }, [isSignedIn, initialLoad, subscriptionLoading])

  // Show loading screen during initial load or subscription check
  if (initialLoad || subscriptionLoading || !isLoaded) {
    return <LoadingScreen />
  }

  // Save location and distance when they change
  const saveLocation = async (newLocation: typeof location, newDistance: number) => {
    if (!isSignedIn) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/user/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          distance: newDistance
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save location')
      }

      // Update localStorage with new values
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        distance: newDistance
      }))
    } catch (error) {
      console.error('Error saving location:', error)
      setLocationError('Error al guardar la ubicación')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        setLocation(newLocation)
        saveLocation(newLocation, distance)
      },
      (error) => {
        setLocationError('Unable to retrieve your location')
        console.error('Geolocation error:', error)
      }
    )
  }

  const handleMapClick = (lat: number, lng: number) => {
    const newLocation = {
      latitude: lat,
      longitude: lng
    }
    setLocation(newLocation)
    saveLocation(newLocation, distance)
  }

  const handleDistanceChange = (_event: Event, newValue: number | number[]) => {
    const newDistance = newValue as number
    setDistance(newDistance)
    saveLocation(location, newDistance)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <MotionTypography
          variant="h1"
          sx={{
            fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' },
            fontWeight: 900,
            lineHeight: { xs: 1.1, md: 1.1 },
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Ajustes
        </MotionTypography>
      </Box>

      <Stack spacing={3}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Notificaciones
              </Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Notificar cuando haya nuevos chollos"
                  sx={{ 
                    '& .MuiFormControlLabel-label': { 
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.9rem'
                    }
                  }}
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Notificar cuando bajen los precios"
                  sx={{ 
                    '& .MuiFormControlLabel-label': { 
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.9rem'
                    }
                  }}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Preferencias de búsqueda
              </Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Mostrar solo coches con fotos"
                  sx={{ 
                    '& .MuiFormControlLabel-label': { 
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.9rem'
                    }
                  }}
                />
                <FormControlLabel
                  control={<Switch />}
                  label="Incluir coches de particulares"
                  sx={{ 
                    '& .MuiFormControlLabel-label': { 
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.9rem'
                    }
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
            Ubicación por defecto
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <Box sx={{ 
              width: '100%',
              height: '300px',
              border: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 1,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <MapComponent
                center={[location.latitude, location.longitude]}
                onLocationSelect={handleMapClick}
                distance={distance}
              />
            </Box>

            <Box sx={{ width: '100%', px: 2 }}>
              <Typography gutterBottom sx={{ color: 'white' }}>
                Radio de búsqueda: {distance === 500 ? 'Sin límite' : `${distance} km`}
              </Typography>
              <Slider
                value={distance}
                onChange={handleDistanceChange}
                step={null}
                marks={distanceMarks.map(mark => ({
                  value: mark.value,
                  label: mark.showOnMobile ? mark.label : (isMobile ? undefined : mark.label)
                }))}
                min={0}
                max={500}
                sx={{
                  color: 'white',
                  '& .MuiSlider-rail': {
                    backgroundColor: 'rgba(255,255,255,0.23)',
                  },
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                  },
                  '& .MuiSlider-thumb': {
                    backgroundColor: 'white',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: 'rgba(255,255,255,0.23)',
                  },
                  '& .MuiSlider-markLabel': {
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    transform: { 
                      xs: 'translate(-50%, 20px) scale(0.9)',
                      sm: 'translate(-50%, 20px)'
                    }
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleLocationRequest}
                startIcon={<MyLocation />}
                disabled={isSaving}
                sx={{ 
                  height: 36,
                  background: '#2C3E93',
                  color: 'rgba(255,255,255,0.95)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  fontWeight: 500,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                  },
                }}
              >
                Usar mi ubicación actual
              </Button>
              {isSaving && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Guardando...
                </Typography>
              )}
            </Box>

            {locationError && (
              <Typography color="error" variant="caption" textAlign="center">
                {locationError}
              </Typography>
            )}
          </Box>
        </Paper>
      </Stack>
    </Container>
  )
} 