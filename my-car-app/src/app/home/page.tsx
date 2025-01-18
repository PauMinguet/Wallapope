'use client'

import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material'
import { 
  Search,
  TrendingDown,
  Notifications,
  CheckCircle,
  Star,
  Business,
  ArrowForward,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import TopBar from '../components/TopBar'

const Chat = dynamic(() => import('../components/Chat'), {
  ssr: false,
})

const LiveActivityToast = dynamic(() => import('../components/LiveActivityToast'), {
  ssr: false,
})

const MotionTypography = motion.create(Typography)

export default function HomePage() {
  const router = useRouter()

  const features = [
    {
      icon: <Search sx={{ fontSize: 40 }} />,
      title: 'Búsqueda Inteligente',
      description: 'Encuentra el coche perfecto con nuestros filtros avanzados'
    },
    {
      icon: <TrendingDown sx={{ fontSize: 40 }} />,
      title: 'Análisis de Mercado',
      description: 'Compara precios y encuentra las mejores ofertas'
    },
    {
      icon: <Notifications sx={{ fontSize: 40 }} />,
      title: 'Alertas Personalizadas',
      description: 'Recibe notificaciones cuando aparezcan nuevas ofertas'
    }
  ]

  const stats = [
    { number: '50K+', label: 'Coches analizados' },
    { number: '30%', label: 'Ahorro medio' },
    { number: '24/7', label: 'Monitorización' }
  ]

  const pricingTiers = [
    {
      title: 'Básico',
      price: '4,99€',
      period: '/mes',
      description: 'Perfecto para empezar a buscar tu coche ideal',
      features: [
        '1 búsqueda guardada',
        'Alertas por email',
        'Análisis básico de precios',
        'Actualizaciones diarias'
      ],
      icon: <Search sx={{ fontSize: 40 }} />,
      color: 'primary' as const
    },
    {
      title: 'Pro',
      price: '9,99€',
      period: '/mes',
      description: 'Para compradores serios que quieren las mejores ofertas',
      features: [
        '5 búsquedas guardadas',
        'Alertas instantáneas',
        'Análisis avanzado de precios',
        'Predicción de precios',
        'Historial de precios',
        'Soporte prioritario'
      ],
      icon: <Star sx={{ fontSize: 40 }} />,
      color: 'warning' as const,
      popular: true
    },
    {
      title: 'Empresas',
      price: '24,99€',
      period: '/mes',
      description: 'Solución completa para profesionales del sector',
      features: [
        'Búsquedas ilimitadas',
        'API de acceso',
        'Panel de control avanzado',
        'Análisis de mercado en tiempo real',
        'Soporte 24/7',
        'Integración personalizada'
      ],
      icon: <Business sx={{ fontSize: 40 }} />,
      color: 'primary' as const
    }
  ]

  return (
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
      '& .MuiContainer-root, & .MuiContainer-maxWidthLg': {
        background: 'transparent !important',
        bgcolor: 'transparent !important',
        '&::before, &::after': {
          background: 'transparent !important',
          bgcolor: 'transparent !important'
        }
      }
    }}>
      <TopBar />

      {/* Add padding to content to account for fixed header */}
      <Box sx={{ pt: { xs: 6, md: 8 } }}>
        {/* Fixed Background Pattern */}
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
          {/* Top Left Blob */}
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
          {/* Center Right Blob */}
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
          {/* Bottom Left Blob */}
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
          {/* Hero Section - Remove background blobs */}
          <Box sx={{
            color: 'white',
            pt: { xs: 2, md: 6 },
            pb: { xs: 8, md: 16 },
            position: 'relative',
            overflow: 'hidden',
            minHeight: { xs: 'calc(100vh - 64px)', md: '100vh' },
            display: 'flex',
            alignItems: 'center',
          }}>
            {/* Car Silhouette with Reflection */}
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              sx={{
                position: 'absolute',
                top: '80%',
                right: '0',
                width: '65%',
                height: '90%',
                transform: 'translateY(-50%)',
                opacity: 0.8,
                display: { xs: 'none', md: 'block' },
                zIndex: 3
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%'
                }}
              >
                {/* Reflection effect */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '-90%',
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'scaleY(-0.3)',
                    opacity: 0.3,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), transparent)',
                  }}
                >
                  <Image
                    src="/car-silouette.png"
                    alt="Car Reflection"
                    fill
                    style={{
                      objectFit: 'contain',
                      filter: 'brightness(0.5) blur(2px)',
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Container maxWidth="lg">
              <Grid container spacing={4} alignItems="center" sx={{ 
                background: 'transparent',
                '& .MuiGrid-root': {
                  background: 'transparent'
                }
              }}>
                <Grid item xs={12} md={7} sx={{ background: 'transparent' }}>
                  <Box sx={{ background: 'transparent' }}>
                    <MotionTypography
                      variant="h1"
                      sx={{
                        fontSize: { xs: '2.5rem', sm: '3rem', md: '5rem' },
                        fontWeight: 900,
                        mb: { xs: 1, md: 2 },
                        lineHeight: { xs: 1.2, md: 1.1 },
                        background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      Tu coche ideal al mejor precio
                    </MotionTypography>

                    <MotionTypography
                      variant="h4"
                      sx={{
                        fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                        fontWeight: 500,
                        mb: { xs: 3, md: 4 },
                        color: 'rgba(255,255,255,0.7)',
                        maxWidth: '600px',
                        lineHeight: 1.4
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    >
                      Análisis de mercado en tiempo real para encontrar las mejores ofertas
                    </MotionTypography>

                    {/* CTA Buttons */}
                    <Stack
                      component={motion.div}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1.5, sm: 2 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        href="/search"
                        fullWidth={true}
                        sx={{
                          background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                          borderRadius: '28px',
                          px: { xs: 3, md: 4 },
                          py: { xs: 1.25, md: 1.5 },
                          textTransform: 'none',
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          '&:hover': {
                            background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                          }
                        }}
                      >
                        Prueba Gratuita
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        fullWidth={true}
                        sx={{
                          borderColor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          borderRadius: '28px',
                          px: { xs: 3, md: 4 },
                          py: { xs: 1.25, md: 1.5 },
                          textTransform: 'none',
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          '&:hover': {
                            borderColor: 'white',
                            background: 'rgba(255,255,255,0.05)'
                          }
                        }}
                      >
                        Ver más
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Container>
          </Box>

          {/* Stats Section */}
          <Container maxWidth="lg" sx={{ 
            mt: { xs: -6, md: -8 }, 
            mb: { xs: 6, md: 12 },
            position: 'relative',
            zIndex: 2,
            px: { xs: 2, md: 3 },
          }}>
            <Card sx={{ 
              borderRadius: { xs: 3, md: 4 },
              boxShadow: 'none',
              background: 'transparent',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              zIndex: 2,
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent sx={{ 
                py: { xs: 2.5, md: 4 },
                px: { xs: 2, md: 3 },
                background: '#111111',
                borderRadius: { xs: 3, md: 4 }
              }}>
                <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="center">
                  {stats.map((stat, index) => (
                    <Grid item xs={4} key={index} sx={{ textAlign: 'center' }}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            fontWeight: 'bold', 
                            mb: { xs: 0.5, md: 1 },
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          {stat.number}
                        </Typography>
                        <Typography 
                          variant="subtitle1" 
                          sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                            color: 'rgba(255,255,255,0.7)'
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Container>

          {/* Features Section */}
          <Box sx={{ 
            position: 'relative',
            overflow: 'hidden',
            pb: { xs: 8, md: 12 },
          }}>
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 'bold', 
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  ¿Por qué elegirnos?
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  Herramientas avanzadas para una búsqueda inteligente
                </Typography>
              </Box>

              <Grid container spacing={{ xs: 2, md: 4 }}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Card sx={{ 
                        height: '100%',
                        borderRadius: { xs: 3, md: 4 },
                        transition: 'all 0.3s ease-in-out',
                        background: 'transparent',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          borderColor: '#4169E1',
                          background: 'rgba(255,255,255,0.03)'
                        }
                      }}>
                        <CardContent sx={{ 
                          textAlign: 'center', 
                          p: { xs: 3, md: 4 },
                          background: '#111111',
                          borderRadius: { xs: 3, md: 4 }
                        }}>
                          <Box sx={{ 
                            mb: { xs: 1.5, md: 2 },
                            display: 'inline-flex',
                            p: { xs: 1.5, md: 2 },
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            color: 'white'
                          }}>
                            {feature.icon}
                          </Box>
                          <Typography variant="h5" sx={{ 
                            mb: { xs: 1, md: 2 }, 
                            fontWeight: 'bold', 
                            color: 'white',
                            fontSize: { xs: '1.25rem', md: '1.5rem' }
                          }}>
                            {feature.title}
                          </Typography>
                          <Typography sx={{ 
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}>
                            {feature.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>

          {/* Pricing Section */}
          <Box sx={{ 
            py: { xs: 8, md: 12 }, 
            position: 'relative',
          }}>
            <Container maxWidth="lg">
              <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
                <Chip 
                  label="Precios" 
                  sx={{ 
                    mb: { xs: 1.5, md: 2 },
                    px: 2,
                    height: 32,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    '&:hover': {
                      background: 'rgba(255,255,255,0.08)'
                    }
                  }} 
                />
                <Typography variant="h3" sx={{ 
                  fontWeight: 'bold', 
                  mb: { xs: 1, md: 2 }, 
                  color: 'white',
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
                }}>
                  Planes que se adaptan a tus necesidades
                </Typography>
                <Typography variant="h6" sx={{ 
                  maxWidth: 600, 
                  mx: 'auto', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  Elige el plan que mejor se ajuste a ti y empieza a ahorrar en tu próximo coche
                </Typography>
              </Box>

              <Grid container spacing={{ xs: 2, md: 4 }} alignItems="stretch">
                {pricingTiers.map((tier, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      style={{ height: '100%' }}
                    >
                      <Card sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        borderRadius: { xs: 3, md: 4 },
                        background: 'transparent',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        transition: 'all 0.3s ease-in-out',
                        ...(tier.popular ? {
                          border: '1px solid #4169E1',
                          transform: { xs: 'scale(1.02)', md: 'scale(1.05)' },
                        } : {}),
                        '&:hover': {
                          transform: tier.popular ? 
                            { xs: 'scale(1.04)', md: 'scale(1.08)' } : 
                            { xs: 'scale(1.02)', md: 'scale(1.03)' },
                          borderColor: '#4169E1',
                          background: 'rgba(255,255,255,0.03)'
                        }
                      }}>
                        {tier.popular && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: { xs: 8, md: 12 },
                              right: { xs: 8, md: 12 },
                              background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                              color: 'white',
                              py: 0.5,
                              px: 2,
                              borderRadius: 2,
                              fontSize: { xs: '0.75rem', md: '0.875rem' },
                              fontWeight: 'bold',
                              boxShadow: '0 4px 12px rgba(65, 105, 225, 0.3)',
                              zIndex: 1
                            }}
                          >
                            Popular
                          </Box>
                        )}
                        <CardContent sx={{ 
                          p: { xs: 2.5, md: 4 }, 
                          flexGrow: 1,
                          background: '#111111',
                          borderRadius: { xs: 3, md: 4 }
                        }}>
                          <Box sx={{ 
                            mb: 3,
                            display: 'inline-flex',
                            p: 2,
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                            color: 'white',
                          }}>
                            {tier.icon}
                          </Box>
                          <Typography variant="h5" component="div" sx={{ 
                            fontWeight: 'bold', 
                            mb: 1,
                            color: 'white'
                          }}>
                            {tier.title}
                          </Typography>
                          <Typography sx={{ mb: 3, minHeight: 48, color: 'rgba(255,255,255,0.7)' }}>
                            {tier.description}
                          </Typography>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="h3" component="span" sx={{ 
                              fontWeight: 'bold',
                              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}>
                              {tier.price}
                            </Typography>
                            <Typography variant="subtitle1" component="span" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {tier.period}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 4 }}>
                            {tier.features.map((feature, idx) => (
                              <Box 
                                key={idx} 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  mb: 1,
                                  color: 'rgba(255,255,255,0.7)'
                                }}
                              >
                                <CheckCircle sx={{ mr: 1, fontSize: 20, color: '#4169E1' }} />
                                <Typography variant="body2">{feature}</Typography>
                              </Box>
                            ))}
                          </Box>
                          <Button
                            variant={tier.popular ? "contained" : "outlined"}
                            fullWidth
                            size="large"
                            endIcon={<ArrowForward />}
                            sx={{
                              py: 1.5,
                              borderRadius: '28px',
                              textTransform: 'none',
                              fontSize: '1rem',
                              ...(tier.popular ? {
                                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                                '&:hover': {
                                  background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                                  opacity: 0.9
                                }
                              } : {
                                borderColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                '&:hover': {
                                  borderColor: '#4169E1',
                                  background: 'rgba(255,255,255,0.05)'
                                }
                              })
                            }}
                          >
                            {tier.popular ? 'Empezar ahora' : 'Seleccionar plan'}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ textAlign: 'center', mt: 8 }}>
                <Typography variant="body1" sx={{ 
                  mb: 2, 
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  ¿Necesitas un plan personalizado para tu empresa?
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<ArrowForward />}
                  sx={{ 
                    fontWeight: 'bold',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: '28px',
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '1rem',
                    '&:hover': {
                      borderColor: '#4169E1',
                      background: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  Contacta con nosotros
                </Button>
              </Box>
            </Container>
          </Box>

          {/* CTA Section */}
          <Box sx={{ 
            py: { xs: 8, md: 12 },
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Container maxWidth="lg">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card sx={{ 
                  borderRadius: { xs: 3, md: 4 },
                  background: 'transparent',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.03)'
                  }
                }}>
                  <CardContent sx={{ 
                    p: { xs: 3, md: 6 }, 
                    position: 'relative', 
                    zIndex: 1,
                    background: '#111111',
                    borderRadius: { xs: 3, md: 4 }
                  }}>
                    <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
                      <Grid item xs={12} md={8}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 'bold', 
                          mb: { xs: 1, md: 2 },
                          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                          background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                          ¿Listo para encontrar tu coche ideal?
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          mb: { xs: 3, md: 4 }, 
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          Empieza tu búsqueda ahora y encuentra las mejores ofertas del mercado
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth={true}
                          onClick={() => router.push('/search')}
                          sx={{
                            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            borderRadius: '28px',
                            color: 'white',
                            px: { xs: 3, md: 4 },
                            py: { xs: 1.5, md: 2 },
                            textTransform: 'none',
                            fontSize: { xs: '0.9rem', md: '1rem' },
                            '&:hover': {
                              background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                            }
                          }}
                        >
                          Empezar ahora
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                  {/* Background decoration */}
                  <Box sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                    filter: 'blur(150px)',
                    opacity: 0.1
                  }} />
                </Card>
              </motion.div>
            </Container>
          </Box>
        </Box>
      </Box>

      {/* Chat component */}
      <Chat />
      
      {/* Live Activity Toast */}
      <LiveActivityToast />
    </Box>
  )
} 