'use client'

import { useState } from 'react'

export default function Home() {
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
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-center text-gray-100 mb-6">
            Formulario de Compra de Coche
          </h1>
          {submitStatus.type && (
            <div className={`mb-4 p-4 rounded-md ${
              submitStatus.type === 'success' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
            }`}>
              {submitStatus.message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="marca" className="block text-sm font-medium text-gray-300">
                Marca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="marca"
                name="marca"
                value={carData.marca}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="modelo" className="block text-sm font-medium text-gray-300">
                Modelo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="modelo"
                name="modelo"
                value={carData.modelo}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="año" className="block text-sm font-medium text-gray-300">
                Año <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="año"
                name="año"
                value={carData.año}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-300">
                Color
              </label>
              <select
                id="color"
                name="color"
                value={carData.color}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un color</option>
                <option value="blanco">Blanco</option>
                <option value="negro">Negro</option>
                <option value="rojo">Rojo</option>
                <option value="azul">Azul</option>
                <option value="plata">Plata</option>
              </select>
            </div>
            <div>
              <label htmlFor="kilometraje" className="block text-sm font-medium text-gray-300">
                Kilometraje <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="kilometraje"
                name="kilometraje"
                value={carData.kilometraje}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-300">
                Precio Deseado (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={carData.precio}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={carData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

