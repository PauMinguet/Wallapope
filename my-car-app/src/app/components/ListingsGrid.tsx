import React from 'react';
import Image from 'next/image';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert
} from '@mui/material';
import { OpenInNew, Search } from '@mui/icons-material';
import ListingSkeleton from './ListingSkeleton';
import { SxProps, Theme } from '@mui/material/styles';

export interface Listing {
  id: string;
  title: string;
  price: number;
  price_text: string;
  market_price: number;
  market_price_text: string;
  price_difference: number;
  price_difference_percentage: string;
  location: string;
  year: number;
  kilometers: number;
  fuel_type: string;
  transmission: string;
  url: string;
  horsepower: number;
  distance: number;
  listing_images: Array<{
    image_url: string;
  }>;
  searches?: {
    search_url?: string;
  };
}

interface ListingsGridProps {
  listings: Listing[];
  loading?: boolean;
  showNoResults?: boolean;
  sx?: SxProps<Theme>;
}

const ListingsGrid: React.FC<ListingsGridProps> = ({ listings, loading, showNoResults, sx }) => {
  if (loading) {
    return (
      <Grid container spacing={3} sx={sx}>
        {[...Array(6)].map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <ListingSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (showNoResults) {
    return (
      <Alert 
        severity="info"
        sx={{
          animation: 'slideIn 0.3s ease-out',
          '@keyframes slideIn': {
            from: { transform: 'translateY(-20px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
          }
        }}
      >
        No se encontraron anuncios con los criterios seleccionados. Prueba a ajustar los parámetros de búsqueda.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3} sx={sx}>
      {listings.map((listing, index) => (
        <Grid item xs={12} sm={6} md={4} key={listing.id}>
          <Box sx={{
            animation: `fadeSlideIn 0.5s ease-out ${index * 0.1}s both`,
            '@keyframes fadeSlideIn': {
              from: { 
                opacity: 0,
                transform: 'translateY(20px)'
              },
              to: { 
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              bgcolor: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'visible',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.2)'
              }
            }}>
              {/* Price Difference Stamp */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  zIndex: 1,
                  bgcolor: '#d32f2f',
                  color: '#fff',
                  width: 75,
                  height: 75,
                  borderRadius: '50%',
                  fontWeight: 'bold',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-12deg)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  padding: '2px',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                  }
                }}
              >
                <Typography 
                  sx={{ 
                    fontSize: '0.9rem',
                    lineHeight: 1,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    mb: 0.5
                  }}
                >
                  {Math.round(Math.abs(listing.price_difference)).toLocaleString('es-ES')}€
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    lineHeight: 1,
                    textAlign: 'center',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    opacity: 0.9
                  }}
                >
                  {listing.price_difference_percentage}
                </Typography>
              </Box>
              <CardContent sx={{ flex: 1, p: 2 }}>
                {listing.listing_images?.[0]?.image_url && (
                  <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 2 }}>
                    <Image 
                      src={listing.listing_images[0].image_url} 
                      alt={listing.title}
                      fill
                      style={{
                        objectFit: 'cover',
                        borderRadius: 8
                      }}
                    />
                  </Box>
                )}
                <Typography variant="h6" gutterBottom noWrap sx={{ color: 'white' }}>
                  {listing.title}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ 
                      background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 'bold'
                    }}>
                      {listing.price_text}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Mercado: {listing.market_price_text}
                    </Typography>
                  </Box>
                </Box>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Año</Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>{listing.year}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>KM</Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>{listing.kilometers?.toLocaleString() || 'N/D'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Potencia</Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>{listing.horsepower ? `${listing.horsepower} CV` : 'N/D'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Motor</Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>{listing.fuel_type || 'N/D'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Cambio</Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>{listing.transmission || 'N/D'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Distancia</Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>{listing.distance ? `${listing.distance} km` : 'N/D'}</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ 
                  mt: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 1,
                  '& .MuiButton-root': {
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.8rem',
                    background: 'linear-gradient(45deg, rgba(44,62,147,0.6), rgba(107,35,142,0.6))',
                    borderColor: 'transparent',
                    color: 'white',
                    minWidth: 'unset',
                    '&:hover': {
                      background: 'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(125,43,166,0.8))',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: 0.5
                    },
                    transition: 'all 0.2s ease'
                  }
                }}>
                  <Button 
                    variant="outlined" 
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<OpenInNew sx={{ fontSize: '1rem' }} />}
                  >
                    Ver
                  </Button>
                  {listing.searches?.search_url && (
                    <Button 
                      variant="outlined"
                      href={listing.searches.search_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<Search sx={{ fontSize: '1rem' }} />}
                    >
                      Similares
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default ListingsGrid; 