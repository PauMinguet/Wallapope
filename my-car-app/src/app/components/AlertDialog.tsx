'use client'

import React, { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Stack,
  TextField,
  Box,
  Autocomplete,
  Button,
  ButtonGroup,
  FormControlLabel,
  Switch,
  Slider,
  MenuItem
} from '@mui/material'
import {
  Close,
  MyLocation,
  LocalGasStation,
  Speed,
  DirectionsCar
} from '@mui/icons-material'
import dynamic from 'next/dynamic'

// Dynamic import for the map component
const MapComponent = dynamic(
  () => import('./MapComponent'),
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

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: AlertFormData;
  onSubmit: (formData: AlertFormData) => Promise<void>;
  isEditing?: boolean;
}

export default function AlertDialog({ 
  open, 
  onClose, 
  initialData,
  onSubmit,
  isEditing = false 
}: AlertDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<AlertFormData>(defaultFormData)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loading, setLoading] = useState(false)
  const yearOptions = Array.from({ length: 36 }, (_, i) => (2025 - i).toString())

  useEffect(() => {
    setMounted(true)
    fetchBrands()
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      if (initialData.brand) {
        const brand = brands.find(b => b.name === initialData.brand)
        if (brand) {
          setSelectedBrand(brand)
          fetchModels(brand.id.toString())
        }
      }
    }
  }, [initialData, brands])

  // Separate useEffect for handling model selection after models are loaded
  useEffect(() => {
    if (initialData?.model && models.length > 0) {
      const model = models.find(m => m.nome === initialData.model)
      if (model) {
        setSelectedModel(model)
      }
    }
  }, [initialData?.model, models])

  useEffect(() => {
    const loadUserLocation = async () => {
      if (!open || isEditing) return;

      try {
        const response = await fetch('/api/user/location')
        if (!response.ok) throw new Error('Failed to fetch user location')
        const locationData = await response.json()

        if (locationData.latitude && locationData.longitude) {
          setFormData(prev => ({
            ...prev,
            latitude: Number(locationData.latitude),
            longitude: Number(locationData.longitude),
            location_text: `${locationData.latitude}, ${locationData.longitude}`,
            distance: locationData.distance || 100
          }))
        }
      } catch (err) {
        console.error('Error loading user location:', err)
      }
    }

    loadUserLocation()
  }, [open, isEditing])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/car-data?type=brands')
      if (!response.ok) throw new Error('Failed to fetch brands')
      const data = await response.json()
      setBrands(data || [])
    } catch (err) {
      console.error('Error fetching brands:', err)
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
    } finally {
      setLoadingModels(false)
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
      return
    }

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
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

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
          {isEditing ? 'Editar Alerta' : 'Nueva Alerta'}
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
                onChange={handleBrandChange}
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
                onChange={handleModelChange}
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

              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, color: 'rgba(255,255,255,0.9)' }}>
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
              {isEditing ? 'Guardar cambios' : 'Crear alerta'}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
} 