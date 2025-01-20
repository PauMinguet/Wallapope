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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

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
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new NextResponse('Webhook signature verification failed', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        
        // Get user from Supabase using Stripe customer ID
        const { data: userData } = await supabase
          .from('users')
          .select('clerk_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!userData) {
          console.error('User not found for customer:', customerId)
          return new NextResponse('User not found', { status: 404 })
        }

        // Update user's subscription status
        await supabase
          .from('users')
          .update({
            subscription_status: subscription.status,
            subscription_tier: subscription.metadata.tier,
            subscription_id: subscription.id,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          })
          .eq('clerk_id', userData.clerk_id)

        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        // Handle trial ending - maybe send notification to user
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          
          // Update payment status and next billing date
          const { data: userData } = await supabase
            .from('users')
            .select('clerk_id')
            .eq('stripe_customer_id', invoice.customer as string)
            .single()

          if (userData) {
            await supabase
              .from('users')
              .update({
                last_payment_status: 'succeeded',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
              })
              .eq('clerk_id', userData.clerk_id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Update payment status
        const { data: userData } = await supabase
          .from('users')
          .select('clerk_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single()

        if (userData) {
          await supabase
            .from('users')
            .update({
              last_payment_status: 'failed'
            })
            .eq('clerk_id', userData.clerk_id)
        }
        break
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (err) {
    console.error('Error processing webhook:', err)
    return new NextResponse('Webhook processing failed', { status: 500 })
  }
} 