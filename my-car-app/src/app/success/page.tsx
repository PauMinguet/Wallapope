import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SuccessPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams
  const session_id = typeof resolvedSearchParams.session_id === 'string' ? resolvedSearchParams.session_id : undefined
  const user = await currentUser()
  if (!user?.id || !session_id) {
    redirect('/')
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription']
    })

    if (session.subscription) {
      const subscription = session.subscription as Stripe.Subscription

      // Update user's subscription details in Supabase
      await supabase
        .from('users')
        .update({
          stripe_customer_id: session.customer as string,
          subscription_status: 'active',
          subscription_tier: session.metadata?.tier || 'pro',
          subscription_id: subscription.id,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          last_payment_status: 'succeeded'
        })
        .eq('clerk_id', user.id)
    }

    // Redirect to the alerts page or show success message
    redirect('/alertas')
  } catch (error) {
    console.error('Error processing success:', error)
    redirect('/')
  }
} 