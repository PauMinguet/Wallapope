'use client'

import { useState, useEffect } from 'react'
import { 
  Box,
  CircularProgress,
  Typography,
  Container,
} from '@mui/material'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '@/hooks/useSubscription'
import { motion } from 'framer-motion'
import SearchPanel from '../components/SearchPanel'
import Footer from '../components/Footer'

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
  const { loading: subscriptionLoading, isSubscribed } = useSubscription()
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

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      bgcolor: '#000000',
      position: 'relative',
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

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Content Container */}
        <Container 
          maxWidth="lg" 
          sx={{ 
            py: { xs: 8, md: 6 },
            px: { xs: 2, sm: 3, md: 4 },
            flexGrow: 1,
            mt: { xs: '56px', md: '72px' }
          }}
        >
          {/* Welcome Section */}
          <Box sx={{ mb: 6 }}>
            <MotionTypography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: 2
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Bienvenido a ChollosCars
            </MotionTypography>
            <MotionTypography
              variant="body1"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 600
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Encuentra las mejores oportunidades en el mercado de coches de segunda mano
            </MotionTypography>
          </Box>

          {/* Search Panel */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <SearchPanel />
          </MotionBox>
        </Container>

        {/* Footer */}
        <Box sx={{ mt: 20 }}>
          <Footer />
        </Box>
      </Box>
    </Box>
  )
} 