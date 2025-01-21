'use client'

import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Grid,
  Card,
  CardContent,
  Stack,
} from '@mui/material'
import { 
  Search,
  TrendingDown,
  Notifications,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import TopBar from './components/TopBar'
import { useState } from 'react'
import PricingSection from './components/PricingSection'
import Footer from './components/Footer'

const Chat = dynamic(() => import('./components/Chat'), {
  ssr: false,
})

const LiveActivityToast = dynamic(() => import('./components/LiveActivityToast'), {
  ssr: false,
})

const MotionTypography = motion.create(Typography)

export default function HomePage() {
  const router = useRouter()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)

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
    { number: '20%', label: 'Ahorro medio' },
    { number: '24/7', label: 'Monitorización' }
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
          {/* Hero Section */}
          <Box sx={{
            color: 'white',
            pt: { xs: 12, md: 14 },
            pb: { xs: 6, md: 8 },
            position: 'relative',
            overflow: 'hidden',
            minHeight: { xs: 'auto', md: 'auto' },
            display: 'flex',
            alignItems: 'center',
            textAlign: { xs: 'center', md: 'left' }
          }}>
            <Container maxWidth="lg">
              <Box sx={{ maxWidth: { xs: '100%', md: '70%' }, mx: { xs: 'auto', md: 0 } }}>
                <MotionTypography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '3rem', sm: '3.5rem', md: '5rem' },
                    fontWeight: 900,
                    lineHeight: { xs: 1.1, md: 1.1 },
                    background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: { xs: 2, md: 3 }
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
                    color: 'rgba(255,255,255,0.7)',
                    maxWidth: '600px',
                    lineHeight: 1.4,
                    mx: { xs: 'auto', md: 0 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  Análisis de mercado en tiempo real para encontrar las mejores ofertas
                </MotionTypography>
              </Box>
            </Container>
          </Box>

          {/* Stats Section - Moved up */}
          <Container maxWidth="lg" sx={{ 
            mb: { xs: 6, md: 8 },
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

          {/* Quick Search Section - Card Style */}
          <Container maxWidth="lg" sx={{ mb: { xs: 8, md: 10 } }}>
            <Card sx={{ 
              borderRadius: { xs: 3, md: 4 },
              background: 'transparent',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <CardContent sx={{ 
                p: { xs: 2, md: 3 },
                background: '#111111',
                borderRadius: { xs: 3, md: 4 }
              }}>
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: 'white',
                      textAlign: 'center',
                      mb: 0.5
                    }}
                  >
                    Prueba rápida 🚀
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      textAlign: 'center',
                      mb: 1,
                      maxWidth: 600,
                      mx: 'auto',
                      fontSize: '0.9rem',
                      lineHeight: 1.4
                    }}
                  >
                    Haz click en cualquier opción para ver una demo de búsqueda. 
                  </Typography>

                  {/* Makes Row */}
                  <Stack spacing={0.5} sx={{ width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: '0.85rem' }}>
                      Coches más buscados
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        flexWrap: 'wrap',
                        gap: 0.5,
                        justifyContent: 'center'
                      }}
                    >
                      {['Volkswagen Golf', 'BMW Serie 3', 'Mercedes Clase A', 'Audi A3', 'Seat León'].map((make, index) => (
                        <Button
                          key={make}
                          variant="contained"
                          onClick={() => setSelectedModel(selectedModel === make ? null : make)}
                          sx={{
                            background: [
                              'linear-gradient(45deg, rgba(65,105,225,0.7), rgba(107,35,142,0.7))',
                              'linear-gradient(45deg, rgba(107,35,142,0.7), rgba(148,0,211,0.7))',
                              'linear-gradient(45deg, rgba(44,62,147,0.7), rgba(65,105,225,0.7))',
                              'linear-gradient(45deg, rgba(148,0,211,0.7), rgba(65,105,225,0.7))',
                              'linear-gradient(45deg, rgba(65,105,225,0.7), rgba(44,62,147,0.7))',
                            ][index],
                            color: 'white',
                            borderRadius: '20px',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            border: selectedModel === make ? '2px solid white' : '2px solid transparent',
                            '&:hover': {
                              background: [
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(125,43,166,0.8))',
                                'linear-gradient(45deg, rgba(125,43,166,0.8), rgba(128,0,179,0.8))',
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(128,0,179,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(54,74,173,0.8))',
                              ][index],
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {make}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>

                  {/* Year Ranges Row */}
                  <Stack spacing={0.5} sx={{ width: '100%', mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: '0.85rem' }}>
                      Rango de años populares
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        flexWrap: 'wrap',
                        gap: 0.5,
                        justifyContent: 'center'
                      }}
                    >
                      {[
                        { range: '2020 - 2022' },
                        { range: '2017 - 2019' },
                        { range: '2014 - 2016' },
                        { range: '2011 - 2013' }
                      ].map((year, index) => (
                        <Button
                          key={year.range}
                          variant="contained"
                          onClick={() => setSelectedYear(selectedYear === year.range ? null : year.range)}
                          sx={{
                            background: [
                              'linear-gradient(45deg, rgba(65,105,225,0.7), rgba(44,62,147,0.7))',
                              'linear-gradient(45deg, rgba(107,35,142,0.7), rgba(65,105,225,0.7))',
                              'linear-gradient(45deg, rgba(148,0,211,0.7), rgba(107,35,142,0.7))',
                            ][index],
                            color: 'white',
                            borderRadius: '20px',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            border: selectedYear === year.range ? '2px solid white' : '2px solid transparent',
                            '&:hover': {
                              background: [
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(125,43,166,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(128,0,179,0.8), rgba(125,43,166,0.8))',
                              ][index],
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {year.range}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>

                  {/* Search Button */}
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push('/search')}
                    sx={{
                      mt: 2,
                      background: 'linear-gradient(45deg, rgba(44,62,147,0.8), rgba(107,35,142,0.8))',
                      color: 'white',
                      borderRadius: '28px',
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontSize: '1rem',
                      '&:hover': {
                        background: 'linear-gradient(45deg, rgba(54,74,173,0.9), rgba(125,43,166,0.9))',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Ver búsqueda avanzada 🔍
                  </Button>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center', mt: 0.5 }}>
                    Accede a todos los filtros y alertas automáticas con una de nuestras subscripciones a medida
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Container>

          {/* Features Section */}
          <Box sx={{ 
            position: 'relative',
            overflow: 'hidden',
            pb: { xs: 4, md: 6 },
          }}>
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
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
                </motion.div>
              </Box>

              <Grid container spacing={{ xs: 2, md: 4 }}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      viewport={{ once: true, margin: "-100px" }}
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
          <PricingSection onContactClick={() => setIsChatOpen(!isChatOpen)} />

          {/* CTA Section */}
          <Box sx={{ 
            py: { xs: 4, md: 6 },
            pb: { xs: 12, md: 16 },
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Container maxWidth="lg">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
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
                          onClick={() => router.push('/pricing')}
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

          {/* Footer */}
          <Footer />

        </Box>
      </Box>

      {/* Chat Component */}
      {isChatOpen && (
        <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}
      
      {/* Live Activity Toast */}
      <LiveActivityToast />

      {/* Floating Chat Button */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 32 },
          right: { xs: 16, md: 32 },
          zIndex: 1000
        }}
      >
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          variant="contained"
          sx={{
            borderRadius: '50%',
            width: { xs: 56, md: 64 },
            height: { xs: 56, md: 64 },
            minWidth: 'unset',
            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="white"/>
          </svg>
        </Button>
      </Box>
    </Box>
  )
} 