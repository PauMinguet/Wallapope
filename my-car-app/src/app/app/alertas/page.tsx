'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
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
  Stack,
  FormControlLabel,
  Switch,
  Skeleton,
  ButtonGroup,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  MyLocation,
  Notifications,
  DirectionsCar,
  LocalGasStation,
  Speed,
  Close,
} from '@mui/icons-material'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import TopBar from '../../components/TopBar'
import { getCurrentUser } from '@/lib/db'
import ListingsGrid from '../../components/ListingsGrid'
import { useSubscription } from '@/hooks/useSubscription'

// Dynamic import for the map component
const MapComponent = dynamic(
  () => import('../../components/MapComponent'),
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

interface Alert extends AlertFormData {
  id: string;
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

const LOCATION_STORAGE_KEY = 'user_location'

interface WallapopImage {
  large?: string;
  original: string;
}

interface WallapopLocation {
  city: string;
  postal_code: string;
}

interface WallapopContent {
  title: string;
  price: number;
  location: WallapopLocation;
  year: number;
  km: number;
  engine: string;
  gearbox: string;
  web_slug: string;
  horsepower: number;
  distance: number;
  images: WallapopImage[];
}

interface WallapopListing {
  id: string;
  content: WallapopContent;
}

interface WallapopResponse {
  listings: WallapopListing[];
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

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  editingAlert: Alert | null;
  formData: AlertFormData;
  handleInputChange: (name: string, value: string | number | boolean) => void;
  handleBrandChange: (event: React.SyntheticEvent | null, newValue: Brand | null) => void;
  handleModelChange: (event: React.SyntheticEvent | null, newValue: Model | null) => void;
  handleLocationRequest: () => void;
  handleMapClick: (lat: number, lng: number) => void;
  loading: boolean;
  selectedBrand: Brand | null;
  selectedModel: Model | null;
  loadingBrands: boolean;
  loadingModels: boolean;
  yearOptions: string[];
  handleSubmit: (e: React.FormEvent) => void;
  brands: Brand[];
  models: Model[];
}

const AlertDialog = ({ open, onClose, editingAlert, formData, handleInputChange, handleBrandChange, handleModelChange, handleLocationRequest, handleMapClick, loading, selectedBrand, selectedModel, loadingBrands, loadingModels, yearOptions, handleSubmit, brands, models }: AlertDialogProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(17,17,17,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'linear-gradient(45deg, rgba(44,62,147,0.3), rgba(107,35,142,0.3))',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        py: 2
      }}>
        <Typography variant="h6" sx={{ 
          color: 'white',
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}>
          {editingAlert ? 'Editar Alerta' : 'Nueva Alerta'}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Alert Name */}
          <TextField
            label="Nombre de la alerta"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.05)',
                width: '100%',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.7)',
              },
              '& .MuiOutlinedInput-input': {
                color: 'white',
              },
            }}
          />

          {/* Brand and Model Selection */}
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                options={brands || []}
                getOptionLabel={(option) => option.name}
                value={selectedBrand}
                onChange={(event, newValue) => handleBrandChange(event, newValue)}
                loading={loadingBrands}
                sx={{ flex: 1 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Marca"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.1)',
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

              <Autocomplete
                options={models || []}
                getOptionLabel={(option) => option.nome}
                value={selectedModel}
                onChange={(event, newValue) => handleModelChange(event, newValue)}
                loading={loadingModels}
                disabled={!selectedBrand}
                sx={{ flex: 1 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Modelo"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.1)',
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
            </Box>

            {/* Year Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Año
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  select
                  label="Desde"
                  value={formData.min_year}
                  onChange={(e) => handleInputChange('min_year', e.target.value)}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        style: {
                          maxHeight: 300
                        }
                      }
                    }
                  }}
                  sx={{
                    flexGrow: 1,
                    maxWidth: '150px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.1)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                    '& .MuiSelect-select': {
                      color: 'white',
                    },
                  }}
                >
                  <MenuItem value="">Cualquier año</MenuItem>
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Hasta"
                  value={formData.max_year}
                  onChange={(e) => handleInputChange('max_year', e.target.value)}
                  sx={{
                    flexGrow: 1,
                    maxWidth: '150px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.1)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                    '& .MuiSelect-select': {
                      color: 'white',
                    },
                  }}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        style: {
                          maxHeight: 300
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="">Cualquier año</MenuItem>
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            {/* Engine Type and Gearbox */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Motor
              </Typography>
              <ButtonGroup>
                <Button 
                  onClick={() => handleInputChange('engine', '')}
                  variant={formData.engine === '' ? 'contained' : 'outlined'}
                >
                  Todos
                </Button>
                <Button 
                  onClick={() => handleInputChange('engine', 'Gasolina')}
                  variant={formData.engine === 'Gasolina' ? 'contained' : 'outlined'}
                  startIcon={<LocalGasStation />}
                >
                  Gasolina
                </Button>
                <Button 
                  onClick={() => handleInputChange('engine', 'Diesel')}
                  variant={formData.engine === 'Diesel' ? 'contained' : 'outlined'}
                  startIcon={<DirectionsCar />}
                >
                  Diesel
                </Button>
              </ButtonGroup>

              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Cambio
              </Typography>
              <ButtonGroup>
                <Button 
                  onClick={() => handleInputChange('gearbox', '')}
                  variant={formData.gearbox === '' ? 'contained' : 'outlined'}
                >
                  Todos
                </Button>
                <Button 
                  onClick={() => handleInputChange('gearbox', 'Manual')}
                  variant={formData.gearbox === 'Manual' ? 'contained' : 'outlined'}
                >
                  Manual
                </Button>
                <Button 
                  onClick={() => handleInputChange('gearbox', 'Automático')}
                  variant={formData.gearbox === 'Automático' ? 'contained' : 'outlined'}
                >
                  Auto
                </Button>
              </ButtonGroup>
            </Box>

            {/* Horse Power */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Potencia mínima
              </Typography>
              <TextField
                type="number"
                value={formData.min_horse_power}
                onChange={(e) => handleInputChange('min_horse_power', e.target.value)}
                InputProps={{
                  endAdornment: <Speed sx={{ color: 'rgba(255,255,255,0.5)' }} />,
                }}
                sx={{
                  maxWidth: '150px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.1)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255,255,255,0.7)',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'white',
                  },
                }}
              />
            </Box>

            {/* Location and Distance */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Ubicación y radio de búsqueda
              </Typography>
              <Box sx={{ 
                width: '100%',
                height: '200px',
                border: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2
              }}>
                {mounted && (
                  <MapComponent
                    center={[formData.latitude || SPAIN_CENTER[0], formData.longitude || SPAIN_CENTER[1]]}
                    onLocationSelect={handleMapClick}
                    distance={formData.distance}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleLocationRequest}
                  startIcon={<MyLocation />}
                  sx={{ 
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Usar mi ubicación
                </Button>
              </Box>

              <Typography gutterBottom sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Radio: {formData.distance === 500 ? 'Sin límite' : `${formData.distance} km`}
              </Typography>
              <Slider
                value={formData.distance}
                onChange={(_, value) => handleInputChange('distance', Array.isArray(value) ? value[0] : value)}
                step={null}
                marks={distanceMarks}
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
                  },
                }}
              />
            </Box>

            {/* Max Kilometers */}
            <Box>
              <Typography gutterBottom sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Kilómetros máximos: {formData.max_kilometers === 240000 ? 'Sin límite' : `${formData.max_kilometers.toLocaleString()} km`}
              </Typography>
              <Slider
                value={formData.max_kilometers}
                onChange={(_, value) => handleInputChange('max_kilometers', Array.isArray(value) ? value[0] : value)}
                step={null}
                marks={kilometerMarks}
                min={0}
                max={240000}
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
            </Box>

            {/* Notifications */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Notificaciones
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={formData.email_notifications}
                      onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                    />
                  }
                  label="Email"
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

          {/* Submit Button */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                px: 4,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                },
              }}
            >
              {editingAlert ? 'Guardar cambios' : 'Crear alerta'}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default function AlertasPage() {
  const { isSignedIn, user, isLoaded } = useUser()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AlertFormData>(defaultFormData)
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
  const [, setLocationError] = useState<string | null>(null)
  const [,setUserData] = useState<{ id: string } | null>(null)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResults>>({})
  const [testingAlerts, setTestingAlerts] = useState<Record<string, boolean>>({})
  const [visibleTestResults, setVisibleTestResults] = useState<Record<string, boolean>>({})

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

  const handleInputChange = (name: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
      // Create a copy of formData and remove min_price and max_price if editing
      const submitData = { ...formData }
      if (editingAlert) {
        delete submitData.min_price
        delete submitData.max_price
      }

      const response = await fetch(
        editingAlert 
          ? `/api/alerts/${editingAlert.id}`
          : '/api/alerts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        }
      )

      if (!response.ok) throw new Error('Failed to save alert')

      await fetchAlerts()
      setIsDialogOpen(false)
      setEditingAlert(null)
      setFormData(defaultFormData)
    } catch (err) {
      console.error('Error saving alert:', err)
      setError('Error al guardar la alerta')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlert = useCallback(async (alertId: string) => {
    if (!alertId) return
    // ... rest of the delete logic ...
  }, [])

  const handleTestAlert = async (alert: Alert) => {
    setTestingAlerts(prev => ({ ...prev, [alert.id]: true }))
    // Automatically show results when testing
    setVisibleTestResults(prev => ({ ...prev, [alert.id]: true }))
    
    // Create initial search params
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

      const data = (await response.json()) as WallapopResponse
      
      console.log('=== Backend Response ===')
      console.log('Status:', response.status)
      console.log('Total Results:', data.listings?.length || 0)
      console.log('Market Data:', data.market_data)
      console.log('First 3 Listings:', data.listings?.slice(0, 3))
      console.log('====================')

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
      const transformedListings = data.listings?.map((listing: WallapopListing) => {
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
          distance: Math.round(listing.content.distance / 1000), // Convert meters to km
          listing_images: listing.content.images.map((img: WallapopImage) => ({
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

  const handleEditAlert = (alert: Alert) => {
    setEditingAlert(alert)
    setFormData({
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
      email_notifications: alert.email_notifications,
    })
    setIsDialogOpen(true)
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
                      <Box 
                        onClick={() => router.push(`/app/alertas/${alert.id}`)}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            '& .alert-title': {
                              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }
                          }
                        }}
                      >
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
                          onClick={() => handleEditAlert(alert)}
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
                                            {testResults[alert.id]?.market_data?.average_price_text || '0 €'}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                            Rango de Precios
                                          </Typography>
                                          <Typography sx={{ fontWeight: 'bold', color: 'white' }}>
                                            {testResults[alert.id]?.market_data?.min_price_text || '0 €'} - {testResults[alert.id]?.market_data?.max_price_text || '0 €'}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                      <Grid item>
                                        <Box sx={{ textAlign: 'center' }}>
                                          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', mb: 0.5 }}>
                                            Total Anuncios
                                          </Typography>
                                          <Typography sx={{ fontWeight: 'bold', color: 'white' }}>
                                            {testResults[alert.id]?.market_data?.total_listings || 0}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  </CardContent>
                                </Card>
                              </Box>
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
        <AlertDialog
          open={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setEditingAlert(null)
            setFormData(defaultFormData)
          }}
          editingAlert={editingAlert}
          formData={formData}
          handleInputChange={handleInputChange}
          handleBrandChange={handleBrandChange}
          handleModelChange={handleModelChange}
          handleLocationRequest={handleLocationRequest}
          handleMapClick={handleMapClick}
          loading={loading}
          selectedBrand={selectedBrand}
          selectedModel={selectedModel}
          loadingBrands={loadingBrands}
          loadingModels={loadingModels}
          yearOptions={yearOptions}
          handleSubmit={handleSubmit}
          brands={brands}
          models={models}
        />
      </Container>
    </Box>
  )
} 