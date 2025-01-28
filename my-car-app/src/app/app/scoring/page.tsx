'use client'

import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  Tooltip,
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  LocalOffer as PriceIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'

const MotionTypography = motion(Typography)
const MotionBox = motion(Box)

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

interface DealScore {
  id: string
  title: string
  price: number
  marketPrice: number
  priceScore: number
  speedScore: number
  locationScore: number
  timeScore: number
  totalScore: number
  image: string
  url: string
  badges: {
    text: string
    color: string
  }[]
  scores: {
    category: string
    score: number
    icon: ReactElement
    color: string
    tooltip: string
  }[]
}

const mockDeals: DealScore[] = [
  {
    id: '1',
    title: 'BMW Serie 3 320d 2019',
    price: 25900,
    marketPrice: 29500,
    priceScore: 85,
    speedScore: 90,
    locationScore: 75,
    timeScore: 95,
    totalScore: 88,
    image: 'https://images.coches.com/_vn_/bmw/Serie-3/c005a31f27dd47b19f31c29fbf261814.jpg?p=cc_vn_high',
    url: '#',
    badges: [
      { text: 'CHOLLO', color: '#00C853' },
      { text: 'VENTA RÁPIDA', color: '#FFB300' }
    ],
    scores: [
      { 
        category: 'Precio',
        score: 85,
        icon: <PriceIcon />,
        color: '#00C853',
        tooltip: '12% por debajo del mercado'
      },
      {
        category: 'Demanda',
        score: 90,
        icon: <SpeedIcon />,
        color: '#2196F3',
        tooltip: 'Alta demanda en el mercado actual'
      },
      {
        category: 'Ubicación',
        score: 75,
        icon: <LocationIcon />,
        color: '#9C27B0',
        tooltip: 'Zona con compradores activos'
      },
      {
        category: 'Tiempo',
        score: 95,
        icon: <TimelineIcon />,
        color: '#FFB300',
        tooltip: 'Listado reciente, alta probabilidad de venta'
      }
    ]
  },
  {
    id: '2',
    title: 'Mercedes-Benz Clase A 180d 2020',
    price: 27500,
    marketPrice: 30000,
    priceScore: 80,
    speedScore: 85,
    locationScore: 90,
    timeScore: 70,
    totalScore: 82,
    image: 'https://images.coches.com/_vn_/mercedes/Clase-A/b005a31f27dd47b19f31c29fbf261814.jpg?p=cc_vn_high',
    url: '#',
    badges: [
      { text: 'BUENA COMPRA', color: '#2196F3' }
    ],
    scores: [
      { 
        category: 'Precio',
        score: 80,
        icon: <PriceIcon />,
        color: '#00C853',
        tooltip: '8% por debajo del mercado'
      },
      {
        category: 'Demanda',
        score: 85,
        icon: <SpeedIcon />,
        color: '#2196F3',
        tooltip: 'Demanda moderada-alta'
      },
      {
        category: 'Ubicación',
        score: 90,
        icon: <LocationIcon />,
        color: '#9C27B0',
        tooltip: 'Excelente ubicación para venta'
      },
      {
        category: 'Tiempo',
        score: 70,
        icon: <TimelineIcon />,
        color: '#FFB300',
        tooltip: '5 días en el mercado'
      }
    ]
  }
]

const getScoreColor = (score: number) => {
  if (score >= 85) return '#00C853'
  if (score >= 70) return '#2196F3'
  if (score >= 50) return '#FFB300'
  return '#F44336'
}

