'use client'

import { useState, useEffect } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Stack, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Select,
  MenuItem,
  TextField,
  Popover,
  InputAdornment,
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  LocalOffer, 
  Percent, 
  LocationOn,
  LockOutlined,
  EuroSymbol,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'
import ListingsGrid, { Listing } from '../../components/ListingsGrid'
import Footer from '../../components/Footer'

const MotionTypography = motion(Typography)

type SortOption = 'distance' | 'discount' | 'percentage' | null;


const LoadingScreen = () => (
  <Box sx={{ 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    width: '100%',
    bgcolor: 'transparent',
  }}>
    <CircularProgress sx={{ color: 'white' }} />
  </Box>
)

export default function CochesPage() {
  const router = useRouter()
  const { loading: subscriptionLoading, isSubscribed, currentTier } = useSubscription('pro')
  const [initialLoad, setInitialLoad] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('discount')
  const [selectedMinYear, setSelectedMinYear] = useState<string>('')
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Price filter state
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [priceAnchorEl, setPriceAnchorEl] = useState<null | HTMLElement>(null)
  const isPriceMenuOpen = Boolean(priceAnchorEl)

  // Generate years from 2010 to current year
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2009 }, (_, i) => (currentYear - i).toString())

  const handlePriceClick = (event: React.MouseEvent<HTMLElement>) => {
    setPriceAnchorEl(event.currentTarget);
  };

  const handlePriceClose = () => {
    setPriceAnchorEl(null);
  };

  const handleApplyPriceFilter = () => {
    setPage(1); // Reset to first page when changing filters
    handlePriceClose();
  };

  const handleClearPriceFilter = () => {
    setMinPrice('');
    setMaxPrice('');
    setPage(1); // Reset to first page when changing filters
    handlePriceClose();
  };

  // Handle subscription check and redirect
  useEffect(() => {
    if (!subscriptionLoading) {
      if (!isSubscribed || (currentTier !== 'pro' && currentTier !== 'business')) {
        router.push('/pricing')
      } else {
        setInitialLoad(false)
      }
    }
  }, [subscriptionLoading, isSubscribed, currentTier, router])

  // Only proceed with other effects if subscription is valid
  useEffect(() => {
    if (initialLoad || subscriptionLoading) return

    const fetchListings = async () => {
      try {
        setLoading(true)
        const minYearParam = selectedMinYear ? `&minYear=${selectedMinYear}` : ''
        const minPriceParam = minPrice ? `&minPrice=${minPrice}` : ''
        const maxPriceParam = maxPrice ? `&maxPrice=${maxPrice}` : ''
        
        const response = await fetch(
          `/api/car-listings?page=${page}&sortBy=${sortBy}${minYearParam}${minPriceParam}${maxPriceParam}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch listings')
        }
        const data = await response.json()
        if (Array.isArray(data.listings)) {
          setListings(data.listings)
          setTotalPages(data.totalPages)
        }
      } catch (error) {
        console.error('Error fetching listings:', error)
        setListings([])
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [initialLoad, subscriptionLoading, page, sortBy, selectedMinYear, minPrice, maxPrice])

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show loading screen during initial load or subscription check
  if (initialLoad || subscriptionLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LoadingScreen />
      </Container>
    )
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: { xs: 2, md: 3 }
        }}>
          <MotionTypography
            variant="h1"
            sx={{
              fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' },
              fontWeight: 900,
              lineHeight: { xs: 1.1, md: 1.1 },
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Modo Rápido
          </MotionTypography>

          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              '& .MuiButton-root': {
                py: 0.5,
                px: 1.5,
                fontSize: '0.8rem',
                color: 'white',
                borderColor: 'rgba(255,255,255,0.2)',
                '&.active': {
                  background: 'linear-gradient(45deg, rgba(44,62,147,0.8), rgba(107,35,142,0.8))',
                  borderColor: 'transparent',
                },
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.05)'
                }
              }
            }}
          >
            <Select
              value={selectedMinYear}
              onChange={(e) => setSelectedMinYear(e.target.value)}
              displayEmpty
              size="small"
              sx={{
                minWidth: 120,
                color: 'white',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.4)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.6)',
                },
                '.MuiSvgIcon-root': {
                  color: 'white',
                }
              }}
            >
              <MenuItem value="">Desde cualquier año</MenuItem>
              {years.map((year) => (
                <MenuItem key={year} value={year}>Desde {year}</MenuItem>
              ))}
            </Select>

            {/* Price Filter Button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<EuroSymbol sx={{ fontSize: '1rem' }} />}
              onClick={handlePriceClick}
              className={minPrice || maxPrice ? 'active' : ''}
              aria-controls={isPriceMenuOpen ? 'price-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={isPriceMenuOpen ? 'true' : undefined}
            >
              Precio {minPrice || maxPrice ? '(filtrado)' : ''}
            </Button>

            <Popover
              id="price-menu"
              anchorEl={priceAnchorEl}
              open={isPriceMenuOpen}
              onClose={handlePriceClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              PaperProps={{
                sx: {
                  p: 2,
                  width: 300,
                  bgcolor: 'rgba(30,30,30,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  borderRadius: 2,
                }
              }}
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mb: 2, 
                  color: 'white',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                Filtro de Precio
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Precio Mínimo"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  fullWidth
                  type="number"
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                    sx: { color: 'white' }
                  }}
                  InputLabelProps={{
                    sx: { color: 'rgba(255,255,255,0.7)' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255,255,255,0.6)',
                      },
                    },
                  }}
                />
                <TextField
                  label="Precio Máximo"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  fullWidth
                  type="number"
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">€</InputAdornment>,
                    sx: { color: 'white' }
                  }}
                  InputLabelProps={{
                    sx: { color: 'rgba(255,255,255,0.7)' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(255,255,255,0.6)',
                      },
                    },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 1 }}>
                  <Button 
                    variant="outlined"
                    onClick={handleClearPriceFilter}
                    fullWidth
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.05)'
                      }
                    }}
                  >
                    Limpiar
                  </Button>
                  <Button 
                    variant="contained"
                    onClick={handleApplyPriceFilter}
                    fullWidth
                    sx={{
                      background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                        opacity: 0.9
                      }
                    }}
                  >
                    Aplicar
                  </Button>
                </Box>
              </Stack>
            </Popover>

            <Button
              variant="outlined"
              size="small"
              startIcon={<LocationOn sx={{ fontSize: '1rem' }} />}
              className={sortBy === 'distance' ? 'active' : ''}
              onClick={() => setSortBy('distance')}
            >
              Distancia
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LocalOffer sx={{ fontSize: '1rem' }} />}
              className={sortBy === 'discount' ? 'active' : ''}
              onClick={() => setSortBy('discount')}
            >
              Descuento
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Percent sx={{ fontSize: '1rem' }} />}
              className={sortBy === 'percentage' ? 'active' : ''}
              onClick={() => setSortBy('percentage')}
            >
              Porcentaje
            </Button>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <ListingsGrid 
              listings={listings}
              loading={loading}
              showNoResults={!loading && (!listings || listings.length === 0)}
            />
            
            {totalPages > 1 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mt: 4,
                '& .MuiPagination-ul': {
                  '& .MuiPaginationItem-root': {
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&.Mui-selected': {
                      background: 'linear-gradient(45deg, rgba(44,62,147,0.8), rgba(107,35,142,0.8))',
                      borderColor: 'transparent',
                    },
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.05)'
                    }
                  }
                }
              }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  variant="outlined"
                  shape="rounded"
                  size="large"
                />
              </Box>
            )}
          </>
        )}

        {/* Subscription Required Modal */}
        <Dialog
          open={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          PaperProps={{
            sx: {
              bgcolor: 'rgba(25,25,25,0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
              color: 'white',
              minWidth: { xs: '90%', sm: 400 }
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center',
            pb: 1,
            pt: 3,
            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Función Premium
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={3} alignItems="center">
              <LockOutlined sx={{ fontSize: 60, color: 'rgba(255,255,255,0.7)' }} />
              <Typography variant="body1" sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)' }}>
                El Modo Rápido está disponible exclusivamente para suscriptores Pro y Business.
                Actualiza tu plan para acceder a esta y otras funciones premium.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                setIsSubscriptionModalOpen(false)
                router.push('/pricing')
              }}
              sx={{
                px: 3,
                py: 1,
                background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                color: 'white',
                borderRadius: '20px',
                textTransform: 'none',
                fontSize: '0.9rem',
                minWidth: '140px',
                '&:hover': {
                  background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                  opacity: 0.9
                }
              }}
            >
              Ver Planes
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsSubscriptionModalOpen(false)}
              sx={{
                px: 3,
                py: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                borderRadius: '20px',
                textTransform: 'none',
                fontSize: '0.9rem',
                minWidth: '140px',
                '&:hover': {
                  borderColor: '#4169E1',
                  background: 'rgba(255,255,255,0.05)'
                }
              }}
            >
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
      <Footer />
    </>
  )
} 