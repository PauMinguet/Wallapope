'use client'

import { useEffect, useState } from 'react'
import { Container, Typography, IconButton, Card, CardMedia, CardContent, CardActions } from '@mui/material'
import { ArrowLeft, OpenInNew, Delete } from '@mui/icons-material'
import Link from 'next/link'
import { LikedListing } from '../../../types/listing'

export default function LikedPage() {
  const [likedListings, setLikedListings] = useState<{[key: string]: LikedListing}>({})

  useEffect(() => {
    const saved = localStorage.getItem('likedListings')
    if (saved) {
      setLikedListings(JSON.parse(saved))
    }
  }, [])

  const removeLike = (id: string) => {
    const newLikedListings = { ...likedListings }
    delete newLikedListings[id]
    setLikedListings(newLikedListings)
    localStorage.setItem('likedListings', JSON.stringify(newLikedListings))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="no-underline">
          <IconButton className="!bg-gray-800/50 hover:!bg-gray-800/70 text-white">
            <ArrowLeft className="w-5 h-5" />
          </IconButton>
        </Link>
      </div>

      <Container className="pt-16">
        <Typography variant="h4" component="h1" className="mb-8 text-center">
          Liked Listings
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(likedListings).map((listing) => (
            <Card key={listing.id} className="bg-gray-800 text-white">
              <CardMedia
                component="img"
                height="200"
                image={listing.image_url}
                alt={listing.title}
                className="h-48 object-cover"
              />
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Typography variant="caption" className="bg-gray-700 px-2 py-1 rounded">
                    {listing.vehicle_type}
                  </Typography>
                </div>
                <Typography variant="h6" className="line-clamp-2">
                  {listing.title}
                </Typography>
                <Typography variant="h5" className="text-green-400 mt-2">
                  {listing.price_text}
                </Typography>
                <Typography variant="body2" className="text-gray-400 mt-1">
                  {listing.location}
                </Typography>
                {listing.year && listing.kilometers && (
                  <Typography variant="caption" className="text-gray-500 block mt-2">
                    {listing.year} · {listing.kilometers.toLocaleString()} km
                  </Typography>
                )}
              </CardContent>
              <CardActions className="justify-between">
                <IconButton
                  className="!bg-red-500/20 hover:!bg-red-500/30 text-red-400"
                  onClick={() => removeLike(listing.id)}
                >
                  <Delete />
                </IconButton>
                <IconButton
                  className="!bg-blue-500/20 hover:!bg-blue-500/30 text-blue-400"
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNew />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </div>

        {Object.keys(likedListings).length === 0 && (
          <Typography className="text-center text-gray-400 mt-8">
            No liked listings yet
          </Typography>
        )}
      </Container>
    </div>
  )
} 