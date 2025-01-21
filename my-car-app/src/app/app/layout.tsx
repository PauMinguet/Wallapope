'use client'

import TopBar from '../components/TopBar'
import { Box } from '@mui/material'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#000000',
      color: 'white',
    }}>
      <TopBar />
      <Box sx={{ pt: { xs: 8, md: 10 } }}>
        {children}
      </Box>
    </Box>
  )
} 