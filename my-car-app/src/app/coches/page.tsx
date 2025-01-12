'use client'
import { Suspense } from 'react'
import ListingView from '../components/ListingView'

export default function CochesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingView defaultType="coches" />
    </Suspense>
  )
} 