'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  FormGroup,
  FormControlLabel,
  Switch,
  Skeleton,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  MyLocation,
  Notifications,
  DirectionsCar,
  BrandingWatermark,
  CalendarToday,
  Settings,
  LocalGasStation,
  Speed,
  LocationOn,
  Place,
  RadioButtonChecked,
  Email,
  Sms,
} from '@mui/icons-material'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import TopBar from '../components/TopBar'
import { getCurrentUser } from '@/lib/db'
import ListingsGrid from '../components/ListingsGrid'

// Dynamic import for the map component
const MapComponent = dynamic(
  () => import('../components/MapComponent'),
  { 
    ssr: false,
    loading: () => null
  }
)

// Spain's center coordinates
const SPAIN_CENTER: [number, number] = [40.4637, -3.7492]

interface Brand {
  id: number
  name: string
}

interface Model {
  id: number
  marca_id: number
  nome: string
}

interface Alert {
  id: string;
  name: string;
  brand: string;
  model: string;
  min_year?: string;
  max_year?: string;
  engine?: string;
  min_horse_power?: string;
  gearbox?: string;
  latitude: number | null;
  longitude: number | null;
  distance: number;
  location_text: string;
  max_kilometers: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
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
  listing_images: Array<{ image_url: string }>;
}

interface MarketData {
  average_price: number;
  average_price_text: string;
  median_price: number;
  median_price_text: string;
  min_price: number;
  min_price_text: string;
  max_price: number;
  max_price_text: string;
  total_listings: number;
  valid_listings: number;
}

interface TestResults {
  alertId: string;
  listings: Listing[];
  market_data?: MarketData;
}

interface AlertFormData {
  name: string
  brand: string
  model: string
  min_year: string
  max_year: string
  engine: string
  min_horse_power: string
  gearbox: string
  latitude: number | null
  longitude: number | null
  distance: number
  location_text: string
  max_kilometers: number
  email_notifications: boolean
  sms_notifications: boolean
}

interface RawListing {
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
    web_slug: string;
    horsepower: number;
    distance: number;
    images: Array<{
      large?: string;
      original: string;
    }>;
  };
}

