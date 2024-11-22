'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Car, DollarSign, Mail, Gauge, Calendar, Palette } from 'lucide-react'

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em" {...props}>
    <path fill="currentColor" d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
  </svg>
);

function FormComponent() {
  const [carData, setCarData] = useState({
    marca: '',
    modelo: '',
    año: '',
    color: '',
    kilometraje: '',
    precio: '',
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setCarData(prevData => ({
      ...prevData,
      [name]: value
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/car-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la solicitud')
      }

      setSubmitStatus({
        type: 'success',
        message: 'Solicitud enviada correctamente'
      })
      
      // Reset form
      setCarData({
        marca: '',
        modelo: '',
        año: '',
        color: '',
        kilometraje: '',
        precio: '',
        email: ''
      })
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al enviar la solicitud'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-card to-blue-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 sm:p-12">
          <h1 className="text-4xl font-extrabold text-center text-white mb-8 tracking-tight">
            Formulario de Compra de Coche
          </h1>
          {submitStatus.type && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg ${
                submitStatus.type === 'success' ? 'bg-green-500 bg-opacity-20 text-green-100' : 'bg-red-500 bg-opacity-20 text-red-100'
              }`}
            >
              {submitStatus.message}
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative">
                <label htmlFor="marca" className="block text-sm font-medium text-gray-200 mb-1">
                  Marca <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    id="marca"
                    name="marca"
                    value={carData.marca}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: BMW"
                  />
                </div>
              </div>
              <div className="relative">
                <label htmlFor="modelo" className="block text-sm font-medium text-gray-200 mb-1">
                  Modelo <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    id="modelo"
                    name="modelo"
                    value={carData.modelo}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: 335i"
                  />
                </div>
              </div>
              <div className="relative">
                <label htmlFor="año" className="block text-sm font-medium text-gray-200 mb-1">
                  Año <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    id="año"
                    name="año"
                    value={carData.año}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: 2013"
                  />
                </div>
              </div>
              <div className="relative">
                <label htmlFor="color" className="block text-sm font-medium text-gray-200 mb-1">
                  Color
                </label>
                <div className="relative">
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    id="color"
                    name="color"
                    value={carData.color}
                    onChange={handleChange}
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 appearance-none"
                  >
                    <option value="">Selecciona un color</option>
                    <option value="blanco">Blanco</option>
                    <option value="negro">Negro</option>
                    <option value="rojo">Rojo</option>
                    <option value="azul">Azul</option>
                    <option value="plata">Plata</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <label htmlFor="kilometraje" className="block text-sm font-medium text-gray-200 mb-1">
                  Kilometraje <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    id="kilometraje"
                    name="kilometraje"
                    value={carData.kilometraje}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: 85000"
                  />
                </div>
              </div>
              <div className="relative">
                <label htmlFor="precio" className="block text-sm font-medium text-gray-200 mb-1">
                  Precio Deseado (€) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    id="precio"
                    name="precio"
                    value={carData.precio}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: 18000"
                  />
                </div>
              </div>
              <div className="relative sm:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={carData.email}
                    onChange={handleChange}
                    required
                    className="pl-10 w-full px-4 py-2 bg-white bg-opacity-10 border border-gray-300 border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300 text-center mb-4">
              Te enviaremos por email las mejores opciones que se ajusten a tus criterios
            </p>
            <motion.button 
              type="submit" 
              disabled={isSubmitting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg shadow-lg transition duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-700 hover:to-blue-700'
              }`}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </motion.button>
            
            <div className="flex items-center justify-center mt-4 text-gray-300 text-sm">
              <a 
                href="https://www.tiktok.com/@pajeess_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-green-400 transition-colors duration-200"
              >
                <TikTokIcon className="mr-2 w-4 h-4" />
                <span>@pajeess_</span>
              </a>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null // or a loading spinner
  }

  return <FormComponent />
}

