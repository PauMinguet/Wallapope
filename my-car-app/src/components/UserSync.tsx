'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { syncUser } from '@/lib/db'

export default function UserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    console.log('UserSync effect triggered:', { isLoaded, userId: user?.id })
    if (isLoaded && user) {
      console.log('Attempting to sync user:', {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName} ${user.lastName}`
      })
      syncUser(user).catch(console.error)
    }
  }, [isLoaded, user])

  return null
} 