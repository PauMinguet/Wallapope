'use client'

import { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  TrendingDown as TrendingDownIcon,
  LocationOn as LocationIcon,
  DirectionsCar as CarIcon,
  Speed as SpeedIcon,
  LocalGasStation as FuelIcon,
  Settings as GearboxIcon,
  Link as LinkIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'
import { createClient } from '../../../../utils/supabase/client'
import Image from 'next/image'

// Add dynamic rendering configuration
export const dynamic = 'force-dynamic'

interface ModoRapidoListing {
  id: string
  listing_id: string
  title: string
  price: number
  price_text: string
  market_price: number
  market_price_text: string
  price_difference: number
  price_difference_percentage: string
  location: string
  year: number
  kilometers: number
  fuel_type: string
  transmission: string
  url: string
  horsepower: number
  distance: number
  listing_images: { image_url: string }[]
  created_at: string
}

interface MarketData {
  id: string
  average_price: number
  median_price: number
  min_price: number
  max_price: number
  total_listings: number
  valid_listings: number
  created_at: string
}

interface ModoRapidoRun {
  id: string
  modo_rapido_id: string
  market_data_id: string
  created_at: string
  market_data: MarketData
  modo_rapido_listings: ModoRapidoListing[]
}

export default function ModoRapidoPage() {
  const router = useRouter()
  const { loading: subscriptionLoading, isSubscribed } = useSubscription('basic')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<ModoRapidoRun[]>([])

  useEffect(() => {
    if (!subscriptionLoading) {
      if (!isSubscribed) {
        router.push('/pricing')
      } else {
        fetchLatestRuns()
      }
    }
  }, [subscriptionLoading, isSubscribed, router])

  const fetchLatestRuns = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: runsData, error: runsError } = await supabase
        .from('modo_rapido_runs')
        .select(`
          *,
          market_data (*),
          modo_rapido_listings (*)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (runsError) throw runsError
      setRuns(runsData || [])
    } catch (err) {
      console.error('Error fetching runs:', err)
      setError('Error al cargar los resultados')
    } finally {
      setLoading(false)
    }
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
      bgcolor: '#000000',
      minHeight: '100vh',
      pb: 4
    }}>
      <Container maxWidth="lg">
        <Typography 
          variant="h4" 
          sx={{ 
            pt: 4,
            mb: 3,
            fontWeight: 700,
            color: 'white'
          }}
        >
          Modo Rápido - Últimos Resultados
        </Typography>

        {runs.map((run) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ 
              mb: 4,
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <CardContent>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Análisis realizado el {formatDate(run.created_at)}
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Precio Medio
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {run.market_data.average_price.toLocaleString('es-ES')}€
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Precio Mediano
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {run.market_data.median_price.toLocaleString('es-ES')}€
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total Anuncios
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {run.market_data.total_listings}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Anuncios Válidos
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {run.market_data.valid_listings}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                  Oportunidades Encontradas ({run.modo_rapido_listings.length})
                </Typography>

                <Grid container spacing={3}>
                  {run.modo_rapido_listings.map((listing) => (
                    <Grid item xs={12} md={6} key={listing.id}>
                      <Card sx={{ 
                        height: '100%',
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          borderColor: 'primary.main',
                        }
                      }}>
                        <CardContent>
                          <Box sx={{ position: 'relative', height: 200, mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                            {listing.listing_images?.[0]?.image_url ? (
                              <Image
                                src={listing.listing_images[0].image_url}
                                alt={listing.title}
                                fill
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <Box sx={{ 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                bgcolor: 'rgba(255,255,255,0.05)'
                              }}>
                                <CarIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.2)' }} />
                              </Box>
                            )}
                            <Box sx={{ 
                              position: 'absolute',
                              bottom: 8,
                              left: 8,
                              right: 8,
                              display: 'flex',
                              gap: 1
                            }}>
                              <Chip
                                icon={<TrendingDownIcon />}
                                label={`-${listing.price_difference_percentage}`}
                                color="success"
                                size="small"
                              />
                              <Chip
                                icon={<LocationIcon />}
                                label={`${listing.distance}km`}
                                size="small"
                                sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }}
                              />
                            </Box>
                          </Box>

                          <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                            {listing.title}
                          </Typography>

                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                Precio: {listing.price_text}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'line-through' }}>
                                Mercado: {listing.market_price_text}
                              </Typography>
                            </Grid>
                          </Grid>

                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Chip
                              icon={<SpeedIcon />}
                              label={`${listing.kilometers.toLocaleString()} km`}
                              size="small"
                              sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                            />
                            <Chip
                              icon={<FuelIcon />}
                              label={listing.fuel_type}
                              size="small"
                              sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                            />
                            <Chip
                              icon={<GearboxIcon />}
                              label={listing.transmission}
                              size="small"
                              sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {listing.location}
                            </Typography>
                            <Tooltip title="Ver anuncio">
                              <IconButton 
                                component="a" 
                                href={listing.url} 
                                target="_blank"
                                sx={{ color: 'primary.main' }}
                              >
                                <LinkIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Container>
    </Box>
  )
} 