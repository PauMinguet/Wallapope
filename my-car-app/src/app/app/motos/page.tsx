'use client'
import { Suspense } from 'react'
import ListingView from '../../components/ListingView'

export default function MotosPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingView defaultType="motos" />
    </Suspense>
  )
} 