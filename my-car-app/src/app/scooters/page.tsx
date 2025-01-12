'use client'
import { Suspense } from 'react'
import ListingView from '../components/ListingView'

export default function ScootersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingView defaultType="scooters" />
    </Suspense>
  )
} 