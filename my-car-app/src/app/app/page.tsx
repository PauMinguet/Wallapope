'use client'

import { useState, useEffect } from 'react'
import { 
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
  Typography,
  Container,
} from '@mui/material'
import { 
  Search as SearchIcon,
  FlashOn as FlashOnIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as NotificationsActiveIcon,
  Menu as MenuIcon,
} from '@mui/icons-material'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '@/hooks/useSubscription'
import { motion } from 'framer-motion'
import SearchPanel from '../components/SearchPanel'
import Footer from '../components/Footer'

const MotionBox = motion(Box)
const MotionTypography = motion(Typography)

const DRAWER_WIDTH = 280

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
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useUser()
  const { loading: subscriptionLoading, isSubscribed } = useSubscription()
  const [initialLoad, setInitialLoad] = useState(true)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const menuItems = [
    {
      title: 'Búsqueda Inteligente',
      description: 'Encuentra coches usando nuestro sistema de búsqueda inteligente que analiza precios de mercado y te muestra las mejores oportunidades.',
      icon: <SearchIcon sx={{ color: '#4169E1' }} />,
      href: '/app',
    },
    {
      title: 'Modo Flash',
      description: 'Detecta oportunidades únicas en tiempo real. Identifica coches recién publicados con precios por debajo del mercado.',
      icon: <FlashOnIcon sx={{ color: '#00C853' }} />,
      href: '/app/coches',
    },
    {
      title: 'Análisis de Mercado',
      description: 'Accede a estadísticas detalladas sobre precios, tendencias y evolución del mercado para cada modelo.',
      icon: <TrendingUpIcon sx={{ color: '#4169E1' }} />,
      href: '/app/mercado',
    },
    {
      title: 'Sistema de Alertas',
      description: 'Configura alertas personalizadas y recibe notificaciones cuando aparezcan coches que coincidan con tus criterios.',
      icon: <NotificationsActiveIcon sx={{ color: '#9400D3' }} />,
      href: '/app/alertas',
    },
    {
      title: 'Importación Suiza',
      description: 'Explora oportunidades de importación desde Suiza. Compara precios y calcula costes de importación.',
      icon: <TrendingUpIcon sx={{ color: '#4169E1' }} />,
      href: '/app/imports',
    },
  ]

  const drawer = (
    <Box sx={{ 
      bgcolor: 'rgba(255,255,255,0.03)',
      height: '100%',
      borderRight: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ p: 3 }}>
        <MotionTypography 
          variant="h5" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 1
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          CholloCars
        </MotionTypography>
        <MotionTypography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            mt: 1,
            lineHeight: 1.6
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Tu asistente inteligente para encontrar las mejores ofertas en coches de segunda mano
        </MotionTypography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item, index) => (
          <MotionBox
            key={item.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ListItem 
              key={item.title}
              onClick={() => router.push(item.href)}
              sx={{
                py: 2.5,
                px: 2,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                borderRadius: '0 24px 24px 0',
                mr: 2,
                ...(pathname === item.href ? {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                  }
                } : {
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                  }
                })
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.title}
                secondary={item.description}
                primaryTypographyProps={{
                  sx: { 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: '1rem',
                    mb: 0.5
                  }
                }}
                secondaryTypographyProps={{
                  sx: { 
                    color: 'rgba(255,255,255,0.6)', 
                    fontSize: '0.85rem',
                    lineHeight: 1.4
                  }
                }}
              />
            </ListItem>
          </MotionBox>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ p: 3, textAlign: 'center' }}>
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.7rem'
          }}
        >
          © 2025 CholloCars
        </Typography>
      </Box>
    </Box>
  )

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

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
          zIndex: 2,
          mt: { xs: '56px', md: '72px' }
        }}
      >
        {/* Mobile drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: DRAWER_WIDTH,
                bgcolor: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(10px)',
                mt: '56px'
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          // Desktop drawer
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: DRAWER_WIDTH,
                bgcolor: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(10px)',
                mt: '72px'
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Mobile menu button */}
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              position: 'fixed',
              top: 16,
              left: 16,
              bgcolor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              zIndex: 10,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Content Container */}
        <Container 
          maxWidth="lg" 
          sx={{ 
            py: { xs: 8, md: 6 },
            px: { xs: 2, sm: 3, md: 4 },
            flexGrow: 1
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
              Bienvenido a CholloCars
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