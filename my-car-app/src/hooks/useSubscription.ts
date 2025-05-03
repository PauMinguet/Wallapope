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
        const currentPeriodEnd = userData?.current_period_end ? new Date(userData.current_period_end) : null
        const now = new Date()
        const isExpired = !currentPeriodEnd || currentPeriodEnd < now

        console.log('Subscription check:', {
          status: userData?.subscription_status,
          tier: userData?.subscription_tier,
          currentPeriodEnd: currentPeriodEnd?.toISOString(),
          now: now.toISOString(),
          isActive,
          isExpired,
          requiredTier,
          userData
        })

        // Don't redirect here, just update the state
        setLoading(false)
      } catch (error) {
        console.error('Error checking subscription:', error)
        setLoading(false)
      }
    }

    checkSubscription()
  }, [user, router, requiredTier])

  // Only check for active status without checking expiration date
  const isSubscribed = subscriptionData?.subscription_status === 'active'

  return {
    loading,
    subscriptionData,
    isSubscribed,
    currentTier: subscriptionData?.subscription_tier
  }
} 