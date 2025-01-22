'use client'

import React from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Box } from '@mui/material'

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface MapComponentProps {
  center: [number, number]
  distance?: number
  onLocationSelect?: (lat: number, lng: number) => void
}

// Component to handle map center updates
function SetViewOnClick({ center }: { center: [number, number] }) {
  const map = useMap()
  
  React.useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  
  return null
}

// Component to handle map clicks
function MapEvents({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function MapComponent({ center, distance, onLocationSelect }: MapComponentProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        bgcolor: 'rgba(255,255,255,0.05)',
        borderRadius: 1
      }} />
    )
  }

  return (
    <MapContainer
      center={center}
      zoom={distance ? Math.max(6, 13 - Math.floor(Math.log2(distance / 10))) : 13}
      style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <SetViewOnClick center={center} />
      {onLocationSelect && <MapEvents onLocationSelect={onLocationSelect} />}
      {center && (
        <>
          <Marker position={center} icon={icon} />
          {distance && distance < 500 && (
            <Circle
              center={center}
              radius={distance * 1000} // Convert km to meters
              pathOptions={{
                color: '#4169E1',
                fillColor: '#4169E1',
                fillOpacity: 0.1,
              }}
            />
          )}
        </>
      )}
    </MapContainer>
  )
} 