'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Container, Typography, Button, IconButton, Tabs, Tab, Skeleton, Box } from '@mui/material'
import { 
  DirectionsCar, 
  TwoWheeler, 
  LocalShipping, 
  ElectricScooter,
  OpenInNew, 
  Search,
  ArrowBackIos,
  ArrowForwardIos,
  BarChart,
  Favorite,
  FavoriteBorder,
  ManageSearch
} from '@mui/icons-material'
import { Listing, LikedListing } from '../../../types/listing'
import { useRouter, useSearchParams } from 'next/navigation'

type VehicleType = 'coches' | 'motos' | 'furgos' | 'scooters' | 'stats'

interface ListingViewProps {
  defaultType: VehicleType
}

const formatPriceDifference = (diff: number, type: string) => {
  const formatted = Math.abs(diff).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (type === 'furgos') {
    return diff < 0 ? `${formatted} under target` : `${formatted} over target`
  }
  return diff > 0 ? `${formatted} below target` : `${formatted} above target`
}

const ListingSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Skeleton variant="text" width={240} height={32} sx={{ bgcolor: 'grey.700' }} />
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
          <Skeleton variant="text" width={100} height={28} sx={{ bgcolor: 'grey.700' }} />
          <Skeleton variant="text" width={140} height={20} sx={{ bgcolor: 'grey.700' }} />
        </Box>
      </Box>
    </Box>
    
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
      {[...Array(4)].map((_, i) => (
        <Box key={i}>
          <Skeleton variant="text" width={60} height={16} sx={{ bgcolor: 'grey.700' }} />
          <Skeleton variant="text" width={80} height={20} sx={{ bgcolor: 'grey.700' }} />
        </Box>
      ))}
    </Box>
    
    <Skeleton variant="text" width={160} height={16} sx={{ bgcolor: 'grey.700' }} />
    
    <Box>
      <Skeleton variant="text" width="100%" height={60} sx={{ bgcolor: 'grey.700' }} />
    </Box>
    
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      pt: 2, 
      opacity: 0.5 
    }}>
      <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'grey.700' }} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rectangular" width={120} height={36} sx={{ bgcolor: 'grey.700', borderRadius: 1 }} />
        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'grey.700' }} />
      </Box>
      <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'grey.700' }} />
    </Box>
  </Box>
)

