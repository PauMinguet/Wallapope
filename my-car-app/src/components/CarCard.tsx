import React from 'react'
import { Card, CardContent, CardMedia, Typography, Button } from '@mui/material'
import { Listing } from '../../types/listing'

interface CarCardProps {
  listing: Listing
  onSwipe: (direction: 'left' | 'right') => void
}

const CarCard: React.FC<CarCardProps> = ({ listing, onSwipe }) => {
  return (
    <Card className="w-full max-w-sm mx-auto bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      <CardMedia
        component="img"
        height="200"
        image={listing.listing_images[0]?.image_url || '/placeholder.svg'}
        alt={listing.title}
        className="h-48 object-cover"
      />
      <CardContent className="p-4">
        <Typography variant="h6" component="div" className="text-white mb-2">
          {listing.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-2">
          {listing.year} • {listing.kilometers} km • {listing.fuel_type}
        </Typography>
        <Typography variant="h6" component="div" className="text-green-500 mb-2">
          {listing.price_text}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-4">
          {listing.location}
        </Typography>
        <div className="flex justify-between">
          <Button
            variant="contained"
            color="secondary"
            onClick={() => onSwipe('left')}
            className="w-1/3"
          >
            No
          </Button>
          <Button
            variant="contained"
            color="primary"
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-1/3"
          >
            View
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onSwipe('right')}
            className="w-1/3"
          >
            Yes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CarCard

