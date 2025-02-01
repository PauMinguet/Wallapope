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
} from '@mui/material'
import { motion } from 'framer-motion'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import ImportListingGrid, { ImportListing } from '@/app/components/ImportListingGrid'
import Footer from '@/app/components/Footer'
import { useSubscription } from '@/hooks/useSubscription'
import TopBar from '@/app/components/TopBar'

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

export default function ImportsPage() {
  const { isSubscribed: isPro, loading: subscriptionLoading } = useSubscription('pro')
  const [searchRuns, setSearchRuns] = useState<SearchRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false)

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
              Importaciones AutoScout24
            </MotionTypography>
          </Box>

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
        </Container>
      </Box>
      <Footer />
    </Box>
  )
} 