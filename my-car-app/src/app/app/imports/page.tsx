/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Card,
  Grid,
  Button,
  CardContent,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
} from '@mui/material'
import { motion } from 'framer-motion'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import ImportListingGrid, { ImportListing } from '@/app/components/ImportListingGrid'
import Footer from '@/app/components/Footer'
import { useSubscription } from '@/hooks/useSubscription'
import TopBar from '@/app/components/TopBar'
import { SelectChangeEvent } from '@mui/material'

const MotionTypography = motion(Typography)

interface SearchRun {
  id: number
  model_key: string
  model_name: string
  registration_year_from: number
  registration_year_to: number
  horsepower_from: number
  max_price_eur: number
  created_at: string
  total_results: number
  listings: ImportListing[]
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

export default function ImportsPage() {
  const { isSubscribed: isPro, loading: subscriptionLoading } = useSubscription('pro')
  const [searchRuns, setSearchRuns] = useState<SearchRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false)
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    engine: '',
    gearbox: '',
    min_year: '',
    max_year: '',
    min_horse_power: '',
    max_price: '',
    max_kilometers: '',
    description: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Calculate tax values
  const importTax = 0 * 0.10
  const iva = (0 + importTax) * 0.21
  const totalCost = 0 + importTax + iva

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Fetch data
  useEffect(() => {
    if (!isPro) return; // Skip fetching if not pro

    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/imports/autoscout')
        if (!response.ok) throw new Error('Failed to fetch data')
        const data = await response.json()
        setSearchRuns(data)
      } catch (error) {
        console.error('Error fetching imports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isPro])

  // Fetch brands on component mount
  useEffect(() => {
    fetchBrands()
  }, [])

  // Fetch models when brand changes
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
      if (!response.ok) throw new Error('Error al cargar las marcas')
      const data = await response.json()
      setBrands(data || [])
    } catch (err) {
      console.error('Error al cargar las marcas:', err)
      setSubmitError('Error al cargar las marcas')
    } finally {
      setLoadingBrands(false)
    }
  }

  const fetchModels = async (brandId: string) => {
    setLoadingModels(true)
    try {
      const response = await fetch(`/api/car-data?type=models&brandId=${brandId}`)
      if (!response.ok) throw new Error('Error al cargar los modelos')
      const data = await response.json()
      setModels(data || [])
    } catch (err) {
      console.error('Error al cargar los modelos:', err)
      setSubmitError('Error al cargar los modelos')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    // Validate all fields are filled
    const requiredFields = [
      { key: 'brand' as keyof typeof formData, name: 'Marca' },
      { key: 'model' as keyof typeof formData, name: 'Modelo' },
      { key: 'engine' as keyof typeof formData, name: 'Motor' },
      { key: 'gearbox' as keyof typeof formData, name: 'Cambio' },
      { key: 'min_year' as keyof typeof formData, name: 'Año desde' },
      { key: 'max_year' as keyof typeof formData, name: 'Año hasta' },
      { key: 'min_horse_power' as keyof typeof formData, name: 'Potencia mínima' },
      { key: 'max_price' as keyof typeof formData, name: 'Precio máximo' },
      { key: 'max_kilometers' as keyof typeof formData, name: 'Kilómetros máximos' }
    ];

    const missingFields = requiredFields.filter(field => !formData[field.key]);
    
    if (missingFields.length > 0) {
      setSubmitError(`Por favor, completa los siguientes campos: ${missingFields.map(f => f.name).join(', ')}`);
      return;
    }

    try {
      setSubmitting(true)
      setSubmitError('')
      setSubmitSuccess(false)

      const response = await fetch('/api/car-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Error al enviar la solicitud')
      }

      setSubmitSuccess(true)
      setFormData({
        brand: '',
        model: '',
        engine: '',
        gearbox: '',
        min_year: '',
        max_year: '',
        min_horse_power: '',
        max_price: '',
        max_kilometers: '',
        description: ''
      })
    } catch (error) {
      console.error('Error al enviar el formulario:', error)
      setSubmitError('Error al enviar la solicitud. Por favor, inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
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

  // Loading state
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

  // Paywall for non-pro users
  if (!isPro) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: '#000000',
        color: 'white',
        position: 'relative'
      }}>
        <TopBar />
        
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
              bottom: '-10%',
              right: '20%',
              width: '40%',
              height: '60%',
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              filter: 'blur(150px)',
              opacity: 0.07,
              borderRadius: '50%',
              transform: 'rotate(15deg)'
            }}
          />
        </Box>

