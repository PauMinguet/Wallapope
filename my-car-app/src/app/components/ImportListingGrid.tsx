import React, { useState } from 'react';
import Image from 'next/image';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { OpenInNew, Info } from '@mui/icons-material';
import ListingSkeleton from './ListingSkeleton';
import { SxProps, Theme } from '@mui/material/styles';

export interface ImportListing {
  id: string;
  title: string;
  price_chf: number;
  price_eur: number;
  import_fee: number;
  emissions_tax: number | null;
  emissions_tax_percentage: number | null;
  co2_emissions: number | null;
  total_cost: number;
  location: string;
  year: number;
  kilometers: number;
  fuel_type: string;
  transmission: string;
  url: string;
  horsepower: number;
  boe_precio: number;
  listing_images: Array<{
    image_url: string;
  }>;
}

interface ImportListingGridProps {
  listings: ImportListing[];
  loading?: boolean;
  showNoResults?: boolean;
  sx?: SxProps<Theme>;
}

interface CostsBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  listing: ImportListing;
}

interface CO2TaxInfoModalProps {
  open: boolean;
  onClose: () => void;
  boePrice: number;
  co2Emissions: number | null;
}

const CO2TaxInfoModal: React.FC<CO2TaxInfoModalProps> = ({ open, onClose, boePrice, co2Emissions }) => {
  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return '-- €';
    return price.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  };
  
  const baseCalc = boePrice ? Number((boePrice * 0.17).toFixed(2)) : 0;
  const reduction = boePrice ? Number((boePrice * 0.04).toFixed(2)) : 0;
  const taxBase = Number((baseCalc - reduction).toFixed(2));
  const finalTax = Number((taxBase * 0.0975).toFixed(2));

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(17, 25, 54, 0.95), rgba(35, 23, 65, 0.95))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        color: 'white',
        background: 'linear-gradient(45deg, rgba(44,62,147,0.6), rgba(107,35,142,0.6))',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        py: 2.5,
        px: 3,
        fontSize: '1.25rem',
        fontWeight: 'bold'
      }}>
        Cálculo de la Tasa CO2
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
          El cálculo de la tasa CO2 se realiza según la siguiente fórmula:
        </Typography>

        <TableContainer 
          component={Paper} 
          sx={{ 
            bgcolor: 'transparent',
            backgroundImage: 'none',
            boxShadow: 'none'
          }}
        >
          <Table>
            <TableBody>
              <TableRow>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  border: 'none',
                  pl: 0,
                  py: 2
                }}>
                  Precio BOE
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                  {formatPrice(boePrice)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  border: 'none',
                  pl: 0,
                  py: 2
                }}>
                  Base (17%)
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                  {formatPrice(baseCalc)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  border: 'none',
                  pl: 0,
                  py: 2
                }}>
                  Reducción (4%)
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                  -{formatPrice(reduction)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  border: 'none',
                  pl: 0,
                  py: 2
                }}>
                  Base Imponible
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                  {formatPrice(taxBase)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  border: 'none',
                  pl: 0,
                  py: 2
                }}>
                  Tasa CO2 (9.75%)
                  {co2Emissions && (
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      Basado en emisiones de {co2Emissions} g/km
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ 
                  color: 'white', 
                  border: 'none', 
                  py: 2,
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {formatPrice(finalTax)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ 
        p: 3,
        pt: 2,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(45deg, rgba(44,62,147,0.3), rgba(107,35,142,0.3))'
      }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          sx={{ 
            color: 'white', 
            borderColor: 'rgba(255,255,255,0.3)',
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CostsBreakdownModal: React.FC<CostsBreakdownModalProps> = ({ open, onClose, listing }) => {
  const [customTaxPrice, setCustomTaxPrice] = useState<number | null>(null);
  const [showCO2Info, setShowCO2Info] = useState(false);
  
  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return '-- €';
    return price.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  };

  // Calculate costs with null checks and round to 2 decimal places
  const basePrice = listing.price_chf ? Number((listing.price_chf * 1.0590).toFixed(2)) : 0;
  const priceForTax = customTaxPrice ?? basePrice;
  const importTax = Number((priceForTax * 0.31).toFixed(2));
  
  // Calculate new CO2 tax with null checks and round to 2 decimal places
  const baseCalc = listing.boe_precio ? Number((listing.boe_precio * 0.17).toFixed(2)) : 0;
  const reduction = listing.boe_precio ? Number((listing.boe_precio * 0.04).toFixed(2)) : 0;
  const taxBase = Number((baseCalc - reduction).toFixed(2));
  const co2Tax = Number((taxBase * 0.0975).toFixed(2));
  
  const totalCost = Number((basePrice + importTax + co2Tax).toFixed(2));

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(17, 25, 54, 0.95), rgba(35, 23, 65, 0.95))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'white',
          background: 'linear-gradient(45deg, rgba(44,62,147,0.6), rgba(107,35,142,0.6))',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          py: 2.5,
          px: 3,
          fontSize: '1.25rem',
          fontWeight: 'bold'
        }}>
          Desglose de Costes de Importación
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              color: 'white',
              mb: 0.5,
              fontWeight: 'bold'
            }}>
              {listing.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {listing.year} · {listing.kilometers?.toLocaleString()} km · {listing.horsepower} CV
            </Typography>
          </Box>

          {/* Custom Tax Price Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
              Precio para Cálculo de Impuestos (EUR)
            </Typography>
            <input
              type="number"
              value={customTaxPrice ?? ''}
              onChange={(e) => setCustomTaxPrice(e.target.value ? Number(e.target.value) : null)}
              placeholder={formatPrice(basePrice)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1, display: 'block' }}>
              Introduce un precio personalizado para calcular la tasa de importación (31%)
            </Typography>
          </Box>

          <TableContainer 
            component={Paper} 
            sx={{ 
              bgcolor: 'transparent',
              backgroundImage: 'none',
              boxShadow: 'none'
            }}
          >
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    border: 'none',
                    pl: 0,
                    py: 2
                  }}>
                    Precio Base
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      Precio del vehículo
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                    {formatPrice(basePrice)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    border: 'none',
                    pl: 0,
                    py: 2
                  }}>
                    Tasa de Importación
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      31% de {formatPrice(priceForTax)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                    {formatPrice(importTax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    border: 'none',
                    pl: 0,
                    py: 2
                  }}>
                    Tasa CO2
                    <Box component="span" sx={{ ml: 1 }}>
                      <Tooltip title="Ver cálculo">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCO2Info(true);
                          }}
                          sx={{ 
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': { color: 'white' }
                          }}
                        >
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      {listing.co2_emissions} g/km
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', border: 'none', py: 2 }}>
                    {formatPrice(co2Tax)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ 
                    color: 'white', 
                    fontWeight: 'bold', 
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    pl: 0,
                    pt: 3
                  }}>
                    Coste Total
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                      Incluye todos los impuestos
                    </Typography>
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      border: 'none',
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      pt: 3
                    }}
                  >
                    <Typography sx={{ 
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      background: 'linear-gradient(45deg, #4169E1, #9400D3)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      {formatPrice(totalCost)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3,
          pt: 2,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(45deg, rgba(44,62,147,0.3), rgba(107,35,142,0.3))'
        }}>
          <Button 
            onClick={onClose} 
            variant="outlined" 
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.3)',
              px: 3,
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      
      <CO2TaxInfoModal
        open={showCO2Info}
        onClose={() => setShowCO2Info(false)}
        boePrice={listing.boe_precio}
        co2Emissions={listing.co2_emissions}
      />
    </>
  );
};

const ImportListingGrid: React.FC<ImportListingGridProps> = ({ listings, loading, showNoResults, sx }) => {
  const [selectedListing, setSelectedListing] = useState<ImportListing | null>(null);

  const calculateTotalCost = (listing: ImportListing) => {
    const basePrice = listing.price_chf ? Number((listing.price_chf * 1.0590).toFixed(2)) : 0;
    const importTax = Number((basePrice * 0.31).toFixed(2));
    
    // Calculate new CO2 tax
    const baseCalc = listing.boe_precio ? Number((listing.boe_precio * 0.17).toFixed(2)) : 0;
    const reduction = listing.boe_precio ? Number((listing.boe_precio * 0.04).toFixed(2)) : 0;
    const taxBase = Number((baseCalc - reduction).toFixed(2));
    const co2Tax = Number((taxBase * 0.0975).toFixed(2));
    
    return Number((basePrice + importTax + co2Tax).toFixed(2));
  };

  if (loading) {
    return (
      <Grid container spacing={3} sx={sx} key="loading-grid">
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

  const getEmissionsBadgeColor = (co2: number | null) => {
    if (co2 === null) return '#666';
    if (co2 <= 120) return '#4caf50';
    if (co2 <= 160) return '#ff9800';
    if (co2 <= 200) return '#f44336';
    return '#b71c1c';
  };

  return (
    <>
      <Grid container spacing={3} sx={sx} key="results-grid">
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
                {/* CO2 Emissions Badge */}
                {listing.co2_emissions !== null && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      zIndex: 1,
                      bgcolor: getEmissionsBadgeColor(listing.co2_emissions),
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
                      {listing.co2_emissions}
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
                      g/km
                    </Typography>
                  </Box>
                )}
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
                        {calculateTotalCost(listing).toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} €
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Base: {(listing.price_chf * 1.0590).toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} €
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
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Ubicación</Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>{listing.location || 'N/D'}</Typography>
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
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedListing(listing)}
                      startIcon={<Info sx={{ fontSize: '1rem' }} />}
                    >
                      Detalles
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        ))}
      </Grid>

      {selectedListing && (
        <CostsBreakdownModal
          open={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          listing={selectedListing}
        />
      )}
    </>
  );
};

export default ImportListingGrid; 