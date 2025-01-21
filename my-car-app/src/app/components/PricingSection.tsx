'use client'

import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip 
} from '@mui/material'
import { 
  Search,
  Star,
  Business,
  ArrowForward,
  CheckCircle
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

interface PricingSectionProps {
  onContactClick: () => void;
}

export default function PricingSection({ onContactClick }: PricingSectionProps) {
  const router = useRouter()
  const { isSignedIn } = useUser()

  const pricingTiers = [
    {
      title: 'Básico',
      price: '3,99€',
      period: '/mes',
      description: 'Perfecto para empezar a buscar tu coche ideal',
      features: [
        '1 búsqueda guardada',
        'Alertas por email',
        'Análisis básico de precios',
        'Actualizaciones diarias'
      ],
      icon: <Search sx={{ fontSize: 40 }} />,
      color: 'primary' as const,
      tier: 'basic'
    },
    {
      title: 'Pro',
      price: '11,99€',
      period: '/mes',
      description: 'Para compradores serios que quieren las mejores ofertas',
      features: [
        '5 búsquedas guardadas',
        'Alertas personalizadas',
        'Análisis avanzado de precios',
        'Soporte prioritario',
        'Modo rápido: 10 chollos preconfiguradas',
      ],
      icon: <Star sx={{ fontSize: 40 }} />,
      color: 'warning' as const,
      popular: true,
      tier: 'pro'
    },
    {
      title: 'Compraventa',
      price: '39,99€',
      period: '/mes',
      description: 'Solución completa para profesionales del sector',
      features: [
        'Búsquedas ilimitadas',
        'Historial de precios',
        'Panel de control avanzado',
        'Modo rápido: Descubre chollos con solo deslizar',
        'Análisis de mercado en tiempo real',
        'Soporte 24/7',
        'Canal directo para sugerencias de mejoras o funciones personalizadas'
      ],
      icon: <Business sx={{ fontSize: 40 }} />,
      color: 'primary' as const,
      tier: 'business'
    }
  ]

  const handleSubscription = async (tier: string) => {
    if (!isSignedIn) {
      router.push('/sign-up')
      return
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      })

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
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
                      onClick={() => handleSubscription(tier.tier)}
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
            onClick={onContactClick}
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
  )
} 