        <Container maxWidth="md" sx={{ 
          py: { xs: 10, md: 12 },
          position: 'relative',
          zIndex: 1,
          textAlign: 'center'
        }}>
          <Box sx={{ mb: 6 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 900,
                lineHeight: 1.2,
                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 3
              }}
            >
              Importación de Vehículos
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                mb: 4
              }}
            >
              Descubre oportunidades únicas importando coches desde Suiza
            </Typography>
          </Box>

          <Card sx={{ 
            bgcolor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.1)',
            p: 4,
            mb: 4
          }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Características Premium
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                    Análisis de Costes
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Desglose detallado de todos los costes de importación, incluyendo impuestos y tasas.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                    Búsqueda Automática
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Monitorización continua del mercado suizo para encontrar las mejores oportunidades.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                    Cálculo de Emisiones
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Estimación precisa de las tasas de CO2 y su impacto en el coste total.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                    Comparativa de Precios
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Análisis comparativo con el mercado español para identificar las mejores ofertas.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Button
              href="/pricing"
              variant="contained"
              size="large"
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: '28px',
                fontSize: '1.1rem',
                fontWeight: 500,
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                },
              }}
            >
              Actualizar a Pro
            </Button>
          </Card>

          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              mb: 4,
              fontStyle: 'italic'
            }}
          >
            Una vez tengamos los resultados de la búsqueda, te enviaremos un correo electrónico con las mejores opciones disponibles.
          </Typography>
        </Container>
        <Footer />
      </Box>
    )
  }

  // Main content for pro users
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      <TopBar />
      <Box sx={{ flex: 1 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Box sx={{ mb: { xs: 6, md: 8 } }}>
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
              Importación de Vehículos
            </MotionTypography>
             <MotionTypography
              variant="h3"
              sx={{
                fontSize: { xs: '0.8rem', sm: '1rem', md: '1.2rem' },
                fontWeight: 900,
                lineHeight: { xs: 1.1, md: 1.1 },
                background: 'white',
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
              Encuentra el Coche de tus Sueños desde el Extranjero
            </MotionTypography>
          </Box>

          {/* Search Form */}
          <Card sx={{ 
            mb: { xs: 6, md: 8 },
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
              <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
                Pidenos tu coche.
              </Typography>
              <Grid container spacing={3}>
                {/* First Row: Brand, Model, Engine, Transmission */}
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
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
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.23)',
                                }
                              }
                            }}
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
                    <Grid item xs={3}>
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
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.23)',
                                }
                              }
                            }}
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
                    <Grid item xs={3}>
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
                    <Grid item xs={3}>
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

                {/* Second Row: Years, Kilometers, Horsepower */}
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        name="min_year"
                        placeholder="Año desde"
                        value={formData.min_year}
                        onChange={handleInputChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        name="max_year"
                        placeholder="Año hasta"
                        value={formData.max_year}
                        onChange={handleInputChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        name="max_kilometers"
                        placeholder="Max km"
                        value={formData.max_kilometers}
                        onChange={handleInputChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        name="min_horse_power"
                        placeholder="Min CV"
                        value={formData.min_horse_power}
                        onChange={handleInputChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            }
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Third Row: Max Price and Description */}
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        name="max_price"
                        placeholder="Precio máximo"
                        value={formData.max_price}
                        onChange={handleInputChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={9}>
                      <TextField
                        fullWidth
                        size="small"
                        name="description"
                        placeholder="Descripción (opcional)"
                        value={formData.description}
                        onChange={handleInputChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.23)',
                            }
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Submit Button */}
                <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                  {submitError && (
                    <Typography color="error" sx={{ mb: 2 }}>
                      {submitError}
                    </Typography>
                  )}
                  {submitSuccess && (
                    <Typography sx={{ color: '#4CAF50', mb: 2 }}>
                      ¡Solicitud enviada con éxito!
                    </Typography>
                  )}
                  <Button 
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
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
                    {submitting ? 'Enviando...' : 'Enviar'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              mb: 4,
              fontStyle: 'italic'
            }}
          >
            Una vez tengamos los resultados de la búsqueda, te enviaremos un correo electrónico con las mejores opciones disponibles.
          </Typography>

          {false && (
            <>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Stack spacing={2}>
                  {searchRuns.map((run) => (
                    <Accordion
                      key={run.id}
                      expanded={expandedPanel === `panel-${run.id}`}
                      onChange={handleAccordionChange(`panel-${run.id}`)}
                      sx={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px !important',
                        '&:before': { display: 'none' },
                        border: '1px solid rgba(255,255,255,0.1)',
                        mb: 2,
                        '&.Mui-expanded': {
                          margin: '0 0 16px 0',
                        }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                        sx={{
                          '& .MuiAccordionSummary-content': {
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: { xs: 1, sm: 2 },
                          }
                        }}
                      >
                        <Typography sx={{ 
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: { xs: '1rem', sm: '1.1rem' }
                        }}>
                          {run.model_name}
                        </Typography>
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          spacing={1}
                          sx={{ 
                            flexGrow: 1,
                            alignItems: { xs: 'flex-start', sm: 'center' }
                          }}
                        >
                          <Chip
                            label={`${run.total_results} resultados`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Chip
                            label={`${run.registration_year_from}-${run.registration_year_to}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Chip
                            label={`≥${run.horsepower_from}cv`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Chip
                            label={`≤${run.max_price_eur}€`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Stack>
                        <Typography sx={{ 
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.8rem',
                          minWidth: 'fit-content'
                        }}>
                          {formatDate(run.created_at)}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <ImportListingGrid 
                          listings={run.listings}
                          loading={false}
                          showNoResults={run.listings.length === 0}
                        />
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Container>
      </Box>
      <Footer />
    </Box>
  )
} 