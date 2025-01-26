'use client'

import { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Box,
  CircularProgress,
} from '@mui/material'
import { 
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
  FlashOn as FlashOnIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '@/hooks/useSubscription'
import { motion } from 'framer-motion'

const MotionBox = motion(Box)
const MotionTypography = motion(Typography)

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

export default function DashboardPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const { loading: subscriptionLoading, isSubscribed } = useSubscription('basic')
  const [initialLoad, setInitialLoad] = useState(true)

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

  // Show loading screen during initial load or subscription check
  if (initialLoad || subscriptionLoading || !isLoaded) {
    return <LoadingScreen />
  }

  const featuredServices = [
    {
      title: 'Modo Rápido',
      description: 'Encuentra oportunidades únicas en tiempo real',
      longDescription: 'Accede a nuestro sistema de detección automática de oportunidades. Identifica coches con precios por debajo del mercado en tiempo real y sé el primero en contactar con el vendedor.',
      icon: <FlashOnIcon sx={{ fontSize: 40 }} />,
      href: '/app/coches',
      color: '#00C853',
      tiers: [
        { name: 'PRO', limit: '10 modelos', color: '#9400D3' },
        { name: 'COMPRAVENTA', limit: '500+ modelos', color: '#FFD700' }
      ]
    },
    {
      title: 'Sistema de Alertas',
      description: 'Monitorización automática del mercado',
      longDescription: 'Configura alertas personalizadas y recibe notificaciones cuando aparezcan coches que coincidan con tus criterios. Límites por plan: Básico (1 alerta), Pro (5 alertas), Compraventa (alertas ilimitadas).',
      icon: <NotificationsActiveIcon sx={{ fontSize: 40 }} />,
      href: '/app/alertas',
      color: '#9400D3',
      tiers: [
        { name: 'BÁSICO', limit: '1 alerta', color: '#64B5F6' },
        { name: 'PRO', limit: '5 alertas', color: '#9400D3' },
        { name: 'COMPRAVENTA', limit: 'Sin límite', color: '#FFD700' }
      ]
    },
    {
      title: 'Análisis de Mercado',
      description: 'Datos y estadísticas en tiempo real',
      longDescription: 'Accede a análisis detallados del mercado, tendencias de precios y estadísticas que te ayudarán a tomar mejores decisiones de compra y venta.',
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      href: '/app/search',
      color: '#4169E1',
      isPro: false,
    },
  ]
  
  const quickLinks = [
    {
      title: 'Buscar Coches',
      description: 'Búsqueda avanzada',
      icon: <SearchIcon sx={{ fontSize: 30 }} />,
      href: '/app/search',
      color: '#4169E1',
    },
    {
      title: 'Favoritos',
      description: 'Coches guardados',
      icon: <FavoriteIcon sx={{ fontSize: 30 }} />,
      href: '/app/liked',
      color: '#E91E63',
    },
    {
      title: 'Ajustes',
      description: 'Configuración',
      icon: <SettingsIcon sx={{ fontSize: 30 }} />,
      href: '/app/settings',
      color: '#757575',
    },
  ]

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
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            left: '20%',
            width: '40%',
            height: '60%',
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            filter: 'blur(150px)',
            opacity: 0.07,
            borderRadius: '50%',
            transform: 'rotate(-15deg)'
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
            Bienvenido a CholloCars
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
            Accede a todas las herramientas y servicios para encontrar las mejores oportunidades en el mercado de coches de segunda mano.
          </MotionTypography>

          {/* Featured Services */}
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3,
              color: 'white',
              fontWeight: 600
            }}
          >
            Servicios Destacados
          </Typography>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {featuredServices.map((service, index) => (
              <Grid item xs={12} md={4} key={service.title}>
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
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        borderColor: service.color,
                        background: 'rgba(255,255,255,0.03)'
                      }
                    }}
                    onClick={() => router.push(service.href)}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        p: 2,
                        borderRadius: '50%',
                        background: `linear-gradient(45deg, ${service.color}20, ${service.color}40)`,
                        color: service.color,
                        width: 'fit-content',
                        mb: 2
                      }}>
                        {service.icon}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600,
                          color: 'white'
                        }}>
                          {service.title}
                        </Typography>
                        {service.isPro && (
                          <Box sx={{ 
                            px: 1, 
                            py: 0.5, 
                            bgcolor: 'rgba(148,0,211,0.1)', 
                            border: '1px solid #9400D3',
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            color: '#9400D3',
                            fontWeight: 600
                          }}>
                            PRO
                          </Box>
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                        {service.description}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', mb: service.tiers ? 2 : 0 }}>
                        {service.longDescription}
                      </Typography>
                      {service.tiers && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {service.tiers.map((tier) => (
                            <Box
                              key={tier.name}
                              sx={{
                                px: 1,
                                py: 0.5,
                                bgcolor: `${tier.color}10`,
                                border: `1px solid ${tier.color}`,
                                borderRadius: 1,
                                fontSize: '0.7rem',
                                color: tier.color,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}
                            >
                              <span>{tier.name}</span>
                              <Box
                                component="span"
                                sx={{
                                  height: '12px',
                                  width: '1px',
                                  bgcolor: `${tier.color}40`
                                }}
                              />
                              <span>{tier.limit}</span>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>

          {/* Quick Links */}
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3,
              color: 'white',
              fontWeight: 600
            }}
          >
            Acceso Rápido
          </Typography>

          <Grid container spacing={2}>
            {quickLinks.map((link, index) => (
              <Grid item xs={12} sm={4} key={link.title}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + (index * 0.1) }}
                >
                  <Card 
                    sx={{ 
                      background: 'rgba(255,255,255,0.02)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: link.color,
                        background: 'rgba(255,255,255,0.03)'
                      }
                    }}
                    onClick={() => router.push(link.href)}
                  >
                    <CardContent sx={{ 
                      p: 2,
                      '&:last-child': { pb: 2 }
                    }}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        <Box sx={{ 
                          p: 1,
                          borderRadius: '50%',
                          background: `linear-gradient(45deg, ${link.color}20, ${link.color}40)`,
                          color: link.color
                        }}>
                          {link.icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600,
                            color: 'white',
                            lineHeight: 1.2
                          }}>
                            {link.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {link.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  )
} 