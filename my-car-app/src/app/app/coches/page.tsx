'use client'

import { useState, useEffect } from 'react'
import { Container, Typography, Box, CircularProgress } from '@mui/material'
import ListingsGrid from '../../components/ListingsGrid'

export default function CochesPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/car-listings')
        const data = await response.json()
        setListings(data)
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
        Mis Coches
      </Typography>

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