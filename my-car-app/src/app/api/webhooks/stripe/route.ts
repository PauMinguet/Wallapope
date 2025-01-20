import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return new NextResponse('No signature found', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    return new NextResponse(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  switch (event.type) {
    case 'checkout.session.completed':
      // Retrieve the subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      // Update the user's subscription status
      await supabase
        .from('users')
        .update({
          stripe_customer_id: session.customer,
          subscription_status: 'active',
          subscription_tier: subscription.metadata.tier,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('clerk_id', session.metadata?.userId)

      break

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscriptionUpdated = event.data.object as Stripe.Subscription
      
      // Update the user's subscription status
      await supabase
        .from('users')
        .update({
          subscription_status: subscriptionUpdated.status === 'active' ? 'active' : 'inactive',
          subscription_end_date: new Date(subscriptionUpdated.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', subscriptionUpdated.customer)

      break
  }

  return new NextResponse(null, { status: 200 })
} 