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
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  LocalOffer, 
  Percent, 
  LocationOn,
  LockOutlined,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/useSubscription'
import ListingsGrid, { Listing } from '../../components/ListingsGrid'

const MotionTypography = motion(Typography)

type SortOption = 'distance' | 'discount' | 'percentage' | null;

const STORAGE_KEY = 'quick_listings'

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

export default function CochesPage() {
  const router = useRouter()
  const { loading: subscriptionLoading, isSubscribed, currentTier } = useSubscription('pro')
  const [initialLoad, setInitialLoad] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('discount')
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [itemsPerPage] = useState(20)

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
        const storedListings = localStorage.getItem(STORAGE_KEY)
        
        if (storedListings) {
          const data = JSON.parse(storedListings)
          data.sort((a: Listing, b: Listing) => Math.abs(b.price_difference) - Math.abs(a.price_difference))
          setListings(data)
          setTotalPages(Math.ceil(data.length / itemsPerPage))
          setLoading(false)
          return
        }

        const response = await fetch(`/api/car-listings?page=${page}&limit=${itemsPerPage}`)
        const data = await response.json()
        setListings(data.listings)
        setTotalPages(data.totalPages)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.listings))
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [initialLoad, subscriptionLoading, page, itemsPerPage])

  // Handle sorting
  useEffect(() => {
    if (initialLoad || subscriptionLoading) return

    const sortedData = [...listings]
    if (sortBy === 'distance') {
      sortedData.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    } else if (sortBy === 'discount') {
      sortedData.sort((a, b) => Math.abs(b.price_difference) - Math.abs(a.price_difference))
    } else if (sortBy === 'percentage') {
      sortedData.sort((a, b) => Math.abs(parseFloat(b.price_difference_percentage)) - Math.abs(parseFloat(a.price_difference_percentage)))
    }
    
    if (JSON.stringify(sortedData) !== JSON.stringify(listings)) {
      setListings(sortedData)
    }
  }, [sortBy, listings, initialLoad, subscriptionLoading])

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show loading screen during initial load or subscription check
  if (initialLoad || subscriptionLoading) {
    return <LoadingScreen />
  }

  return (
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
  )
} 