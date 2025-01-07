'use client'

import React, { useState, useEffect } from 'react'
import { Container, CircularProgress, Typography, Button, IconButton } from '@mui/material'
import { ThumbUp, ThumbDown, OpenInNew } from '@mui/icons-material'
import { Listing } from '../../types/listing'

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [hideText, setHideText] = useState(false)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings')
      const data = await response.json()
      setListings(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching listings:', error)
      setLoading(false)
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    console.log(`Swiped ${direction} on listing:`, listings[currentIndex])
    setCurrentIndex((prevIndex) => prevIndex + 1)
  }

  if (loading) {
    return (
      <Container className="flex justify-center items-center h-screen bg-gray-900">
        <CircularProgress className="text-blue-500" />
      </Container>
    )
  }

  if (currentIndex >= listings.length) {
    return (
      <Container className="flex justify-center items-center h-screen bg-gray-900">
        <Typography variant="h4" className="text-white">
          No more listings to show
        </Typography>
      </Container>
    )
  }

  const listing = listings[currentIndex]

  return (
    <div className="h-screen bg-gray-900 text-white relative">
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat cursor-pointer"
        style={{
          backgroundImage: `url(${listing.listing_images[0]?.image_url || '/placeholder.svg'})`,
        }}
        onClick={() => setHideText(!hideText)}
      />
      
      {!hideText && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/70 to-gray-900" />
          
          <div className="relative h-full flex flex-col justify-end p-6">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <Typography variant="h5" className="font-bold text-white">
                    {listing.title
                      .replace(/^Slide \d+ of \d+\s*/, '')
                      .replace(/^\d+[\d.,]*\s*€\s*/, '')
                      .split(' - ')[0]
                      .split(/\d{5,}|\s+km/)[0]
                      .split(/Gasolina|Diesel|Diésel/)[0]
                      .replace(/\s+\d{4}\s*$/, '')
                      .trim()}
                  </Typography>
                  <Typography variant="h6" className="text-green-400">
                    {listing.price_text
                      .replace(/\([^)]*\)/g, '')
                      .replace(/^Slide \d+ of \d+\s*/, '')
                      .replace(/€.*$/, '€')
                      .trim()}
                  </Typography>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Typography variant="caption" className="text-gray-300">Year</Typography>
                  <Typography variant="body2" className="font-semibold">{listing.year}</Typography>
                </div>
                <div>
                  <Typography variant="caption" className="text-gray-300">Mileage</Typography>
                  <Typography variant="body2" className="font-semibold">{listing.kilometers.toLocaleString()} km</Typography>
                </div>
                <div>
                  <Typography variant="caption" className="text-gray-300">Fuel</Typography>
                  <Typography variant="body2" className="font-semibold">{listing.fuel_type}</Typography>
                </div>
                <div>
                  <Typography variant="caption" className="text-gray-300">Trans.</Typography>
                  <Typography variant="body2" className="font-semibold">{listing.transmission}</Typography>
                </div>
              </div>
              
              <Typography variant="caption" className="text-gray-300 block">{listing.location}</Typography>
              <div>
                <Typography variant="caption" className="text-gray-100">
                  {showFullDescription || window.innerWidth >= 768
                    ? listing.description?.replace(/^Slide \d+ of \d+ /, '').replace(/^[^.!]+[.!]\s*/, '') || ''
                    : (listing.description?.replace(/^Slide \d+ of \d+ /, '').replace(/^[^.!]+[.!]\s*/, '') || '').slice(0, 200) + '...'}
                </Typography>
                {listing.description && listing.description.length > 200 && window.innerWidth < 768 && (
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
                  className="w-12 h-12 shadow-lg bg-red-500/80 hover:bg-red-600 text-white transition-all duration-200 transform hover:scale-105"
                  onClick={() => handleSwipe('left')}
                >
                  <ThumbDown />
                </IconButton>
                <Button
                  variant="contained"
                  className="px-6 py-2 shadow-lg bg-blue-500/80 hover:bg-blue-600 text-white font-medium transition-all duration-200 transform hover:scale-105"
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<OpenInNew />}
                >
                  View Listing
                </Button>
                <IconButton
                  className="w-12 h-12 shadow-lg bg-green-500/80 hover:bg-green-600 text-white transition-all duration-200 transform hover:scale-105"
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
  )
}

