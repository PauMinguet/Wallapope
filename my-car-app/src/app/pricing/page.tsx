'use client'

import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Chip,
} from '@mui/material'
import { motion } from 'framer-motion'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import TopBar from '../components/TopBar'
import PricingSection from '../components/PricingSection'

const Chat = dynamic(() => import('../components/Chat'), {
  ssr: false,
})

const benefits = [
  {
    title: 'Ahorra tiempo y dinero',
    description: 'Encuentra las mejores ofertas del mercado con nuestro análisis en tiempo real',
  },
  {
    title: 'Alertas personalizadas',
    description: 'Recibe notificaciones cuando aparezcan coches que coincidan con tus criterios',
  },
  {
    title: 'Análisis de mercado',
    description: 'Accede a datos detallados sobre precios y tendencias del mercado',
  },
  {
    title: 'Soporte premium',
    description: 'Obtén ayuda personalizada de nuestro equipo de expertos',
  }
]

export default function PricingPage() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
      color: 'white'
    }}>
      <TopBar />
      
      {/* Background Pattern */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        overflow: 'hidden'
      }}>
        {/* Gradient blobs */}
        <Box sx={{
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
        }} />
        <Box sx={{
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
        }} />
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 12, md: 16 }, pb: { xs: 6, md: 8 }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Chip 
              label="Planes y precios" 
              sx={{ 
                mb: { xs: 1.5, md: 2 },
                px: 2,
                height: 32,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: { xs: '0.75rem', md: '0.875rem' }
              }} 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Typography variant="h2" sx={{ 
              fontWeight: 'bold',
              mb: 2,
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' }
            }}>
              Encuentra tu coche ideal
            </Typography>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Typography variant="h5" sx={{ 
              maxWidth: 800,
              mx: 'auto',
              mb: 4,
              color: 'rgba(255,255,255,0.7)',
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
              lineHeight: 1.5
            }}>
              Accede a herramientas avanzadas y análisis en tiempo real para encontrar las mejores ofertas del mercado
            </Typography>
          </motion.div>
        </Box>

        {/* Benefits Section */}
        <Grid container spacing={3} sx={{ mb: { xs: 8, md: 12 } }}>
          {benefits.map((benefit, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              >
                <Card sx={{ 
                  background: 'transparent',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    borderColor: '#4169E1',
                    background: 'rgba(255,255,255,0.03)',
                    transform: 'translateY(-4px)'
                  }
                }}>
                  <CardContent sx={{ 
                    p: 3,
                    background: '#111111'
                  }}>
                    <Typography variant="h6" sx={{ 
                      mb: 1,
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      {benefit.title}
                    </Typography>
                    <Typography sx={{ 
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.95rem'
                    }}>
                      {benefit.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Pricing Section */}
      <PricingSection onContactClick={() => setIsChatOpen(true)} />

      {/* Chat Component */}
      {isChatOpen && (
        <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}
    </Box>
  )
} 