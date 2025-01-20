import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

interface SubscriptionData {
  subscription_status: string
  subscription_tier: string
  current_period_end: string
}

export function useSubscription(requiredTier?: 'basic' | 'pro' | 'business') {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)

  useEffect(() => {
    async function checkSubscription() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_status, subscription_tier, current_period_end')
          .eq('clerk_id', user.id)
          .single()

        setSubscriptionData(userData)

        // Check if subscription is active and not expired
        const isActive = userData?.subscription_status === 'active'
        const isExpired = userData?.current_period_end ? new Date(userData.current_period_end) < new Date() : true

        if (!isActive || isExpired) {
          router.push('/pricing')
          return
        }

        // Check tier requirements
        if (requiredTier) {
          const tierLevels = { basic: 0, pro: 1, business: 2 }
          const requiredLevel = tierLevels[requiredTier]
          const currentLevel = tierLevels[userData?.subscription_tier as keyof typeof tierLevels] || -1

          if (currentLevel < requiredLevel) {
            router.push('/pricing')
            return
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSubscription()
  }, [user, router, requiredTier])

  return {
    loading,
    subscriptionData,
    isSubscribed: subscriptionData?.subscription_status === 'active' && 
                  new Date(subscriptionData?.current_period_end) > new Date(),
    currentTier: subscriptionData?.subscription_tier
  }
} 