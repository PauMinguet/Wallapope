'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Car, DollarSign, Mail, Gauge, Calendar, Palette } from 'lucide-react'

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em" {...props}>
    <path fill="currentColor" d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
  </svg>
);

const LoadingSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="mt-8"
  >
    <div className="h-8 w-48 bg-white bg-opacity-10 rounded-lg mb-4 animate-pulse" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="bg-white bg-opacity-10 rounded-lg overflow-hidden shadow-lg">
          <div className="h-48 bg-white bg-opacity-5 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-white bg-opacity-5 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-white bg-opacity-5 rounded animate-pulse w-1/2" />
            <div className="h-6 bg-white bg-opacity-5 rounded animate-pulse w-1/4" />
            <div className="h-4 bg-white bg-opacity-5 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </motion.div>
)

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
  const [isSearching, setIsSearching] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    dbStatus: { type: 'success' | 'error' | null; message: string };
    searchStatus: { type: 'success' | 'error' | null; message: string };
  }>({
    dbStatus: { type: null, message: '' },
    searchStatus: { type: null, message: '' }
  })
  const [searchResults, setSearchResults] = useState<Array<{
    url: string;
    title: string;
    price_raw: string;
    details: string;
    specs: string;
    image_url: string;
    location: string;
  }>>([]);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())
  const [requestId, setRequestId] = useState<string | null>(null)

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
    setIsSearching(true)
    setSubmitStatus({
      dbStatus: { type: null, message: '' },
      searchStatus: { type: null, message: '' }
    })

    try {
      console.log('Submitting form data...')
      const searchParams = {
        keywords: `${carData.marca} ${carData.modelo}`.trim(),
        minPrice: Number(carData.precio) * 0.4,
        maxPrice: Number(carData.precio) * 0.8,
        año: Number(carData.año),
        kilometraje: Number(carData.kilometraje)
      }

      console.log('Form values:', {
        raw: carData,
        parsed: searchParams
      })

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

      if (data.data?.[0]?.id) {
        console.log('Setting request ID:', data.data[0].id)
        setRequestId(data.data[0].id)
      } else {
        console.error('No request ID in response:', data)
      }

      setSubmitStatus(prev => ({
        ...prev,
        dbStatus: { 
          type: 'success', 
          message: 'Solicitud guardada en la base de datos' 
        }
      }))

      console.log('Form submitted successfully, starting Wallapop search...')
      setIsSubmitting(false)
      
      console.log('Raw form data:', {
        ...carData,
        año_type: typeof carData.año,
        kilometraje_type: typeof carData.kilometraje
      })

      const searchResponse = await fetch('/api/search-wallapop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      })

      console.log('Search response status:', searchResponse.status)
      const searchData = await searchResponse.json()
      console.log('Search results:', searchData)
      
      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Error al buscar en Wallapop')
      }

      setSearchResults(searchData.results)
      setSubmitStatus(prev => ({
        ...prev,
        searchStatus: { 
          type: 'success', 
          message: 'Búsqueda completada' 
        }
      }))
      
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setSubmitStatus(prev => ({
        ...prev,
        searchStatus: { 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Error en la búsqueda' 
        }
      }))
    } finally {
      setIsSearching(false)
    }
  }

  const handleLike = async (url: string) => {
    console.log('Handle like called with URL:', url)
    console.log('Current request ID:', requestId)
    
    if (!requestId) {
      console.error('No request ID available')
      return
    }

    const newLiked = !likedItems.has(url)
    console.log('Like status:', { newLiked, url, requestId })
    
    try {
      const response = await fetch('/api/like-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carRequestId: requestId,
          listingUrl: url,
          liked: newLiked
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save like')
      }

      setLikedItems(prev => {
        const updated = new Set(prev)
        if (newLiked) {
          updated.add(url)
        } else {
          updated.delete(url)
        }
        return updated
      })
    } catch (error) {
      console.error('Error saving like:', error)
    }
  }

  useEffect(() => {
    if (submitStatus.dbStatus.type === 'success') {
      const timer = setTimeout(() => {
        setSubmitStatus(prev => ({
          ...prev,
          dbStatus: { type: null, message: '' }
        }))
      }, 2000) // Hide after 2 seconds

      return () => clearTimeout(timer)
    }
  }, [submitStatus.dbStatus.type])

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
                    placeholder="Ej: 2015"
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
                    placeholder="Ej: 80000"
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
              disabled={isSubmitting || isSearching}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg shadow-lg transition duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
                (isSubmitting || isSearching) ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-700 hover:to-blue-700'
              }`}
            >
              {isSubmitting ? 'Guardando...' : isSearching ? 'Buscando...' : 'Enviar'}
            </motion.button>

            {submitStatus.dbStatus.type && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mt-4 p-4 rounded-lg ${
                  submitStatus.dbStatus.type === 'success' ? 'bg-green-500 bg-opacity-20 text-green-100' : 'bg-red-500 bg-opacity-20 text-red-100'
                }`}
              >
                {submitStatus.dbStatus.message}
              </motion.div>
            )}
          </form>

          {isSearching ? (
            <LoadingSkeleton />
          ) : (
            <>
              <p className="text-gray-300 text-sm text-center mt-4 mb-2">
                💡 Dale like a los coches que más te gusten. Esto nos ayudará a entender mejor tus preferencias para futuras recomendaciones.
              </p>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8"
                >
                  <h2 className="text-2xl font-bold text-white mb-4">Resultados encontrados</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((result, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white bg-opacity-10 rounded-lg overflow-hidden shadow-lg"
                      >
                        {result.image_url && (
                          <div className="relative">
                            <img
                              src={result.image_url}
                              alt={result.title}
                              className="w-full h-48 object-cover"
                            />
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                handleLike(result.url)
                              }}
                              type="button"
                              className={`absolute top-2 right-2 p-2 rounded-full ${
                                likedItems.has(result.url)
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white bg-opacity-50 text-gray-700'
                              } hover:bg-red-500 hover:text-white transition-colors duration-200`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill={likedItems.has(result.url) ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="text-white font-semibold mb-2 line-clamp-2">
                            {result.title}
                          </h3>
                          {result.specs && (
                            <p className="text-gray-300 text-sm mb-2">
                              {result.specs}
                            </p>
                          )}
                          {result.price_raw && (
                            <p className="text-green-400 font-bold text-xl mb-2">
                              {result.price_raw}
                            </p>
                          )}
                          {result.location && (
                            <p className="text-gray-300 text-sm">
                              📍 {result.location}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
          
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

