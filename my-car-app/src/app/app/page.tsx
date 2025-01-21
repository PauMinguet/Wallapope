'use client'

import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Box,
} from '@mui/material'
import { 
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Favorite as FavoriteIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  
  const menuItems = [
    {
      title: 'Buscar Coches',
      description: 'Encuentra el coche perfecto con nuestros filtros avanzados',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      href: '/app/search',
      color: '#4169E1',
    },
    {
      title: 'Mis Alertas',
      description: 'Gestiona tus alertas de búsqueda personalizadas',
      icon: <NotificationsIcon sx={{ fontSize: 40 }} />,
      href: '/app/alertas',
      color: '#9400D3',
    },
    {
      title: 'Favoritos',
      description: 'Accede a tus coches guardados',
      icon: <FavoriteIcon sx={{ fontSize: 40 }} />,
      href: '/app/liked',
      color: '#E91E63',
    },
    {
      title: 'Mis Coches',
      description: 'Gestiona tus anuncios publicados',
      icon: <CarIcon sx={{ fontSize: 40 }} />,
      href: '/app/coches',
      color: '#00C853',
    },
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 4, 
              fontWeight: 700,
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
            }}
          >
            Bienvenido a tu Dashboard
          </Typography>
          
          <Grid container spacing={3}>
            {menuItems.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.title}>
                <Card 
                  sx={{ 
                    height: '100%',
                    background: 'transparent',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: { xs: 3, md: 4 },
                    transition: 'all 0.3s ease-in-out',
                    color: 'white',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      borderColor: item.color,
                      background: 'rgba(255,255,255,0.03)'
                    }
                  }}
                  onClick={() => router.push(item.href)}
                >
                  <CardContent sx={{ 
                    background: '#111111',
                    borderRadius: { xs: 3, md: 4 }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 2
                    }}>
                      <Box sx={{ 
                        p: 2,
                        borderRadius: '50%',
                        background: `linear-gradient(45deg, ${item.color}20, ${item.color}40)`,
                        color: item.color
                      }}>
                        {item.icon}
                      </Box>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600,
                        color: 'white'
                      }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  )
} 