'use client'

import { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  LocalOffer as LocalOfferIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'
import Footer from '../../components/Footer'

const MotionTypography = motion(Typography)
const MotionBox = motion(Box)

const marketStats = [
  {
    title: 'Tendencias de Precios',
    description: 'Análisis detallado de las fluctuaciones de precios en el mercado',
    icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
    color: '#4169E1',
    stats: [
      { label: 'Precio medio', value: '15.450€' },
      { label: 'Variación mensual', value: '-2.3%' },
      { label: 'Tendencia anual', value: '+5.8%' },
    ]
  },
  {
    title: 'Tiempo en Mercado',
    description: 'Estadísticas sobre el tiempo promedio de venta',
    icon: <TimelineIcon sx={{ fontSize: 40 }} />,
    color: '#9400D3',
    stats: [
      { label: 'Media días', value: '45' },
      { label: 'Coches rápidos', value: '15 días' },
      { label: 'Coches lentos', value: '90+ días' },
    ]
  },
  {
    title: 'Descuentos',
    description: 'Análisis de descuentos y oportunidades',
    icon: <LocalOfferIcon sx={{ fontSize: 40 }} />,
    color: '#00C853',
    stats: [
      { label: 'Descuento medio', value: '8.5%' },
      { label: 'Mayor descuento', value: '25%' },
      { label: 'Coches con descuento', value: '35%' },
    ]
  },
  {
    title: 'Velocidad de Mercado',
    description: 'Indicadores de actividad del mercado',
    icon: <SpeedIcon sx={{ fontSize: 40 }} />,
    color: '#FFB300',
    stats: [
      { label: 'Nuevos/día', value: '250+' },
      { label: 'Vendidos/día', value: '180+' },
      { label: 'Ratio venta', value: '72%' },
    ]
  },
]

export default function MercadoPage() {
  const router = useRouter()
  const { loading: subscriptionLoading, isSubscribed } = useSubscription('basic')
  const [ , setInitialLoad] = useState(true)

  // Handle subscription check
  useEffect(() => {
    if (!subscriptionLoading) {
      if (!isSubscribed) {
        router.push('/pricing')
      } else {
        setInitialLoad(false)
      }
    }
  }, [subscriptionLoading, isSubscribed, router])

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
            Análisis de Mercado
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
            Explora las tendencias actuales del mercado de coches de segunda mano. Datos actualizados en tiempo real para ayudarte a tomar mejores decisiones.
          </MotionTypography>

          <Grid container spacing={3}>
            {marketStats.map((stat, index) => (
              <Grid item xs={12} md={6} key={stat.title}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      background: 'rgba(255,255,255,0.02)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: { xs: 3, md: 4 },
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        borderColor: stat.color,
                        background: 'rgba(255,255,255,0.03)',
                        transform: 'translateY(-4px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 3
                      }}>
                        <Box sx={{ 
                          p: 2,
                          borderRadius: '50%',
                          background: `linear-gradient(45deg, ${stat.color}20, ${stat.color}40)`,
                          color: stat.color,
                        }}>
                          {stat.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: 'white',
                            mb: 0.5
                          }}>
                            {stat.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {stat.description}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ 
                        borderColor: 'rgba(255,255,255,0.1)',
                        my: 2
                      }} />

                      <Grid container spacing={2}>
                        {stat.stats.map((item) => (
                          <Grid item xs={4} key={item.label}>
                            <Typography
                              variant="h6"
                              sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}
                            >
                              {item.value}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.75rem'
                              }}
                            >
                              {item.label}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      <Footer />
    </Box>
  )
} 