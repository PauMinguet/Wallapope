'use client'

import { useState, useEffect } from 'react'
import { Box, Fade } from '@mui/material'
import { Search } from 'lucide-react'

const carMakes = ['BMW', 'Mercedes', 'Audi', 'Toyota', 'Honda', 'Ford', 'Volkswagen', 'Seat', 'Renault', 'Peugeot']
const carModels = {
  BMW: ['Serie 1', 'Serie 3', 'Serie 5', 'X1', 'X3', 'X5'],
  Mercedes: ['Clase A', 'Clase C', 'Clase E', 'GLA', 'GLC', 'GLE'],
  Audi: ['A1', 'A3', 'A4', 'A6', 'Q3', 'Q5'],
  Toyota: ['Corolla', 'RAV4', 'Yaris', 'C-HR', 'Camry', 'Land Cruiser'],
  Honda: ['Civic', 'CR-V', 'HR-V', 'Jazz', 'Accord'],
  Ford: ['Fiesta', 'Focus', 'Kuga', 'Puma'],
  Volkswagen: ['Golf', 'Polo', 'Tiguan', 'T-Roc', 'Passat'],
  Seat: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco'],
  Renault: ['Clio', 'Captur', 'Megane', 'Kadjar', 'Arkana'],
  Peugeot: ['208', '2008', '308', '3008', '5008']
}

const generateRandomUser = () => {
  const names = ['juan', 'maria', 'carlos', 'ana', 'pedro', 'laura', 'david', 'sofia', 'miguel', 'elena']
  const name = names[Math.floor(Math.random() * names.length)]
  const numbers = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${name}${numbers}`
}

const maskUsername = (username: string) => {
  const firstPart = username.slice(0, 2)
  const lastPart = username.slice(-2)
  const middlePart = '*'.repeat(username.length - 4)
  return `${firstPart}${middlePart}${lastPart}`
}

export default function LiveActivityToast() {
  const [show, setShow] = useState(false)
  const [notification, setNotification] = useState({
    username: '',
    make: '',
    model: '',
    year: 0
  })

  useEffect(() => {
    const createNotification = () => {
      const make = carMakes[Math.floor(Math.random() * carMakes.length)]
      const models = carModels[make as keyof typeof carModels]
      const model = models[Math.floor(Math.random() * models.length)]
      const currentYear = new Date().getFullYear()
      const year = Math.floor(Math.random() * 8) + (currentYear - 10)
      const username = generateRandomUser()

      setNotification({
        username: maskUsername(username),
        make,
        model,
        year
      })
      setShow(true)

      setTimeout(() => {
        setShow(false)
      }, 5000)
    }

    createNotification()

    const interval = setInterval(() => {
      createNotification()
    }, Math.floor(Math.random() * 10000) + 20000) // Random delay between 10-20 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <Fade in={show}>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 8, md: 12 },
          left: { xs: 8, md: 12 },
          maxWidth: { xs: '300px', md: '360px' },
          bgcolor: '#111111',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          p: { xs: 1.25, md: 1.5 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.25, md: 1.5 },
          zIndex: 1100,
          transform: show ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <Box
          sx={{
            width: { xs: 32, md: 36 },
            height: { xs: 32, md: 36 },
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #2C3E93, #6B238E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search className="h-4 w-4 text-white" />
        </Box>
        <Box>
          <Box component="p" sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '0.8125rem', md: '0.875rem' }, mb: 0.25 }}>
            {notification.username}
          </Box>
          <Box component="p" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: '0.6875rem', md: '0.75rem' }, lineHeight: 1.4 }}>
            acaba de buscar ofertas de {notification.make} {notification.model} {notification.year}
          </Box>
        </Box>
      </Box>
    </Fade>
  )
} 