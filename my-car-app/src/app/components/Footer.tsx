'use client'

import { 
  Box, 
  Container, 
  Typography, 
  Button,
  Stack,
  SvgIcon,
} from '@mui/material'
import { useRouter } from 'next/navigation'

export default function Footer() {
  const router = useRouter()

  return (
    <Box
      component="footer"
      sx={{
        background: 'rgba(17,17,17,0.8)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        py: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <Stack 
          direction="row"
          spacing={{ xs: 1.5, sm: 3 }}
          alignItems="center"
          justifyContent="center"
          sx={{
            flexWrap: { xs: 'nowrap', sm: 'wrap' }
          }}
        >
          <Button
            variant="text"
            onClick={() => router.push('/contacto')}
            sx={{
              color: 'rgba(255,255,255,0.8)',
              minWidth: 0,
              px: { xs: 1.5, sm: 2 },
              py: 0.75,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              textTransform: 'none',
              '&:hover': {
                color: 'white',
                background: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            Contacto
          </Button>

          <Box
            sx={{
              width: '1px',
              height: '1rem',
              background: 'rgba(255,255,255,0.2)',
            }}
          />

          <Button
            variant="text"
            onClick={() => router.push('/pricing')}
            sx={{
              color: 'rgba(255,255,255,0.8)',
              minWidth: 0,
              px: { xs: 1.5, sm: 2 },
              py: 0.75,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              textTransform: 'none',
              '&:hover': {
                color: 'white',
                background: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            Precios
          </Button>

          <Box
            sx={{
              width: '1px',
              height: '1rem',
              background: 'rgba(255,255,255,0.2)',
            }}
          />

          <Button
            variant="text"
            component="a"
            href="https://www.tiktok.com/@cholloscars"
            target="_blank"
            rel="noopener noreferrer"
            startIcon={
              <SvgIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </SvgIcon>
            }
            sx={{
              color: 'rgba(255,255,255,0.8)',
              minWidth: 0,
              px: { xs: 1.5, sm: 2 },
              py: 0.75,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              textTransform: 'none',
              '& .MuiButton-startIcon': {
                marginRight: { xs: '4px', sm: '8px' }
              },
              '&:hover': {
                color: 'white',
                background: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            TikTok
          </Button>
        </Stack>

        {/* Copyright */}
        <Box
          sx={{
            mt: { xs: 2, md: 3 },
            pt: { xs: 1.5, md: 2 },
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.7rem',
              letterSpacing: '0.02em'
            }}
          >
            © 2025 ChollosCar
          </Typography>
        </Box>
      </Container>
    </Box>
  )
} 