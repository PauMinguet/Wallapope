'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Container, Typography, Button, IconButton, Tabs, Tab, Skeleton } from '@mui/material'
import { 
  DirectionsCar, 
  TwoWheeler, 
  LocalShipping, 
  ElectricScooter,
  OpenInNew, 
  Search,
  ArrowBackIos,
  ArrowForwardIos 
} from '@mui/icons-material'
import { Listing } from '../../types/listing'

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
  <div className="space-y-4">
    <div className="flex justify-between items-start">
      <div>
        <Skeleton variant="text" width={240} height={32} className="bg-gray-700" />
        <div className="flex items-baseline gap-2 mt-1">
          <Skeleton variant="text" width={100} height={28} className="bg-gray-700" />
          <Skeleton variant="text" width={140} height={20} className="bg-gray-700" />
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <Skeleton variant="text" width={60} height={16} className="bg-gray-700" />
          <Skeleton variant="text" width={80} height={20} className="bg-gray-700" />
        </div>
      ))}
    </div>
    
    <Skeleton variant="text" width={160} height={16} className="bg-gray-700" />
    
    <div>
      <Skeleton variant="text" width="100%" height={60} className="bg-gray-700" />
    </div>
    
    <div className="flex justify-between items-center pt-2 opacity-50">
      <Skeleton variant="circular" width={40} height={40} className="bg-gray-700" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={120} height={36} className="bg-gray-700 rounded" />
        <Skeleton variant="circular" width={36} height={36} className="bg-gray-700" />
      </div>
      <Skeleton variant="circular" width={40} height={40} className="bg-gray-700" />
    </div>
  </div>
)

