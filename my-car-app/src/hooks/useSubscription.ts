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

        if (!isActive || isExpired) {
          console.log('Redirecting to pricing - Reason:', !isActive ? 'inactive subscription' : 'expired subscription')
          router.push('/pricing')
          return
        }

        // Check tier requirements
        if (requiredTier) {
          const tierLevels = { basic: 0, pro: 1, business: 2 }
          const requiredLevel = tierLevels[requiredTier]
          const currentLevel = tierLevels[userData?.subscription_tier as keyof typeof tierLevels] || -1

          console.log('Tier check:', {
            currentTier: userData?.subscription_tier,
            requiredTier,
            currentLevel,
            requiredLevel
          })

          if (currentLevel < requiredLevel) {
            console.log('Redirecting to pricing - Reason: insufficient tier level')
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