export default function ListingView({ defaultType }: ListingViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vehicleType] = useState<VehicleType>(defaultType)
  const [listings, setListings] = useState<Listing[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [likedListings, setLikedListings] = useState<{[key: string]: LikedListing}>({})

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        vehicleType === 'coches' 
          ? '/api/car-listings'
          : `/api/listings?type=${vehicleType}`
      )
      const data = await response.json()
      console.log('Fetched listings:', data)
      setListings(data)
      setCurrentIndex(0)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching listings:', error)
      setLoading(false)
    }
  }, [vehicleType])

  useEffect(() => {
    void fetchListings()
  }, [vehicleType, fetchListings])

  useEffect(() => {
    if (currentIndex >= 0 && listings.length > 0) {
      const params = new URLSearchParams(searchParams)
      params.set('index', currentIndex.toString())
      router.replace(`/${vehicleType}?${params.toString()}`, { scroll: false })
    }
  }, [currentIndex, vehicleType, router, searchParams, listings.length])

  const handleNavigation = (direction: 'prev' | 'next') => {
    setCurrentIndex((prevIndex) => {
      const newIndex = direction === 'prev' 
        ? Math.max(0, prevIndex - 1)
        : Math.min(listings.length - 1, prevIndex + 1)
      return newIndex
    })
  }

  const handleTabChange = (newValue: VehicleType | 'liked' | 'search') => {
    if (newValue === 'stats') {
      router.push('/stats')
      return
    }
    if (newValue === 'liked') {
      router.push('/liked')
      return
    }
    if (newValue === 'search') {
      router.push('/search')
      return
    }
    const params = new URLSearchParams(searchParams)
    router.push(`/${newValue}?${params.toString()}`)
  }

  const renderVehicleSpecs = (listing: Listing) => {
    if (vehicleType === 'furgos') {
      return (
        <Box sx={{ 
          display: 'flex', 
          gap: 4,
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          flexWrap: 'nowrap'
        }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Year</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.year || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Engine</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.motor || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Config</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.configuracion || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>KM</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
            </Typography>
          </Box>
        </Box>
      )
    }

    if (vehicleType === 'motos') {
      return (
        <Box sx={{ 
          display: 'flex', 
          gap: 4,
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          flexWrap: 'nowrap'
        }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Year</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.year || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>KM</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Power</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.power_cv ? `${listing.power_cv} CV` : 'N/A'}</Typography>
          </Box>
        </Box>
      )
    }

    if (vehicleType === 'scooters') {
      return (
        <Box sx={{ 
          display: 'flex', 
          gap: 4,
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          flexWrap: 'nowrap'
        }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Year</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.year || 'N/A'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>Engine</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {listing.engine_cc ? `${listing.engine_cc}cc` : 'N/A'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'grey.300' }}>KM</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
            </Typography>
          </Box>
        </Box>
      )
    }

    // Default car specs
    return (
      <Box sx={{ 
        display: 'flex', 
        gap: 4,
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'nowrap'
      }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'grey.300' }}>Year</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.year || 'N/A'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'grey.300' }}>Mileage</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'grey.300' }}>Fuel</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.fuel_type || 'N/A'}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'grey.300' }}>Trans.</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{listing.transmission || 'N/A'}</Typography>
        </Box>
      </Box>
    )
  }

  useEffect(() => {
    if (listings.length > 0) {
      const indexParam = searchParams.get('index')
      if (indexParam) {
        const index = parseInt(indexParam)
        if (!isNaN(index) && index >= 0 && index < listings.length) {
          setCurrentIndex(index)
        }
      }
    }
  }, [listings, searchParams])

  useEffect(() => {
    const saved = localStorage.getItem('likedListings')
    if (saved) {
      setLikedListings(JSON.parse(saved))
    }
  }, [])

  const toggleLike = (listing: Listing) => {
    const newLikedListings = { ...likedListings }
    
    if (newLikedListings[listing.id]) {
      delete newLikedListings[listing.id]
    } else {
      newLikedListings[listing.id] = {
        id: listing.id.toString(),
        url: listing.url,
        title: listing.title,
        price_text: listing.price_text,
        image_url: vehicleType === 'stats' 
          ? '/placeholder.svg'
          : listing[`listing_images_${vehicleType}`]?.[0]?.image_url || 
            listing.listing_images?.[0]?.image_url || '/placeholder.svg',
        vehicle_type: vehicleType === 'stats' ? 'coches' : vehicleType,
        location: listing.location || '',
        year: listing.year?.toString(),
        kilometers: listing.kilometers,
        search_url: listing.searches?.search_url
      }
    }
    
    setLikedListings(newLikedListings)
    localStorage.setItem('likedListings', JSON.stringify(newLikedListings))
  }

  useEffect(() => {
    if (listings.length > 0) {
      console.log('First listing:', listings[0])
      console.log('Image URL being used:', listings[0]?.listing_images?.[0]?.image_url)
    }
  }, [listings])

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        bgcolor: 'grey.900', 
        color: 'white', 
        position: 'relative' 
      }}>
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 50, 
          bgcolor: 'rgba(31, 41, 55, 0.95)', 
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <Tabs
            value={vehicleType}
            onChange={(_, newValue) => handleTabChange(newValue as VehicleType)}
            centered
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.7)',
                minWidth: '60px',
                '&.Mui-selected': {
                  color: 'white'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white'
              }
            }}
          >
            <Tab value="coches" icon={<DirectionsCar />} aria-label="Cars" />
            <Tab value="motos" icon={<TwoWheeler />} aria-label="Motorcycles" />
            <Tab value="furgos" icon={<LocalShipping />} aria-label="Vans" />
            <Tab value="scooters" icon={<ElectricScooter />} aria-label="Scooters" />
            <Tab value="stats" icon={<BarChart />} aria-label="Stats" />
            <Tab value="liked" icon={<Favorite />} aria-label="Liked" />
            <Tab value="search" icon={<ManageSearch />} aria-label="Search" />
          </Tabs>
        </Box>

        <Box sx={{ height: '100%', position: 'relative' }}>
          <Skeleton 
            variant="rectangular" 
            width="100%" 
            height="100%" 
            sx={{ position: 'absolute', inset: 0, bgcolor: 'grey.800' }}
          />
          
          <Box sx={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(to top, rgb(17, 24, 39) 0%, rgba(17, 24, 39, 0.7) 50%, transparent 100%)' 
          }} />
          
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 6 }}>
            <ListingSkeleton />
          </Box>
        </Box>
      </Box>
    )
  }

  if (!listings.length || currentIndex >= listings.length) {
    return (
      <Container sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        bgcolor: 'grey.900' 
      }}>
        <Typography variant="h4" sx={{ color: 'white' }}>
          No listings to show
        </Typography>
      </Container>
    )
  }

  const currentListing = listings[currentIndex]
  if (!currentListing) {
    return null
  }

  const imageUrl = vehicleType === 'coches'
    ? currentListing.listing_images?.[0]?.image_url
    : currentListing[`listing_images_${vehicleType}`]?.[0]?.image_url || 
      currentListing.listing_images?.[0]?.image_url || 
      '/placeholder.svg'

  return (
    <Box sx={{ 
      height: '100vh', 
      bgcolor: 'grey.900', 
      color: 'white', 
      position: 'relative' 
    }}>
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50, 
        bgcolor: 'rgba(31, 41, 55, 0.95)', 
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <Tabs
          value={vehicleType}
          onChange={(_, newValue) => handleTabChange(newValue as VehicleType)}
          centered
          sx={{
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.7)',
              minWidth: '60px',
              '&.Mui-selected': {
                color: 'white'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'white'
            }
          }}
        >
          <Tab value="coches" icon={<DirectionsCar />} aria-label="Cars" />
          <Tab value="motos" icon={<TwoWheeler />} aria-label="Motorcycles" />
          <Tab value="furgos" icon={<LocalShipping />} aria-label="Vans" />
          <Tab value="scooters" icon={<ElectricScooter />} aria-label="Scooters" />
          <Tab value="stats" icon={<BarChart />} aria-label="Stats" />
          <Tab value="liked" icon={<Favorite />} aria-label="Liked" />
          <Tab value="search" icon={<ManageSearch />} aria-label="Search" />
        </Tabs>
      </Box>

      <Box sx={{ height: '100%', position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        <Box 
          sx={{ 
            position: 'absolute', 
            left: 0, 
            width: '33.333%', 
            cursor: currentIndex > 0 ? 'pointer' : 'default', 
            zIndex: 10, 
            height: '80%', 
            top: 0 
          }}
          onClick={() => currentIndex > 0 && handleNavigation('prev')}
        />
        <Box 
          sx={{ 
            position: 'absolute', 
            right: 0, 
            width: '33.333%', 
            cursor: currentIndex < listings.length - 1 ? 'pointer' : 'default', 
            zIndex: 10, 
            height: '80%', 
            top: 0 
          }}
          onClick={() => currentIndex < listings.length - 1 && handleNavigation('next')}
        />
        
        <Box sx={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(to top, rgb(17, 24, 39) 0%, rgba(17, 24, 39, 0.7) 50%, transparent 100%)' 
        }} />
        
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 6 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                {currentListing.isReserved && (
                  <Box sx={{ 
                    display: 'inline-block', 
                    px: 2, 
                    py: 0.5, 
                    mb: 1, 
                    bgcolor: 'rgba(234, 179, 8, 0.8)', 
                    color: 'black',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 1
                  }}>
                    Reserved
                  </Box>
                )}
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
                  {currentListing.title
                    .replace(/^Slide \d+ of \d+\s*/, '')
                    .replace(/^\d+[\d.,]*\s*€\s*/, '')
                    .split(' - ')[0]
                    .split(/\d{5,}|\s+km/)[0]
                    .split(/Gasolina|Diesel|Diésel/)[0]
                    .replace(/\s+\d{4}\s*$/, '')
                    .trim()}
                </Typography>
                {currentListing.searches?.model && (
                  <Typography variant="subtitle2" sx={{ color: 'grey.400', mt: 1 }}>
                    Model: {currentListing.searches.model}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <Typography variant="h6" sx={{ color: 'success.light' }}>
                    {currentListing.price_text
                      .replace(/\([^)]*\)/g, '')
                      .replace(/^Slide \d+ of \d+\s*/, '')
                      .replace(/€.*$/, '€')
                      .trim()}
                  </Typography>
                  {currentListing.price_difference !== undefined && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: currentListing.price_difference > 0 ? 'success.light' : 'error.light'
                      }}
                    >
                      ({formatPriceDifference(currentListing.price_difference, vehicleType)})
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', width: '100%' }}>
              {renderVehicleSpecs(currentListing)}
            </Box>
            
            <Typography variant="caption" sx={{ color: 'grey.300', display: 'block' }}>
              {currentListing.location}
            </Typography>
            
            <Box>
              <Typography variant="caption" sx={{ color: 'grey.100' }}>
                {showFullDescription || window.innerWidth >= 768
                  ? currentListing.description?.replace(/^Slide \d+ of \d+ /, '').replace(/^[^.!]+[.!]\s*/, '') || ''
                  : (currentListing.description?.replace(/^Slide \d+ of \d+ /, '').replace(/^[^.!]+[.!]\s*/, '') || '').slice(0, 200) + '...'}
              </Typography>
              {currentListing.description && currentListing.description.length > 200 && window.innerWidth < 768 && (
                <Button 
                  size="small"
                  sx={{ 
                    color: 'primary.light', 
                    mt: 1, 
                    p: 0, 
                    fontSize: '0.75rem' 
                  }}
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show Less' : 'Show More'}
                </Button>
              )}
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              pt: 2, 
              opacity: 0.5 
            }}>
              <IconButton
                sx={{ 
                  bgcolor: 'grey.600',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.2s',
                  transform: 'scale(1)',
                  '&:hover': {
                    bgcolor: 'grey.700',
                    transform: 'scale(1.05)'
                  }
                }}
                disabled={currentIndex === 0}
                onClick={() => currentIndex > 0 && handleNavigation('prev')}
              >
                <ArrowBackIos />
              </IconButton>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <a 
                  href={currentListing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconButton
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      boxShadow: 3,
                      transition: 'all 0.2s',
                      transform: 'scale(1)',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <OpenInNew />
                  </IconButton>
                </a>
                <a 
                  href={currentListing.searches?.search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconButton
                    sx={{ 
                      bgcolor: 'secondary.main',
                      color: 'white',
                      boxShadow: 3,
                      transition: 'all 0.2s',
                      transform: 'scale(1)',
                      '&:hover': {
                        bgcolor: 'secondary.dark',
                        transform: 'scale(1.05)'
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Search />
                  </IconButton>
                </a>
                <IconButton
                  sx={{ 
                    bgcolor: 'error.main',
                    color: 'white',
                    boxShadow: 3,
                    transition: 'all 0.2s',
                    transform: 'scale(1)',
                    '&:hover': {
                      bgcolor: 'error.dark',
                      transform: 'scale(1.05)'
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLike(currentListing)
                  }}
                >
                  {likedListings[currentListing.id] ? (
                    <Favorite />
                  ) : (
                    <FavoriteBorder />
                  )}
                </IconButton>
              </Box>
              <IconButton
                sx={{ 
                  bgcolor: 'grey.600',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.2s',
                  transform: 'scale(1)',
                  '&:hover': {
                    bgcolor: 'grey.700',
                    transform: 'scale(1.05)'
                  }
                }}
                disabled={currentIndex >= listings.length - 1}
                onClick={() => currentIndex < listings.length - 1 && handleNavigation('next')}
              >
                <ArrowForwardIos />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
