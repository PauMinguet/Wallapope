'use client'

import { useState, useEffect } from 'react'
import { Container, Typography, Box, CircularProgress, Stack, Button } from '@mui/material'
import { motion } from 'framer-motion'
import { LocalOffer, Percent, LocationOn } from '@mui/icons-material'
import ListingsGrid, { Listing } from '../../components/ListingsGrid'

const MotionTypography = motion(Typography)

type SortOption = 'distance' | 'discount' | 'percentage' | null;

const STORAGE_KEY = 'quick_listings'

export default function CochesPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('discount')

  // Fetch listings only if not in localStorage
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        // Check localStorage first
        const storedListings = localStorage.getItem(STORAGE_KEY)
        if (storedListings) {
          const data = JSON.parse(storedListings)
          // Sort by discount by default
          data.sort((a: Listing, b: Listing) => Math.abs(b.price_difference) - Math.abs(a.price_difference))
          setListings(data)
          setLoading(false)
          return
        }

        // Fetch if not in localStorage
        const response = await fetch('/api/car-listings')
        const data = await response.json()
        // Sort by discount by default
        data.sort((a: Listing, b: Listing) => Math.abs(b.price_difference) - Math.abs(a.price_difference))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        setListings(data)
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  // Handle sorting separately
  useEffect(() => {
    if (!listings.length) return

    const sortedData = [...listings]
    if (sortBy === 'distance') {
      sortedData.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    } else if (sortBy === 'discount') {
      sortedData.sort((a, b) => Math.abs(b.price_difference) - Math.abs(a.price_difference))
    } else if (sortBy === 'percentage') {
      sortedData.sort((a, b) => Math.abs(parseFloat(b.price_difference_percentage)) - Math.abs(parseFloat(a.price_difference_percentage)))
    }
    
    setListings(sortedData)
  }, [sortBy])

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
        <ListingsGrid 
          listings={listings}
          loading={loading}
          showNoResults={!loading && (!listings || listings.length === 0)}
        />
      )}
    </Container>
  )
} 