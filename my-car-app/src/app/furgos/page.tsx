'use client'
import { Suspense } from 'react'
import ListingView from '../components/ListingView'

export default function FurgosPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ListingView defaultType="furgos" />
    </Suspense>
  )
} 