export default function Home() {
  const [vehicleType, setVehicleType] = useState<'coches' | 'motos' | 'furgos' | 'scooters'>('coches')
  const [listings, setListings] = useState<Listing[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/listings?type=${vehicleType}`)
      const data = await response.json()
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

  const handleNavigation = (direction: 'prev' | 'next') => {
    setCurrentIndex((prevIndex) => {
      if (direction === 'prev') {
        return Math.max(0, prevIndex - 1)
      } else {
        return Math.min(listings.length - 1, prevIndex + 1)
      }
    })
  }

  const renderVehicleSpecs = (listing: Listing) => {
    if (vehicleType === 'furgos') {
      return (
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Typography variant="caption" className="text-gray-300">Year</Typography>
            <Typography variant="body2" className="font-semibold">{listing.year || 'N/A'}</Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">Engine</Typography>
            <Typography variant="body2" className="font-semibold">{listing.motor || 'N/A'}</Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">Config</Typography>
            <Typography variant="body2" className="font-semibold">{listing.configuracion || 'N/A'}</Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">KM</Typography>
            <Typography variant="body2" className="font-semibold">
              {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
            </Typography>
          </div>
        </div>
      )
    }

    if (vehicleType === 'motos') {
      return (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Typography variant="caption" className="text-gray-300">Year</Typography>
            <Typography variant="body2" className="font-semibold">{listing.year || 'N/A'}</Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">KM</Typography>
            <Typography variant="body2" className="font-semibold">
              {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
            </Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">Power</Typography>
            <Typography variant="body2" className="font-semibold">{listing.power_cv ? `${listing.power_cv} CV` : 'N/A'}</Typography>
          </div>
        </div>
      )
    }

    if (vehicleType === 'scooters') {
      return (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Typography variant="caption" className="text-gray-300">Year</Typography>
            <Typography variant="body2" className="font-semibold">{listing.year || 'N/A'}</Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">Engine</Typography>
            <Typography variant="body2" className="font-semibold">
              {listing.engine_cc ? `${listing.engine_cc}cc` : 'N/A'}
            </Typography>
          </div>
          <div>
            <Typography variant="caption" className="text-gray-300">KM</Typography>
            <Typography variant="body2" className="font-semibold">
              {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
            </Typography>
          </div>
        </div>
      )
    }

    // Default car specs
    return (
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Typography variant="caption" className="text-gray-300">Year</Typography>
          <Typography variant="body2" className="font-semibold">{listing.year || 'N/A'}</Typography>
        </div>
        <div>
          <Typography variant="caption" className="text-gray-300">Mileage</Typography>
          <Typography variant="body2" className="font-semibold">
            {listing.kilometers ? `${listing.kilometers.toLocaleString()} km` : 'N/A'}
          </Typography>
        </div>
        <div>
          <Typography variant="caption" className="text-gray-300">Fuel</Typography>
          <Typography variant="body2" className="font-semibold">{listing.fuel_type || 'N/A'}</Typography>
        </div>
        <div>
          <Typography variant="caption" className="text-gray-300">Trans.</Typography>
          <Typography variant="body2" className="font-semibold">{listing.transmission || 'N/A'}</Typography>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 text-white relative">
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur-sm shadow-xl border-b border-gray-700">
          <Tabs
            value={vehicleType}
            onChange={(_, newValue) => setVehicleType(newValue)}
            className="text-white"
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
            <Tab 
              value="coches" 
              icon={<DirectionsCar />} 
              aria-label="Cars" 
            />
            <Tab 
              value="motos" 
              icon={<TwoWheeler />} 
              aria-label="Motorcycles" 
            />
            <Tab 
              value="furgos" 
              icon={<LocalShipping />} 
              aria-label="Vans" 
            />
            <Tab 
              value="scooters" 
              icon={<ElectricScooter />} 
              aria-label="Scooters" 
            />
          </Tabs>
        </div>

        <div className="h-full relative">
          <Skeleton 
            variant="rectangular" 
            width="100%" 
            height="100%" 
            className="absolute inset-0 bg-gray-800"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <ListingSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (!listings.length || currentIndex >= listings.length) {
    return (
      <Container className="flex justify-center items-center h-screen bg-gray-900">
        <Typography variant="h4" className="text-white">
          No listings to show
        </Typography>
      </Container>
    )
  }

  const currentListing = listings[currentIndex]
  if (!currentListing) {
    return null
  }

  return (
    <div className="h-screen bg-gray-900 text-white relative">
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur-sm shadow-xl border-b border-gray-700">
        <Tabs
          value={vehicleType}
          onChange={(_, newValue) => setVehicleType(newValue)}
          className="text-white"
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
          <Tab 
            value="coches" 
            icon={<DirectionsCar />} 
            aria-label="Cars" 
          />
          <Tab 
            value="motos" 
            icon={<TwoWheeler />} 
            aria-label="Motorcycles" 
          />
          <Tab 
            value="furgos" 
            icon={<LocalShipping />} 
            aria-label="Vans" 
          />
          <Tab 
            value="scooters" 
            icon={<ElectricScooter />} 
            aria-label="Scooters" 
          />
        </Tabs>
      </div>

      <div className="h-full relative">
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${
              currentListing[`listing_images_${vehicleType}`]?.[0]?.image_url || 
              currentListing.listing_images?.[0]?.image_url || 
              '/placeholder.svg'
            })`,
          }}
        />
        
        <div 
          className="absolute left-0 w-1/3 cursor-pointer z-10 h-[80%] top-0"
          onClick={() => currentIndex > 0 && handleNavigation('prev')}
        />
        <div 
          className="absolute right-0 w-1/3 cursor-pointer z-10 h-[80%] top-0"
          onClick={() => currentIndex < listings.length - 1 && handleNavigation('next')}
        />
        
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  {currentListing.isReserved && (
                    <div className="inline-block px-2 py-1 mb-2 bg-yellow-500/80 text-black text-xs font-semibold rounded">
                      Reserved
                    </div>
                  )}
                  <Typography variant="h5" className="font-bold text-white">
                    {currentListing.title
                      .replace(/^Slide \d+ of \d+\s*/, '')
                      .replace(/^\d+[\d.,]*\s*€\s*/, '')
                      .split(' - ')[0]
                      .split(/\d{5,}|\s+km/)[0]
                      .split(/Gasolina|Diesel|Diésel/)[0]
                      .replace(/\s+\d{4}\s*$/, '')
                      .trim()}
                  </Typography>
                  <div className="flex items-baseline gap-2">
                    <Typography variant="h6" className="text-green-400">
                      {currentListing.price_text
                        .replace(/\([^)]*\)/g, '')
                        .replace(/^Slide \d+ of \d+\s*/, '')
                        .replace(/€.*$/, '€')
                        .trim()}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      className={`${
                        currentListing.price_difference > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      ({formatPriceDifference(currentListing.price_difference, vehicleType)})
                    </Typography>
                  </div>
                </div>
              </div>
              
              {renderVehicleSpecs(currentListing)}
              
              <Typography variant="caption" className="text-gray-300 block">
                {currentListing.location}
              </Typography>
              
              <div>
                <Typography variant="caption" className="text-gray-100">
                  {showFullDescription || window.innerWidth >= 768
                    ? currentListing.description?.replace(/^Slide \d+ of \d+ /, '').replace(/^[^.!]+[.!]\s*/, '') || ''
                    : (currentListing.description?.replace(/^Slide \d+ of \d+ /, '').replace(/^[^.!]+[.!]\s*/, '') || '').slice(0, 200) + '...'}
                </Typography>
                {currentListing.description && currentListing.description.length > 200 && window.innerWidth < 768 && (
                  <Button 
                    size="small"
                    className="text-blue-400 mt-1 p-0 text-xs"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? 'Show Less' : 'Show More'}
                  </Button>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-2 opacity-50">
                <IconButton
                  className="!bg-gray-600 text-white"
                  disabled={currentIndex === 0}
                  sx={{
                    opacity: currentIndex === 0 ? 0.5 : 1,
                    cursor: 'default',
                    '&:hover': {
                      backgroundColor: 'rgba(75, 85, 99, 0.6)'
                    }
                  }}
                >
                  <ArrowBackIos />
                </IconButton>
                <div className="flex gap-2">
                  <Button
                    variant="contained"
                    className="!bg-blue-500 hover:!bg-blue-600 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                    href={currentListing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<OpenInNew />}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Listing
                  </Button>
                  <IconButton
                    className="!bg-gray-600 hover:!bg-gray-700 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                    href={currentListing.searches.search_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Search fontSize="small" />
                  </IconButton>
                </div>
                <IconButton
                  className="!bg-gray-600 text-white"
                  disabled={currentIndex >= listings.length - 1}
                  sx={{
                    opacity: currentIndex >= listings.length - 1 ? 0.5 : 1,
                    cursor: 'default',
                    '&:hover': {
                      backgroundColor: 'rgba(75, 85, 99, 0.6)'
                    }
                  }}
                >
                  <ArrowForwardIos />
                </IconButton>
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  )
}

