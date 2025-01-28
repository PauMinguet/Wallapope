'use client'

import { useState } from 'react'
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Stack,
  CircularProgress,
} from '@mui/material'
import { Send as SendIcon } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import TopBar from '../components/TopBar'
import Footer from '../components/Footer'

const ContactChat = dynamic(() => import('../components/ContactChat'), {
  ssr: false,
})

const MotionTypography = motion(Typography)

export default function ContactPage() {
  const { user } = useUser()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerk_id: user?.id,
          email: user?.primaryEmailAddress?.emailAddress,
          feedback_text: message.trim(),
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Por favor, inicia sesión para enviar feedback')
        }
        throw new Error('Error enviando el mensaje')
      }

      setSuccess(true)
      setMessage('')
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error enviando el mensaje. Por favor, inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
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

      {/* Content */}
      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative',
          zIndex: 1,
          pt: { xs: 12, md: 16 },
          pb: { xs: 8, md: 12 }
        }}
      >
        <Grid container spacing={4}>
          {/* Left Column - Contact Form */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 6 }}>
              <MotionTypography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  mb: 2,
                  background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Contacta con nosotros
              </MotionTypography>
              <MotionTypography
                variant="body1"
                sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Envíanos tus dudas, sugerencias o comentarios. Estaremos encantados de ayudarte.
              </MotionTypography>
            </Box>

            <Card sx={{ 
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  {error && (
                    <Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)' }}>
                      {error}
                    </Alert>
                  )}
                  {success && (
                    <Alert severity="success" sx={{ bgcolor: 'rgba(46, 125, 50, 0.1)' }}>
                      Mensaje enviado correctamente
                    </Alert>
                  )}
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Mensaje"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.1)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255,255,255,0.2)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#4169E1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255,255,255,0.7)',
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!message.trim() || submitting}
                    startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                    sx={{
                      background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                      color: 'white',
                      py: 1.5,
                      '&:hover': {
                        background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                      }
                    }}
                  >
                    {submitting ? 'Enviando...' : 'Enviar mensaje'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Chat */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 6 }}>
              <MotionTypography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  mb: 2,
                  background: 'linear-gradient(45deg, #9400D3, #4169E1)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Chat en vivo
              </MotionTypography>
              <MotionTypography
                variant="body1"
                sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                ¿Prefieres una respuesta inmediata? Chatea con nuestro asistente virtual.
              </MotionTypography>
            </Box>

            <Card sx={{ 
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              height: '600px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ 
                p: '0 !important',
                height: '100%',
                position: 'relative'
              }}>
                <ContactChat />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
    <Footer />
    </>
  )
} 