const initialFormData: AlertFormData = {
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
  sms_notifications: false,
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'

export default function AlertasPage() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AlertFormData>(initialFormData)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const yearOptions = Array.from({ length: 36 }, (_, i) => (2025 - i).toString())
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [,setUserData] = useState<{ id: string } | null>(null)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResults>>({})
  const [testingAlerts, setTestingAlerts] = useState<Record<string, boolean>>({})
  const [visibleTestResults, setVisibleTestResults] = useState<Record<string, boolean>>({})

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

  const handleBrandChange = (_event: React.SyntheticEvent | null, newValue: Brand | null) => {
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

  const handleMapClick = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location_text: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        editingAlert 
          ? `/api/alerts/${editingAlert.id}`
          : '/api/alerts',
        {
          method: editingAlert ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        }
      )

      if (!response.ok) throw new Error('Failed to save alert')

      await fetchAlerts()
      setIsDialogOpen(false)
      setEditingAlert(null)
      setFormData(initialFormData)
    } catch (err) {
      console.error('Error saving alert:', err)
      setError('Error al guardar la alerta')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete alert')

      await fetchAlerts()
    } catch (err) {
      console.error('Error deleting alert:', err)
      setError('Error al eliminar la alerta')
    }
  }

  const handleTestAlert = async (alert: Alert) => {
    setTestingAlerts(prev => ({ ...prev, [alert.id]: true }))
    // Automatically show results when testing
    setVisibleTestResults(prev => ({ ...prev, [alert.id]: true }))
    
    // Create initial search params
    const searchParams = {
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

    console.log('=== Testing Alert ===')
    console.log('Alert ID:', alert.id)
    console.log('Alert Name:', alert.name)
    console.log('Search Parameters:', cleanParams)
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/search-single-car`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanParams)
      })

      if (!response.ok) throw new Error('Failed to test alert')

      const data = await response.json()
      
      console.log('=== Backend Response ===')
      console.log('Status:', response.status)
      console.log('Total Results:', data.listings?.length || 0)
      console.log('Market Data:', data.market_data)
      console.log('First 3 Listings:', data.listings?.slice(0, 3))
      console.log('====================')

      // Transform market data
      const transformedMarketData = data.market_data ? {
        ...data.market_data,
        average_price_text: formatPrice(data.market_data.average_price),
        median_price_text: formatPrice(data.market_data.median_price),
        min_price_text: formatPrice(data.market_data.min_price),
        max_price_text: formatPrice(data.market_data.max_price)
      } : undefined;

      // Transform listings to match the expected format
      const transformedListings = data.listings?.map((listing: RawListing) => {
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
          fuel_type: listing.content.engine,
          transmission: listing.content.gearbox,
          url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
          horsepower: listing.content.horsepower,
          distance: listing.content.distance,
          listing_images: listing.content.images.map((img: RawListing['content']['images'][0]) => ({
            image_url: img.large || img.original
          }))
        };
      }) || [];
      
      setTestResults(prev => ({
        ...prev,
        [alert.id]: {
          alertId: alert.id,
          listings: transformedListings,
          market_data: transformedMarketData
        }
      }))
    } catch (err) {
      console.error('Error testing alert:', err)
      setError('Error al probar la alerta')
    } finally {
      setTestingAlerts(prev => ({ ...prev, [alert.id]: false }))
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
                      <Skeleton variant="rounded" width={160} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 16 }} />
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
                <Card sx={{ 
                  height: '100%',
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
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Notifications sx={{ color: 'white' }} />
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 500 }}>
                          {alert.name}
                        </Typography>
                      </Box>
                      <Box>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleTestAlert(alert)}
                          disabled={testingAlerts[alert.id]}
                          sx={{
                            mr: 2,
                            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            color: 'white',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                            }
                          }}
                        >
                          {testingAlerts[alert.id] ? (
                            <CircularProgress size={20} sx={{ color: 'white' }} />
                          ) : (
                            'Probar Alerta'
                          )}
                        </Button>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setEditingAlert(alert)
                            setFormData({
                              ...alert,
                              min_year: alert.min_year || '',
                              max_year: alert.max_year || '',
                              engine: alert.engine || '',
                              min_horse_power: alert.min_horse_power || '',
                              gearbox: alert.gearbox || '',
                            })
                            setIsDialogOpen(true)
                          }}
                          sx={{ 
                            color: 'white',
                            mr: 1,
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            }
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteAlert(alert.id)}
                          sx={{ 
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
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
                            <DirectionsCar sx={{ color: 'white' }} />
                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                              Vehículo
                            </Typography>
                          </Box>
                          <Stack spacing={1.5}>
                            {alert.brand && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BrandingWatermark sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  {alert.brand}
                                </Typography>
                              </Box>
                            )}
                            {alert.model && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DirectionsCar sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  {alert.model}
                                </Typography>
                              </Box>
                            )}
                            {(alert.min_year || alert.max_year) && (
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
                            )}
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
                            <Settings sx={{ color: 'white' }} />
                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                              Especificaciones
                            </Typography>
                          </Box>
                          <Stack spacing={1.5}>
                            {alert.engine && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocalGasStation sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  {alert.engine === 'gasoline' ? 'Gasolina' :
                                   alert.engine === 'diesel' ? 'Diésel' :
                                   alert.engine === 'electric' ? 'Eléctrico' :
                                   alert.engine === 'hybrid' ? 'Híbrido' :
                                   alert.engine === 'plug_in_hybrid' ? 'Híbrido Enchufable' :
                                   alert.engine}
                                </Typography>
                              </Box>
                            )}
                            {alert.min_horse_power && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Speed sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  Mínimo {alert.min_horse_power} CV
                                </Typography>
                              </Box>
                            )}
                            {alert.gearbox && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Settings sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  {alert.gearbox === 'manual' ? 'Manual' : 'Automático'}
                                </Typography>
                              </Box>
                            )}
                            {alert.max_kilometers && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Speed sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  Máximo {alert.max_kilometers.toLocaleString()} km
                                </Typography>
                              </Box>
                            )}
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
                            <LocationOn sx={{ color: 'white' }} />
                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                              Ubicación
                            </Typography>
                          </Box>
                          <Stack spacing={1.5}>
                            {alert.location_text && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Place sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  {alert.location_text}
                                </Typography>
                              </Box>
                            )}
                            {alert.distance && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <RadioButtonChecked sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                                <Typography sx={{ color: 'white' }}>
                                  Radio de {alert.distance} km
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Notifications Section */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {alert.email_notifications && (
                        <Chip 
                          icon={<Email sx={{ color: 'white !important' }} />}
                          label={`Resultados por email cada día a las ${new Date(alert.created_at).getHours()}:00 horas`}
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
                      {alert.sms_notifications && (
                        <Chip 
                          icon={<Sms sx={{ color: 'white !important' }} />}
                          label="Notificaciones por SMS" 
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
                        label={`Esta alerta caduca el ${new Date(new Date(alert.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}`}
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

                    {/* Test Results */}
                    {testResults[alert.id] && (
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 500 }}>
                            Resultados de la prueba
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => setVisibleTestResults(prev => ({
                              ...prev,
                              [alert.id]: !prev[alert.id]
                            }))}
                            sx={{
                              color: 'white',
                              '&:hover': {
                                background: 'rgba(255,255,255,0.1)'
                              }
                            }}
                          >
                            {visibleTestResults[alert.id] ? 'Ocultar Resultados' : 'Mostrar Resultados'}
                          </Button>
                        </Box>

                        {visibleTestResults[alert.id] && (
                          <>
                            {testResults[alert.id].market_data && (
                              <Card sx={{ 
                                mb: 3, 
                                bgcolor: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}>
                                <CardContent sx={{ p: 2 }}>
                                  <Grid container spacing={3} alignItems="center">
                                    <Grid item>
                                      <Typography variant="subtitle1" sx={{ mr: 3, color: 'white' }}>
                                        Análisis de Mercado
                                      </Typography>
                                    </Grid>
                                    <Grid item>
                                      <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                                        Media:
                                      </Typography>
                                      <Typography component="span" sx={{ mr: 3, fontWeight: 'bold', color: 'white' }}>
                                        {testResults[alert.id]?.market_data?.average_price_text || '0 €'}
                                      </Typography>
                                    </Grid>
                                    <Grid item>
                                      <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                                        Rango:
                                      </Typography>
                                      <Typography component="span" sx={{ mr: 3, fontWeight: 'bold', color: 'white' }}>
                                        {testResults[alert.id]?.market_data?.min_price_text || '0 €'} - {testResults[alert.id]?.market_data?.max_price_text || '0 €'}
                                      </Typography>
                                    </Grid>
                                    <Grid item>
                                      <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                                        Total anuncios:
                                      </Typography>
                                      <Typography component="span" sx={{ fontWeight: 'bold', color: 'white' }}>
                                        {testResults[alert.id]?.market_data?.total_listings || 0}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                            )}

                            <ListingsGrid 
                              listings={testResults[alert.id].listings}
                              loading={testingAlerts[alert.id]}
                              showNoResults={!testingAlerts[alert.id] && (!testResults[alert.id].listings || testResults[alert.id].listings.length === 0)}
                              sx={{ 
                                '& .MuiGrid-item': {
                                  '@media (min-width: 600px)': {
                                    flexBasis: '50%',
                                    maxWidth: '50%',
                                  },
                                  '@media (min-width: 960px)': {
                                    flexBasis: '33.333333%',
                                    maxWidth: '33.333333%',
                                  }
                                }
                              }}
                            />
                          </>
                        )}
                      </Box>
                    )}
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
        <Dialog 
          open={isDialogOpen} 
          onClose={() => {
            setIsDialogOpen(false)
            setEditingAlert(null)
            setFormData(initialFormData)
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: '#111111',
              backgroundImage: 'none',
              color: 'white'
            }
          }}
        >
          <DialogTitle>
            {editingAlert ? 'Editar Alerta' : 'Nueva Alerta'}
          </DialogTitle>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre de la alerta"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255,255,255,0.7)',
                      },
                      '& .MuiInputBase-input': {
                        color: 'white',
                      },
                    }}
                  />
                </Grid>

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
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingBrands ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'rgba(255,255,255,0.23)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255,255,255,0.5)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'white',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
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
                    disabled={!selectedBrand}
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
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'rgba(255,255,255,0.23)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255,255,255,0.5)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'white',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255,255,255,0.7)',
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Año desde</InputLabel>
                    <Select
                      name="min_year"
                      value={formData.min_year}
                      onChange={handleSelectChange}
                      label="Año desde"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      <MenuItem value="">Cualquier año</MenuItem>
                      {yearOptions.map((year) => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Año hasta</InputLabel>
                    <Select
                      name="max_year"
                      value={formData.max_year}
                      onChange={handleSelectChange}
                      label="Año hasta"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      <MenuItem value="">Cualquier año</MenuItem>
                      {yearOptions.map((year) => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Motor</InputLabel>
                    <Select
                      name="engine"
                      value={formData.engine}
                      onChange={handleSelectChange}
                      label="Motor"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      <MenuItem value="">Cualquier motor</MenuItem>
                      <MenuItem value="gasoline">Gasolina</MenuItem>
                      <MenuItem value="diesel">Diésel</MenuItem>
                      <MenuItem value="electric">Eléctrico</MenuItem>
                      <MenuItem value="hybrid">Híbrido</MenuItem>
                      <MenuItem value="plug_in_hybrid">Híbrido Enchufable</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Potencia mínima (CV)</InputLabel>
                    <Select
                      name="min_horse_power"
                      value={formData.min_horse_power}
                      onChange={handleSelectChange}
                      label="Potencia mínima (CV)"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      <MenuItem value="">Cualquier potencia</MenuItem>
                      <MenuItem value="75">75 CV</MenuItem>
                      <MenuItem value="100">100 CV</MenuItem>
                      <MenuItem value="150">150 CV</MenuItem>
                      <MenuItem value="200">200 CV</MenuItem>
                      <MenuItem value="300">300 CV</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Cambio</InputLabel>
                    <Select
                      name="gearbox"
                      value={formData.gearbox}
                      onChange={handleSelectChange}
                      label="Cambio"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      <MenuItem value="">Cualquier cambio</MenuItem>
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="automatic">Automático</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: 'white', mt: 2 }}>
                    Ubicación
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<MyLocation />}
                      onClick={handleLocationRequest}
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.23)',
                        '&:hover': {
                          borderColor: 'white',
                        },
                      }}
                    >
                      Usar mi ubicación
                    </Button>
                    {locationError && (
                      <Typography color="error" variant="body2">
                        {locationError}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ height: 300, mb: 2 }}>
                    <MapComponent
                      center={formData.latitude && formData.longitude ? 
                        [formData.latitude, formData.longitude] as [number, number] : 
                        SPAIN_CENTER
                      }
                      onLocationSelect={handleMapClick}
                      distance={formData.distance}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography gutterBottom>
                    Radio de búsqueda: {formData.distance} km
                  </Typography>
                  <Slider
                    value={formData.distance}
                    onChange={(_, value) => 
                      setFormData(prev => ({ ...prev, distance: value as number }))
                    }
                    min={0}
                    max={500}
                    step={null}
                    marks={distanceMarks}
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
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography gutterBottom>
                    Kilómetros máximos: {formData.max_kilometers === 240000 ? 'Sin límite' : `${formData.max_kilometers.toLocaleString()} km`}
                  </Typography>
                  <Slider
                    value={formData.max_kilometers}
                    onChange={(_, value) => 
                      setFormData(prev => ({ ...prev, max_kilometers: value as number }))
                    }
                    min={0}
                    max={240000}
                    step={null}
                    marks={kilometerMarks}
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
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: 'white', mt: 2 }}>
                    Notificaciones
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.email_notifications}
                          onChange={(e) => 
                            setFormData(prev => ({ 
                              ...prev, 
                              email_notifications: e.target.checked 
                            }))
                          }
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'white',
                              '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.08)',
                              },
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            },
                          }}
                        />
                      }
                      label="Notificaciones por email"
                      sx={{ color: 'white' }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.sms_notifications}
                          onChange={(e) => 
                            setFormData(prev => ({ 
                              ...prev, 
                              sms_notifications: e.target.checked 
                            }))
                          }
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'white',
                              '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.08)',
                              },
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            },
                          }}
                        />
                      }
                      label="Notificaciones por SMS"
                      sx={{ color: 'white' }}
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setIsDialogOpen(false)
                setEditingAlert(null)
                setFormData(initialFormData)
              }}
              sx={{ color: 'white' }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                }
              }}
            >
              {loading ? <CircularProgress size={24} /> : editingAlert ? 'Guardar Cambios' : 'Crear Alerta'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
} 