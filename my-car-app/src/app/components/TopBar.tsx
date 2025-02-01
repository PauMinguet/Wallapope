'use client'

import { useState, useEffect } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  Settings,
  FlashOn,
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  Build as BuildIcon,
} from '@mui/icons-material'
import { useSubscription } from '@/hooks/useSubscription'

export default function TopBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const [isMobileView, setIsMobileView] = useState(false)
  const theme = useTheme()
  const { isSubscribed } = useSubscription('pro')
  const [toolsAnchorEl, setToolsAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < theme.breakpoints.values.md)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [theme.breakpoints.values.md])

  const mainSections = [
    { 
      label: 'Menú', 
      href: '/app', 
      icon: <MenuIcon sx={{ fontSize: '1.2rem' }} />
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

  const toolsSections = [
    {
      label: 'Búsqueda',
      href: '/app/search',
      icon: <SearchIcon sx={{ fontSize: '1.2rem' }} />,
      requiresSubscription: true
    },
    {
      label: 'Importación',
      href: '/app/imports',
      icon: <TrendingUpIcon sx={{ fontSize: '1.2rem' }} />,
      requiresSubscription: true
    },
    { 
      label: 'Mercado', 
      href: '/app/mercado', 
      icon: <AnalyticsIcon sx={{ fontSize: '1.2rem' }} />
    },
    {
      label: 'Scoring',
      href: '/app/scoring',
      icon: <TrendingUpIcon sx={{ fontSize: '1.2rem' }} />
    }
  ]

  const handleToolsClick = (event: React.MouseEvent<HTMLElement>) => {
    setToolsAnchorEl(event.currentTarget)
  }

  const handleToolsClose = () => {
    setToolsAnchorEl(null)
  }

  const handleNavigation = (section: { href: string, requiresSubscription?: boolean }) => {
    if (section.requiresSubscription && !isSubscribed) {
      router.push('/app/ajustes?upgrade=true')
      return
    }
    router.push(section.href)
    if (toolsAnchorEl) handleToolsClose()
  }

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
      <Container maxWidth="lg" sx={{ px: { xs: 0.25, sm: 1, md: 2 } }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          {/* Logo and Title */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0, md: 2 },
            cursor: 'pointer',
            pl: { xs: 0.25, md: 0 }
          }} onClick={() => router.push('/')}>
            <Box sx={{ 
              position: 'relative',
              width: { xs: 65, md: 120 },
              height: { xs: 32, md: 50 },
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                style={{
                  objectFit: 'contain',
                  borderRadius: 'inherit'
                }}
              />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.5rem' },
                fontWeight: 700,
                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap'
              }}
            >
              ChollosCars
            </Typography>
          </Box>

          {/* Auth Buttons */}
          <Stack direction="row" spacing={{ xs: 0.25, md: 2 }} sx={{ pr: { xs: 0.5, md: 0 } }}>
            {isSignedIn ? (
              <>
                {/* Navigation buttons for logged-in users */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.25, md: 1 },
                  '& .MuiButton-root': {
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    py: { xs: 0.5, md: 1 },
                    px: { xs: 0.5, md: 2 },
                    minWidth: { xs: '32px', md: 'auto' },
                    borderRadius: 2,
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)'
                    },
                    '&.active': {
                      background: 'linear-gradient(45deg, rgba(44,62,147,0.8), rgba(107,35,142,0.8))',
                    }
                  }
                }}>
                  {mainSections.map((section) => (
                    <Button
                      key={section.href}
                      className={pathname === section.href ? 'active' : ''}
                      onClick={() => handleNavigation(section)}
                      startIcon={!isMobileView ? section.icon : undefined}
                      sx={{
                        '& .MuiButton-startIcon': {
                          margin: { xs: 0, md: '0 8px 0 -4px' }
                        }
                      }}
                    >
                      {isMobileView ? section.icon : section.label}
                    </Button>
                  ))}

                  {/* Tools Dropdown */}
                  <Button
                    onClick={handleToolsClick}
                    startIcon={!isMobileView ? <BuildIcon sx={{ fontSize: '1.2rem' }} /> : undefined}
                    endIcon={!isMobileView ? <ExpandMoreIcon /> : undefined}
                    className={toolsSections.some(tool => pathname === tool.href) ? 'active' : ''}
                    sx={{
                      '& .MuiButton-startIcon': {
                        margin: { xs: 0, md: '0 8px 0 -4px' }
                      }
                    }}
                  >
                    {isMobileView ? <BuildIcon sx={{ fontSize: '1.2rem' }} /> : 'Herramientas'}
                  </Button>
                  <Menu
                    anchorEl={toolsAnchorEl}
                    open={Boolean(toolsAnchorEl)}
                    onClose={handleToolsClose}
                    PaperProps={{
                      sx: {
                        mt: 1.5,
                        background: 'rgba(0, 0, 0, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        minWidth: '200px',
                        overflow: 'hidden',
                        '& .MuiMenuItem-root': {
                          color: 'white',
                          py: 1.5,
                          px: 2,
                          transition: 'all 0.2s ease-in-out',
                          position: 'relative',
                          '&:hover': {
                            background: 'linear-gradient(45deg, rgba(44,62,147,0.2), rgba(107,35,142,0.2))',
                            '& .MuiListItemIcon-root': {
                              color: 'white',
                              transform: 'scale(1.1)',
                            }
                          },
                          '&:after': {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: '10%',
                            width: '80%',
                            height: '1px',
                            background: 'rgba(255,255,255,0.1)'
                          },
                          '&:last-child:after': {
                            display: 'none'
                          }
                        }
                      }
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    {toolsSections.map((tool) => (
                      <MenuItem 
                        key={tool.href}
                        onClick={() => handleNavigation(tool)}
                        sx={{
                          opacity: tool.requiresSubscription && !isSubscribed ? 0.6 : 1,
                          position: 'relative',
                          '&::before': tool.requiresSubscription && !isSubscribed ? {
                            content: '"PRO"',
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.7rem',
                            color: '#9400D3',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #9400D3',
                            background: 'rgba(148,0,211,0.1)',
                            transition: 'all 0.2s ease-in-out'
                          } : {},
                          '&:hover': {
                            '&::before': tool.requiresSubscription && !isSubscribed ? {
                              background: 'rgba(148,0,211,0.2)',
                              borderColor: '#a020f0'
                            } : {}
                          }
                        }}
                      >
                        <ListItemIcon sx={{ 
                          color: 'rgba(255,255,255,0.7)', 
                          minWidth: 36,
                          transition: 'all 0.2s ease-in-out'
                        }}>
                          {tool.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={tool.label} 
                          sx={{
                            '& .MuiTypography-root': {
                              transition: 'all 0.2s ease-in-out'
                            }
                          }}
                        />
                      </MenuItem>
                    ))}
                  </Menu>
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