export default function ScoringPage() {
  const router = useRouter()
  const { loading: subscriptionLoading, isSubscribed, currentTier } = useSubscription('pro')
  const [initialLoad, setInitialLoad] = useState(true)
  const [deals, setDeals] = useState<DealScore[]>([])
  const [loading, setLoading] = useState(true)

  // Handle subscription check
  useEffect(() => {
    if (!subscriptionLoading) {
      if (!isSubscribed || (currentTier !== 'pro' && currentTier !== 'business')) {
        router.push('/pricing')
      } else {
        setInitialLoad(false)
        // Simulate API call
        setTimeout(() => {
          setDeals(mockDeals)
          setLoading(false)
        }, 1000)
      }
    }
  }, [subscriptionLoading, isSubscribed, currentTier, router])

  // Show loading screen during initial load or subscription check
  if (initialLoad || subscriptionLoading) {
    return <LoadingScreen />
  }

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
            Sistema de Scoring
          </MotionTypography>

          <MotionTypography 
            variant="body1" 
            sx={{ 
              mb: 6,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 600
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Análisis avanzado de oportunidades de mercado. Nuestro sistema evalúa cada vehículo en base a múltiples factores para identificar las mejores oportunidades.
          </MotionTypography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {deals.map((deal, index) => (
                <Grid item xs={12} key={deal.id}>
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card 
                      sx={{ 
                        background: 'rgba(255,255,255,0.02)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: { xs: 3, md: 4 },
                        transition: 'all 0.3s ease-in-out',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          background: 'rgba(255,255,255,0.03)',
                          '& .score-circle': {
                            transform: 'scale(1.1)'
                          }
                        }
                      }}
                      onClick={() => window.open(deal.url, '_blank')}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Grid container spacing={3}>
                          {/* Image and Main Score */}
                          <Grid item xs={12} md={3}>
                            <Box sx={{ 
                              position: 'relative',
                              height: '100%',
                              minHeight: 200,
                              borderRadius: 2,
                              overflow: 'hidden'
                            }}>
                              <Box
                                component="img"
                                src={deal.image}
                                alt={deal.title}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              <Box
                                className="score-circle"
                                sx={{
                                  position: 'absolute',
                                  top: 16,
                                  right: 16,
                                  width: 60,
                                  height: 60,
                                  borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.8)',
                                  backdropFilter: 'blur(10px)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexDirection: 'column',
                                  border: `2px solid ${getScoreColor(deal.totalScore)}`,
                                  transition: 'all 0.3s ease-in-out'
                                }}
                              >
                                <Typography
                                  variant="h6"
                                  sx={{
                                    color: getScoreColor(deal.totalScore),
                                    fontWeight: 700,
                                    lineHeight: 1
                                  }}
                                >
                                  {deal.totalScore}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '0.6rem'
                                  }}
                                >
                                  SCORE
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>

                          {/* Details */}
                          <Grid item xs={12} md={9}>
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                {deal.badges.map((badge) => (
                                  <Chip
                                    key={badge.text}
                                    label={badge.text}
                                    size="small"
                                    sx={{
                                      bgcolor: `${badge.color}20`,
                                      color: badge.color,
                                      border: `1px solid ${badge.color}`,
                                      fontWeight: 600
                                    }}
                                  />
                                ))}
                              </Box>
                              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                                {deal.title}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <Typography sx={{ color: getScoreColor(deal.priceScore), fontWeight: 700, fontSize: '1.2rem' }}>
                                  {deal.price.toLocaleString()}€
                                </Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>
                                  {deal.marketPrice.toLocaleString()}€
                                </Typography>
                              </Box>
                            </Box>

                            <Grid container spacing={2}>
                              {deal.scores.map((score) => (
                                <Grid item xs={6} sm={3} key={score.category}>
                                  <Box sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      <Box sx={{ color: score.color }}>
                                        {score.icon}
                                      </Box>
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        {score.category}
                                      </Typography>
                                      <Tooltip title={score.tooltip} arrow>
                                        <InfoIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', cursor: 'help' }} />
                                      </Tooltip>
                                    </Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={score.score}
                                      sx={{
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        borderRadius: 1,
                                        height: 6,
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: score.color,
                                          borderRadius: 1
                                        }
                                      }}
                                    />
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{
                                  color: 'white',
                                  borderColor: 'rgba(255,255,255,0.2)',
                                  '&:hover': {
                                    borderColor: 'rgba(255,255,255,0.4)',
                                    background: 'rgba(255,255,255,0.05)'
                                  }
                                }}
                              >
                                Ver Detalles
                              </Button>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </MotionBox>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  )
} 