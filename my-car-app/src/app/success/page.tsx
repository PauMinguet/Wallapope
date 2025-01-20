'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Box, Container, Typography, CircularProgress, Button } from '@mui/material'
import { CheckCircle } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      setError('No session ID found')
      setLoading(false)
      return
    }

    // Wait a few seconds to allow webhook processing
    setTimeout(() => {
      setLoading(false)
    }, 3000)
  }, [searchParams])

  if (loading) {
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

  if (error) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#000000',
        color: 'white'
      }}>
        <Container maxWidth="sm">
          <Typography variant="h4" align="center" gutterBottom>
            Algo ha salido mal
          </Typography>
          <Typography align="center" color="text.secondary" paragraph>
            {error}
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button 
              variant="contained" 
              onClick={() => router.push('/')}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                }
              }}
            >
              Volver al inicio
            </Button>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#000000',
      color: 'white'
    }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center' }}>
          <CheckCircle sx={{ 
            fontSize: 80, 
            color: '#4CAF50',
            mb: 3
          }} />
          <Typography variant="h4" gutterBottom>
            ¡Suscripción activada!
          </Typography>
          <Typography color="text.secondary" paragraph>
            Tu suscripción se ha activado correctamente. Ya puedes empezar a disfrutar de todas las funcionalidades.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button 
              variant="contained" 
              onClick={() => router.push('/search')}
              sx={{
                background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                }
              }}
            >
              Empezar a buscar
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <Box sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#000000'
      }}>
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    }>
      <SuccessContent />
    </Suspense>
  )
} 