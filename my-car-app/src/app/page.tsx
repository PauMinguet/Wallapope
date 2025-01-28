'use client'

import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import { 
  Search,
  TrendingDown,
  Notifications,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import TopBar from './components/TopBar'
import { useState } from 'react'
import PricingSection from './components/PricingSection'
import Footer from './components/Footer'
import ListingsGrid from './components/ListingsGrid'

const Chat = dynamic(() => import('./components/Chat'), {
  ssr: false,
})

const LiveActivityToast = dynamic(() => import('./components/LiveActivityToast'), {
  ssr: false,
})

const MotionTypography = motion.create(Typography)

interface MarketData {
  average_price: number;
  min_price: number;
  max_price: number;
  total_listings: number;
  median_price: number;
}

interface ListingImage {
  large?: string;
  original: string;
}

interface ListingContent {
  title: string;
  storytelling: string;
  price: number;
  location: {
    city: string;
    postal_code: string;
  };
  year: number;
  km: number;
  engine: string;
  gearbox: string;
  web_slug: string;
  horsepower: number;
  distance: number;
  images: ListingImage[];
}

interface Listing {
  id: string;
  content: ListingContent;
}

interface QuickSearchResults {
  market_data?: MarketData;
  listings?: Listing[];
}

export default function HomePage() {
  const router = useRouter()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [searchStep, setSearchStep] = useState<'model' | 'year' | 'results'>('model')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [quickSearchResults, setQuickSearchResults] = useState<QuickSearchResults | null>(null)
  const [quickSearchError, setQuickSearchError] = useState<string | null>(null)
  const [isQuickSearching, setIsQuickSearching] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const features = [
    {
      icon: <Search sx={{ fontSize: 40 }} />,
      title: 'Búsqueda Inteligente',
      description: 'Encuentra el coche perfecto con nuestros filtros avanzados'
    },
    {
      icon: <TrendingDown sx={{ fontSize: 40 }} />,
      title: 'Análisis de Mercado',
      description: 'Compara precios y encuentra las mejores ofertas'
    },
    {
      icon: <Notifications sx={{ fontSize: 40 }} />,
      title: 'Alertas Personalizadas',
      description: 'Recibe notificaciones cuando aparezcan nuevas ofertas'
    }
  ]

  const stats = [
    { number: '50K+', label: 'Coches analizados' },
    { number: '20%', label: 'Ahorro medio' },
    { number: '24/7', label: 'Monitorización' }
  ]

  const handleModelSelect = (make: string) => {
    setSelectedModel(make)
    setSearchStep('year')
  }

  const handleYearSelect = async (year: string) => {
    setSelectedYear(year)
    setSearchStep('results')
    
    // Automatically trigger search
    const prevModel = selectedModel
    setIsQuickSearching(true)
    setQuickSearchError(null)

    try {
      // Parse the selected model into brand and model, handling special cases
      let brand, model
      if (prevModel) {
        if (prevModel.startsWith('BMW')) {
          brand = 'BMW'
          model = prevModel.replace('BMW ', '')
        } else if (prevModel.startsWith('Mercedes')) {
          brand = 'Mercedes'
          model = prevModel.replace('Mercedes ', '')
        } else {
          [brand, model] = prevModel.split(' ')
        }
      }

      // Parse the selected year range
      const [minYear, maxYear] = year.split(' - ').map(Number)

      const searchParams = {
        brand,
        model,
        min_year: minYear,
        max_year: maxYear,
        latitude: 40.4637,
        longitude: -3.7492,
        distance: 500000
      }

      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, v]) => v !== undefined)
      )

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/search-single-car`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanParams)
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setQuickSearchResults(data)
    } catch (error) {
      console.error('Error performing quick search:', error)
      setQuickSearchError('Error en la búsqueda rápida')
    } finally {
      setIsQuickSearching(false)
    }
  }

  const resetSearch = () => {
    setSearchStep('model')
    setSelectedModel(null)
    setSelectedYear(null)
    setQuickSearchResults(null)
    setQuickSearchError(null)
  }

  return (
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
      '& .MuiContainer-root, & .MuiContainer-maxWidthLg': {
        background: 'transparent !important',
        bgcolor: 'transparent !important',
        '&::before, &::after': {
          background: 'transparent !important',
          bgcolor: 'transparent !important'
        }
      }
    }}>
      <TopBar />

      {/* Add padding to content to account for fixed header */}
      <Box sx={{ pt: { xs: 6, md: 8 } }}>
        {/* Fixed Background Pattern */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            overflow: 'hidden'
          }}
        >
          {/* Top Left Blob */}
          <Box
            sx={{
              position: 'absolute',
              top: '5%',
              left: '0%',
              width: '50%',
              height: '60%',
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              filter: 'blur(150px)',
              opacity: 0.07,
              borderRadius: '50%',
              transform: 'rotate(-45deg)'
            }}
          />
          {/* Center Right Blob */}
          <Box
            sx={{
              position: 'absolute',
              top: '40%',
              right: '-10%',
              width: '50%',
              height: '60%',
              background: 'linear-gradient(45deg, #9400D3, #4169E1)',
              filter: 'blur(150px)',
              opacity: 0.07,
              borderRadius: '50%',
              transform: 'rotate(30deg)'
            }}
          />
          {/* Bottom Left Blob */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '-10%',
              left: '20%',
              width: '40%',
              height: '60%',
              background: 'linear-gradient(45deg, #4169E1, #9400D3)',
              filter: 'blur(150px)',
              opacity: 0.07,
              borderRadius: '50%',
              transform: 'rotate(-15deg)'
            }}
          />
        </Box>

        {/* Content Container */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Hero Section */}
          <Box sx={{
            color: 'white',
            pt: { xs: 12, md: 14 },
            pb: { xs: 6, md: 8 },
            position: 'relative',
            overflow: 'hidden',
            minHeight: { xs: 'auto', md: 'auto' },
            display: 'flex',
            alignItems: 'center',
            textAlign: { xs: 'center', md: 'left' }
          }}>
            <Container maxWidth="lg">
              <Box sx={{ maxWidth: { xs: '100%', md: '70%' }, mx: { xs: 'auto', md: 0 } }}>
                <MotionTypography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '3rem', sm: '3.5rem', md: '5rem' },
                    fontWeight: 900,
                    lineHeight: { xs: 1.1, md: 1.1 },
                    background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: { xs: 2, md: 3 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  Tu coche ideal al mejor precio
                </MotionTypography>

                <MotionTypography
                  variant="h4"
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.7)',
                    maxWidth: '600px',
                    lineHeight: 1.4,
                    mx: { xs: 'auto', md: 0 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  Análisis de mercado en tiempo real para encontrar las mejores ofertas
                </MotionTypography>
              </Box>
            </Container>
          </Box>

          {/* Stats Section - Moved up */}
          <Container maxWidth="lg" sx={{ 
            mb: { xs: 6, md: 8 },
            position: 'relative',
            zIndex: 2,
            px: { xs: 2, md: 3 },
          }}>
            <Card sx={{ 
              borderRadius: { xs: 3, md: 4 },
              boxShadow: 'none',
              background: 'transparent',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              zIndex: 2,
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent sx={{ 
                py: { xs: 2.5, md: 4 },
                px: { xs: 2, md: 3 },
                background: '#111111',
                borderRadius: { xs: 3, md: 4 }
              }}>
                <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="center">
                  {stats.map((stat, index) => (
                    <Grid item xs={4} key={index} sx={{ textAlign: 'center' }}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            fontWeight: 'bold', 
                            mb: { xs: 0.5, md: 1 },
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                            background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          {stat.number}
                        </Typography>
                        <Typography 
                          variant="subtitle1" 
                          sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                            color: 'rgba(255,255,255,0.7)'
                          }}
                        >
                          {stat.label}
                        </Typography>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Container>

          {/* Quick Search Section - Card Style */}
          <Container maxWidth="lg" sx={{ mb: { xs: 8, md: 10 } }}>
            <Card sx={{ 
              borderRadius: { xs: 3, md: 4 },
              background: 'transparent',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <CardContent sx={{ 
                p: { xs: 2, md: 3 },
                background: '#111111',
                borderRadius: { xs: 3, md: 4 }
              }}>
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: 'white',
                      textAlign: 'center',
                      mb: 0.5
                    }}
                  >
                    Prueba rápida 🚀
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      textAlign: 'center',
                      mb: 1,
                      maxWidth: 600,
                      mx: 'auto',
                      fontSize: '0.9rem',
                      lineHeight: 1.4
                    }}
                  >
                    {searchStep === 'model' && 'Selecciona un modelo para empezar'}
                    {searchStep === 'year' && 'Ahora, elige un rango de años'}
                    {searchStep === 'results' && 'Resultados de tu búsqueda'}
                  </Typography>

                  {/* Selected Options Display */}
                  {(selectedModel || selectedYear) && (
                    <Stack 
                      direction="row" 
                      spacing={1} 
                      sx={{ 
                        mb: 2,
                        flexWrap: 'wrap',
                        gap: 1,
                        justifyContent: 'center'
                      }}
                    >
                      {selectedModel && (
                        <Chip
                          label={selectedModel}
                          onDelete={resetSearch}
                          sx={{
                            background: 'linear-gradient(45deg, rgba(65,105,225,0.2), rgba(148,0,211,0.2))',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            '& .MuiChip-deleteIcon': {
                              color: 'rgba(255,255,255,0.7)',
                              '&:hover': { color: 'white' }
                            }
                          }}
                        />
                      )}
                      {selectedYear && (
                        <Chip
                          label={selectedYear}
                          onDelete={resetSearch}
                          sx={{
                            background: 'linear-gradient(45deg, rgba(65,105,225,0.2), rgba(148,0,211,0.2))',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            '& .MuiChip-deleteIcon': {
                              color: 'rgba(255,255,255,0.7)',
                              '&:hover': { color: 'white' }
                            }
                          }}
                        />
                      )}
                    </Stack>
                  )}

                  {/* Model Selection */}
                  {searchStep === 'model' && (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        flexWrap: 'wrap',
                        gap: 0.5,
                        justifyContent: 'center'
                      }}
                    >
                      {['Volkswagen Golf', 'BMW Serie 3', 'Mercedes Clase A', 'Audi A3', 'Seat León'].map((make, index) => (
                        <Button
                          key={make}
                          variant="contained"
                          onClick={() => handleModelSelect(make)}
                          sx={{
                            background: [
                              'linear-gradient(45deg, rgba(65,105,225,0.7), rgba(107,35,142,0.7))',
                              'linear-gradient(45deg, rgba(107,35,142,0.7), rgba(148,0,211,0.7))',
                              'linear-gradient(45deg, rgba(44,62,147,0.7), rgba(65,105,225,0.7))',
                              'linear-gradient(45deg, rgba(148,0,211,0.7), rgba(65,105,225,0.7))',
                              'linear-gradient(45deg, rgba(65,105,225,0.7), rgba(44,62,147,0.7))',
                            ][index],
                            color: 'white',
                            borderRadius: '20px',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            '&:hover': {
                              background: [
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(125,43,166,0.8))',
                                'linear-gradient(45deg, rgba(125,43,166,0.8), rgba(128,0,179,0.8))',
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(128,0,179,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(54,74,173,0.8))',
                              ][index],
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {make}
                        </Button>
                      ))}
                    </Stack>
                  )}

                  {/* Year Selection */}
                  {searchStep === 'year' && (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        flexWrap: 'wrap',
                        gap: 0.5,
                        justifyContent: 'center'
                      }}
                    >
                      {[
                        { range: '2020 - 2022' },
                        { range: '2017 - 2019' },
                        { range: '2014 - 2016' },
                        { range: '2011 - 2013' }
                      ].map((year, index) => (
                        <Button
                          key={year.range}
                          variant="contained"
                          onClick={() => handleYearSelect(year.range)}
                          sx={{
                            background: [
                              'linear-gradient(45deg, rgba(65,105,225,0.7), rgba(44,62,147,0.7))',
                              'linear-gradient(45deg, rgba(107,35,142,0.7), rgba(65,105,225,0.7))',
                              'linear-gradient(45deg, rgba(148,0,211,0.7), rgba(107,35,142,0.7))',
                            ][index],
                            color: 'white',
                            borderRadius: '20px',
                            px: 2,
                            py: 1,
                            textTransform: 'none',
                            '&:hover': {
                              background: [
                                'linear-gradient(45deg, rgba(54,74,173,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(125,43,166,0.8), rgba(54,74,173,0.8))',
                                'linear-gradient(45deg, rgba(128,0,179,0.8), rgba(125,43,166,0.8))',
                              ][index],
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {year.range}
                        </Button>
                      ))}
                    </Stack>
                  )}

                  {/* Loading State */}
                  {isQuickSearching && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <CircularProgress sx={{ color: 'white' }} />
                    </Box>
                  )}

                  {/* Error State */}
                  {quickSearchError && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mt: 3,
                        animation: 'slideIn 0.3s ease-out',
                        '@keyframes slideIn': {
                          from: { transform: 'translateY(-20px)', opacity: 0 },
                          to: { transform: 'translateY(0)', opacity: 1 }
                        }
                      }}
                    >
                      {quickSearchError}
                    </Alert>
                  )}

                  {/* Results Section */}
                  {searchStep === 'results' && quickSearchResults && !isQuickSearching && (
                    <Box sx={{ 
                      mt: 4,
                      animation: 'fadeIn 0.5s ease-out',
                      '@keyframes fadeIn': {
                        from: { opacity: 0 },
                        to: { opacity: 1 }
                      },
                      width: '100%'
                    }}>
                      {/* Market Analysis Section */}
                      {quickSearchResults.market_data && (
                        <Box sx={{ mb: 4 }}>
                          <Grid container spacing={3} alignItems="center">
                            <Grid item>
                              <Typography variant="h6" sx={{ mr: 3, color: 'white' }}>
                                Análisis de Mercado
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                                Media:
                              </Typography>
                              <Typography component="span" sx={{ mr: 3, fontWeight: 'bold', color: 'white' }}>
                                {formatPrice(quickSearchResults.market_data.average_price)}
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                                Rango:
                              </Typography>
                              <Typography component="span" sx={{ mr: 3, fontWeight: 'bold', color: 'white' }}>
                                {formatPrice(quickSearchResults.market_data.min_price)} - {formatPrice(quickSearchResults.market_data.max_price)}
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Typography component="span" sx={{ mr: 1, color: 'rgba(255,255,255,0.7)' }}>
                                Total anuncios:
                              </Typography>
                              <Typography component="span" sx={{ fontWeight: 'bold', color: 'white' }}>
                                {quickSearchResults.market_data.total_listings}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      )}

                      {/* Divider */}
                      <Box sx={{ 
                        height: 1, 
                        bgcolor: 'rgba(255,255,255,0.1)', 
                        mb: 4 
                      }} />

                      {/* Quick Search Listings */}
                      {quickSearchResults?.listings && quickSearchResults.listings.length > 0 && (
                        <>
                          <Typography variant="h6" sx={{ 
                            mb: 3,
                            fontWeight: 'bold',
                            color: 'white'
                          }}>
                            {quickSearchResults.listings.length} anuncios encontrados
                          </Typography>

                          <Box sx={{ 
                            '& .MuiGrid-container': { 
                              justifyContent: 'center',
                              '& .MuiGrid-item': {
                                maxWidth: { xs: '100%', sm: '50%', md: '33.333%' }
                              }
                            }
                          }}>
                            <ListingsGrid 
                              listings={quickSearchResults.listings.map((listing: Listing) => ({
                                id: listing.id,
                                title: listing.content.title,
                                description: listing.content.storytelling,
                                price: listing.content.price,
                                price_text: formatPrice(listing.content.price),
                                market_price: quickSearchResults.market_data?.median_price || 0,
                                market_price_text: formatPrice(quickSearchResults.market_data?.median_price || 0),
                                price_difference: (quickSearchResults.market_data?.median_price || 0) - listing.content.price,
                                price_difference_percentage: `${Math.abs(((quickSearchResults.market_data?.median_price || 0) - listing.content.price) / (quickSearchResults.market_data?.median_price || 1) * 100).toFixed(1)}%`,
                                location: `${listing.content.location.city}, ${listing.content.location.postal_code}`,
                                year: listing.content.year,
                                kilometers: listing.content.km,
                                fuel_type: listing.content.engine,
                                transmission: listing.content.gearbox,
                                url: `https://es.wallapop.com/item/${listing.content.web_slug}`,
                                horsepower: listing.content.horsepower,
                                distance: listing.content.distance,
                                listing_images: listing.content.images.map((img: ListingImage) => ({
                                  image_url: img.large || img.original
                                }))
                              }))}
                              loading={isQuickSearching}
                              showNoResults={!isQuickSearching && (!quickSearchResults.listings || quickSearchResults.listings.length === 0)}
                              simplified={true}
                            />
                          </Box>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Container>

          {/* Features Section */}
          <Box sx={{ 
            position: 'relative',
            overflow: 'hidden',
            pb: { xs: 4, md: 6 },
          }}>
            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <Typography variant="h3" sx={{ 
                    fontWeight: 'bold', 
                    mb: { xs: 1, md: 2 },
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                    background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    ¿Por qué elegirnos?
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}>
                    Herramientas avanzadas para una búsqueda inteligente
                  </Typography>
                </motion.div>
              </Box>

              <Grid container spacing={{ xs: 2, md: 4 }}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                      viewport={{ once: true, margin: "-100px" }}
                    >
                      <Card sx={{ 
                        height: '100%',
                        borderRadius: { xs: 3, md: 4 },
                        transition: 'all 0.3s ease-in-out',
                        background: 'transparent',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          borderColor: '#4169E1',
                          background: 'rgba(255,255,255,0.03)'
                        }
                      }}>
                        <CardContent sx={{ 
                          textAlign: 'center', 
                          p: { xs: 3, md: 4 },
                          background: '#111111',
                          borderRadius: { xs: 3, md: 4 }
                        }}>
                          <Box sx={{ 
                            mb: { xs: 1.5, md: 2 },
                            display: 'inline-flex',
                            p: { xs: 1.5, md: 2 },
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            color: 'white'
                          }}>
                            {feature.icon}
                          </Box>
                          <Typography variant="h5" sx={{ 
                            mb: { xs: 1, md: 2 }, 
                            fontWeight: 'bold', 
                            color: 'white',
                            fontSize: { xs: '1.25rem', md: '1.5rem' }
                          }}>
                            {feature.title}
                          </Typography>
                          <Typography sx={{ 
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}>
                            {feature.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Container>
          </Box>

          {/* Pricing Section */}
          <PricingSection onContactClick={() => setIsChatOpen(!isChatOpen)} />

          {/* CTA Section */}
          <Box sx={{ 
            py: { xs: 4, md: 6 },
            pb: { xs: 12, md: 16 },
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Container maxWidth="lg">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <Card sx={{ 
                  borderRadius: { xs: 3, md: 4 },
                  background: 'transparent',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.03)'
                  }
                }}>
                  <CardContent sx={{ 
                    p: { xs: 3, md: 6 }, 
                    position: 'relative', 
                    zIndex: 1,
                    background: '#111111',
                    borderRadius: { xs: 3, md: 4 }
                  }}>
                    <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
                      <Grid item xs={12} md={8}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 'bold', 
                          mb: { xs: 1, md: 2 },
                          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                          background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                          ¿Listo para encontrar tu coche ideal?
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          mb: { xs: 3, md: 4 }, 
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          Empieza tu búsqueda ahora y encuentra las mejores ofertas del mercado
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth={true}
                          onClick={() => router.push('/pricing')}
                          sx={{
                            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
                            borderRadius: '28px',
                            color: 'white',
                            px: { xs: 3, md: 4 },
                            py: { xs: 1.5, md: 2 },
                            textTransform: 'none',
                            fontSize: { xs: '0.9rem', md: '1rem' },
                            '&:hover': {
                              background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
                            }
                          }}
                        >
                          Empezar ahora
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                  {/* Background decoration */}
                  <Box sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                    filter: 'blur(150px)',
                    opacity: 0.1
                  }} />
                </Card>
              </motion.div>
            </Container>
          </Box>

          {/* Footer */}
          <Footer />

        </Box>
      </Box>

      {/* Chat Component */}
      {isChatOpen && (
        <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}
      
      {/* Live Activity Toast */}
      <LiveActivityToast />

      {/* Floating Chat Button */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, md: 32 },
          right: { xs: 16, md: 32 },
          zIndex: 1000
        }}
      >
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          variant="contained"
          sx={{
            borderRadius: '50%',
            width: { xs: 56, md: 64 },
            height: { xs: 56, md: 64 },
            minWidth: 'unset',
            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #364AAD, #7D2BA6)',
            }
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="white"/>
          </svg>
        </Button>
      </Box>
    </Box>
  )
} 