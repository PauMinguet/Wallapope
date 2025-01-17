import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
  onLocationSelect: (lat: number, lng: number) => void
  distance?: number // in kilometers
}

// Component to handle map center updates
function SetViewOnClick({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  
  return null
}

// Component to handle map clicks
function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker | null>(null)
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng)
      } else {
        markerRef.current = L.marker(e.latlng, { icon }).addTo(map)
      }
      onLocationSelect(lat, lng)
    }
  })
  return null
}

export default function MapComponent({ center, onLocationSelect, distance = 0 }: MapComponentProps) {
  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <SetViewOnClick center={center} />
      <MapEvents onLocationSelect={onLocationSelect} />
      {center && (
        <>
          <Marker position={center} icon={icon} />
          {distance > 0 && distance < 500 && (
            <Circle
              center={center}
              radius={distance * 1000} // Convert km to meters
              pathOptions={{
                color: '#4169E1',
                fillColor: '#9400D3',
                fillOpacity: 0.1,
                weight: 2,
                opacity: 0.7
              }}
            />
          )}
        </>
      )}
    </MapContainer>
  )
} 