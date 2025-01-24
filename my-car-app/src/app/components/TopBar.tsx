'use client'

import { useState, useEffect } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack,
  useTheme,
} from '@mui/material'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { 
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/nextjs'
import { 
  Search as SearchIcon,
  Settings,
  FlashOn,
  Notifications as NotificationsIcon,
} from '@mui/icons-material'

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const [isMobileView, setIsMobileView] = useState(false)
  const theme = useTheme()
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < theme.breakpoints.values.md)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [theme.breakpoints.values.md])

  const sections = [
    { 
      label: 'Búsqueda', 
      href: '/app', 
      icon: <SearchIcon sx={{ fontSize: '1.2rem' }} />
    },
    { 
      label: 'Modo Rápido', 
      href: '/app/coches', 
      icon: <FlashOn sx={{ fontSize: '1.2rem' }} />
    },
    { 
      label: 'Alertas', 
      href: '/app/alertas', 
      icon: <NotificationsIcon sx={{ fontSize: '1.2rem' }} />
    },
    { 
      label: 'Ajustes', 
      href: '/app/ajustes', 
      icon: <Settings sx={{ fontSize: '1.2rem' }} />
    }
  ]

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        py: { xs: 1.5, md: 2 }
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          {/* Logo and Title */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, md: 2 },
            cursor: 'pointer'
          }} onClick={() => router.push('/')}>
            <Box sx={{ 
              position: 'relative',
              width: { xs: 80, md: 120 },
              height: { xs: 40, md: 50 }
            }}>
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                style={{
                  objectFit: 'contain'
                }}
              />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.5rem' },
                fontWeight: 700,
                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap'
              }}
            >
              ChollosCar
            </Typography>
          </Box>

          {/* Auth Buttons */}
          <Stack direction="row" spacing={{ xs: 0.5, md: 2 }}>
            {isSignedIn ? (
              <>
                {/* Navigation buttons for logged-in users */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.5, md: 1 },
                  '& .MuiButton-root': {
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    py: 1,
                    px: { xs: 1, md: 2 },
                    minWidth: { xs: '40px', md: 'auto' },
                    borderRadius: 2,
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)'
                    },
                    '&.active': {
                      background: 'linear-gradient(45deg, rgba(44,62,147,0.8), rgba(107,35,142,0.8))',
                    }
                  }
                }}>
                  {sections.map((section) => (
                    <Button
                      key={section.href}
                      className={pathname === section.href ? 'active' : ''}
                      onClick={() => router.push(section.href)}
                      startIcon={!isMobileView ? section.icon : undefined}
                      sx={{
                        '& .MuiButton-startIcon': {
                          margin: { xs: 0, md: '0 8px 0 -4px' }
                        }
                      }}
                    >
                      {isMobileView ? (
                        section.icon
                      ) : (
                        section.label
                      )}
                    </Button>
                  ))}
                </Box>

                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: {
                        width: '35px',
                        height: '35px'
                      }
                    }
                  }}
                />
              </>
            ) : (
              <>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <SignInButton mode="modal">
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '20px',
                        px: { xs: 1.5, md: 3 },
                        py: { xs: 0.5, md: 1 },
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        minWidth: { xs: 'unset', md: 'auto' },
                        '&:hover': {
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      Iniciar Sesión
                    </Button>
                  </SignInButton>
                </Box>
                <SignUpButton mode="modal">
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                      color: 'white',
                      borderRadius: '20px',
                      px: { xs: 1.5, md: 3 },
                      py: { xs: 0.5, md: 1 },
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      minWidth: { xs: 'unset', md: 'auto' },
                      '&:hover': {
                        background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                      }
                    }}
                  >
                    {isMobileView ? 'Iniciar Sesión' : 'Registrarse'}
                  </Button>
                </SignUpButton>
              </>
            )}
          </Stack>
        </Box>
      </Container>
    </Box>
  )
} 