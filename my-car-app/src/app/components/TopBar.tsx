import { useState } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/nextjs'
import { 
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
} from '@mui/icons-material'

export default function TopBar() {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null)
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'))

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
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          {/* Logo and Title */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, md: 2 },
            cursor: 'pointer'
          }} onClick={() => router.push('/')}>
            <Box sx={{ 
              position: 'relative',
              width: { xs: 100, md: 120 },
              height: { xs: 50, md: 50 }
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
                display: { xs: 'none', sm: 'block' },
                fontSize: { sm: '1.1rem', md: '1.25rem' },
                fontWeight: 700,
                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap'
              }}
            >
              ChollosCarFinder
            </Typography>
          </Box>

          {/* Auth Buttons */}
          <Stack direction="row" spacing={{ xs: 1, md: 2 }}>
            {isSignedIn ? (
              <>
                {/* Navigation buttons for logged-in users */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
                  <Button
                    href="/search"
                    startIcon={<SearchIcon />}
                    sx={{
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Buscar Coches
                  </Button>
                  <Button
                    href="/alertas"
                    startIcon={<NotificationsIcon />}
                    sx={{
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Mis Alertas
                  </Button>
                </Box>

                {/* Mobile menu button */}
                {isMobile && (
                  <>
                    <IconButton
                      onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                      sx={{ 
                        color: 'white',
                        display: { xs: 'flex', md: 'none' }
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                    <Menu
                      anchorEl={mobileMenuAnchor}
                      open={Boolean(mobileMenuAnchor)}
                      onClose={() => setMobileMenuAnchor(null)}
                      PaperProps={{
                        sx: {
                          bgcolor: '#111111',
                          color: 'white',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.1)'
                            }
                          }
                        }
                      }}
                    >
                      <MenuItem 
                        onClick={() => {
                          router.push('/search')
                          setMobileMenuAnchor(null)
                        }}
                      >
                        <SearchIcon sx={{ mr: 1 }} />
                        Buscar Coches
                      </MenuItem>
                      <MenuItem 
                        onClick={() => {
                          router.push('/alertas')
                          setMobileMenuAnchor(null)
                        }}
                      >
                        <NotificationsIcon sx={{ mr: 1 }} />
                        Mis Alertas
                      </MenuItem>
                    </Menu>
                  </>
                )}

                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button
                    variant="outlined"
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderRadius: '28px',
                      px: { xs: 2, md: 3 },
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Log In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button
                    variant="contained"
                    sx={{
                      background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                      color: 'white',
                      borderRadius: '28px',
                      px: { xs: 2, md: 3 },
                      '&:hover': {
                        background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                      }
                    }}
                  >
                    Sign Up
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