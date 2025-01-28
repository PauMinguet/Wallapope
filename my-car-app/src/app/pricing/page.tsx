'use client'

import { 
  Box,
} from '@mui/material'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import TopBar from '../components/TopBar'
import PricingSection from '../components/PricingSection'
import Footer from '../components/Footer'

const Chat = dynamic(() => import('../components/Chat'), {
  ssr: false,
})

export default function PricingPage() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <>
    <Box sx={{ 
      overflow: 'hidden',
      bgcolor: '#000000',
      position: 'relative',
      minHeight: '100vh',
      color: 'white'
    }}>
      <TopBar />
      
      {/* Background Pattern */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <Box sx={{
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
        }} />
        <Box sx={{
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
        }} />
      </Box>

      {/* Pricing Section */}
      <PricingSection onContactClick={() => setIsChatOpen(true)} />

      {/* Chat Component */}
      {isChatOpen && (
        <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}
    </Box>
    <Footer />
    </>
  )
} 