'use client'

import { useState } from 'react'
import { 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  SelectChangeEvent,
} from '@mui/material'

export default function Home() {
  const [carData, setCarData] = useState({
    marca: '',
    modelo: '',
    año: '',
    color: '',
    kilometraje: '',
    precio: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setCarData(prevData => ({
      ...prevData,
      [name]: value
    }))
  }

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target
    setCarData(prevData => ({
      ...prevData,
      [name as string]: value
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/car-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData),
      })

      if (!response.ok) {
        throw new Error('Error al enviar el formulario')
      }

      // Clear form after successful submission
      setCarData({
        marca: '',
        modelo: '',
        año: '',
        color: '',
        kilometraje: '',
        precio: ''
      })

      alert('¡Solicitud enviada con éxito!')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar el formulario. Por favor, inténtelo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-center text-gray-100 mb-6">
            Formulario de Compra de Coche
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField
              fullWidth
              label="Marca"
              name="marca"
              variant="outlined"
              value={carData.marca}
              onChange={handleChange}
              required
              className="bg-gray-700 rounded-md"
            />
            <TextField
              fullWidth
              label="Modelo"
              name="modelo"
              variant="outlined"
              value={carData.modelo}
              onChange={handleChange}
              required
              className="bg-gray-700 rounded-md"
            />
            <TextField
              fullWidth
              label="Año"
              name="año"
              variant="outlined"
              type="number"
              value={carData.año}
              onChange={handleChange}
              required
              className="bg-gray-700 rounded-md"
            />
            <FormControl fullWidth variant="outlined" className="bg-gray-700 rounded-md">
              <InputLabel id="color-label">Color</InputLabel>
              <Select
                labelId="color-label"
                label="Color"
                name="color"
                value={carData.color}
                onChange={handleSelectChange}
                required
              >
                <MenuItem value="blanco">Blanco</MenuItem>
                <MenuItem value="negro">Negro</MenuItem>
                <MenuItem value="rojo">Rojo</MenuItem>
                <MenuItem value="azul">Azul</MenuItem>
                <MenuItem value="plata">Plata</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Kilometraje"
              name="kilometraje"
              variant="outlined"
              type="number"
              value={carData.kilometraje}
              onChange={handleChange}
              required
              className="bg-gray-700 rounded-md"
            />
            <TextField
              fullWidth
              label="Precio Deseado (€)"
              name="precio"
              variant="outlined"
              type="number"
              value={carData.precio}
              onChange={handleChange}
              required
              className="bg-gray-700 rounded-md"
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

