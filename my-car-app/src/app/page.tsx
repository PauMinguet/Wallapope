'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Container, CircularProgress, Typography, Button, IconButton, Tabs, Tab } from '@mui/material'
import { ThumbUp, ThumbDown, OpenInNew, Search } from '@mui/icons-material'
import { Listing } from '../../types/listing'

const formatPriceDifference = (diff: number) => {
  const formatted = Math.abs(diff).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return diff > 0 ? `${formatted} below target` : `${formatted} above target`
}

export default function Home() {
  const [vehicleType, setVehicleType] = useState<'coches' | 'motos' | 'furgos'>('coches')
  const [listings, setListings] = useState<Listing[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [hideText, setHideText] = useState(false)

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

  const handleSwipe = (direction: 'left' | 'right') => {
    console.log(`Swiped ${direction} on listing:`, listings[currentIndex])
    setCurrentIndex((prevIndex) => prevIndex + 1)
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
      <Container className="flex justify-center items-center h-screen bg-gray-900">
        <CircularProgress className="text-blue-500" />
      </Container>
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
              '&.Mui-selected': {
                color: 'white'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'white'
            }
          }}
        >
          <Tab value="coches" label="Cars" />
          <Tab value="motos" label="Motorcycles" />
          <Tab value="furgos" label="Vans" />
        </Tabs>
      </div>

      <div className="h-full relative">
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat cursor-pointer"
          style={{
            backgroundImage: `url(${
              currentListing[`listing_images_${vehicleType}`]?.[0]?.image_url || 
              currentListing.listing_images?.[0]?.image_url || 
              '/placeholder.svg'
            })`,
          }}
          onClick={() => setHideText(!hideText)}
        />
        
        {!hideText && (
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
                        ({formatPriceDifference(currentListing.price_difference)})
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
                
                <div className="flex justify-between items-center pt-2">
                  <IconButton
                    className="!bg-red-500 hover:!bg-red-600 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                    onClick={() => handleSwipe('left')}
                  >
                    <ThumbDown />
                  </IconButton>
                  <div className="flex gap-2">
                    <Button
                      variant="contained"
                      className="!bg-blue-500 hover:!bg-blue-600 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                      href={currentListing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<OpenInNew />}
                    >
                      View Listing
                    </Button>
                    <IconButton
                      className="!bg-gray-600 hover:!bg-gray-700 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                      href={currentListing.searches.search_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                    >
                      <Search fontSize="small" />
                    </IconButton>
                  </div>
                  <IconButton
                    className="!bg-green-500 hover:!bg-green-600 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
                    onClick={() => handleSwipe('right')}
                  >
                    <ThumbUp />
                  </IconButton>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

