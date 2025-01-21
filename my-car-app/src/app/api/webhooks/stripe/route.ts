import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

export async function POST(req: Request) {
  try {
    console.log('Webhook received - starting processing')
    
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    console.log('Request details:', {
      bodyLength: body.length,
      hasSignature: !!signature,
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
    })

    if (!signature) {
      console.error('No stripe-signature header found')
      return new NextResponse('No signature provided', { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      console.log('Event constructed successfully:', event.type)
    } catch (err: unknown) {
      const stripeError = err as Stripe.errors.StripeError
      console.error('Error constructing webhook event:', {
        error: stripeError.message,
        signature,
        secretLength: process.env.STRIPE_WEBHOOK_SECRET?.length
      })
      return new NextResponse(`Webhook Error: ${stripeError.message}`, { status: 400 })
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          console.log('Processing checkout session:', {
            sessionId: session.id,
            customerId: session.customer,
            subscriptionId: session.subscription
          })

          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            console.log('Retrieved subscription details:', {
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end
            })

            const { error } = await supabase
              .from('users')
              .update({
                stripe_customer_id: session.customer as string,
                subscription_status: subscription.status,
                subscription_tier: session.metadata?.tier || 'pro',
                subscription_id: subscription.id,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                last_payment_status: 'succeeded'
              })
              .eq('clerk_id', session.metadata?.userId)

            if (error) {
              console.error('Error updating user in Supabase:', error)
              throw error
            }
            console.log('Successfully updated user subscription in database')
          }
          break
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          console.log('Processing subscription update:', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status
          })

          const { error } = await supabase
            .from('users')
            .update({
              subscription_status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end
            })
            .eq('stripe_customer_id', subscription.customer)

          if (error) {
            console.error('Error updating subscription in Supabase:', error)
            throw error
          }
          console.log('Successfully updated subscription status in database')
          break
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          console.log('Processing successful payment:', {
            invoiceId: invoice.id,
            customerId: invoice.customer
          })

          const { error } = await supabase
            .from('users')
            .update({
              last_payment_status: 'succeeded'
            })
            .eq('stripe_customer_id', invoice.customer)

          if (error) {
            console.error('Error updating payment status in Supabase:', error)
            throw error
          }
          console.log('Successfully updated payment status in database')
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          console.log('Processing failed payment:', {
            invoiceId: invoice.id,
            customerId: invoice.customer
          })

          const { error } = await supabase
            .from('users')
            .update({
              last_payment_status: 'failed'
            })
            .eq('stripe_customer_id', invoice.customer)

          if (error) {
            console.error('Error updating payment status in Supabase:', error)
            throw error
          }
          console.log('Successfully updated payment status in database')
          break
        }

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    } catch (err) {
      console.error('Error processing webhook event:', {
        eventType: event.type,
        error: err
      })
      return new NextResponse('Error processing webhook', { status: 500 })
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (err) {
    console.error('Unexpected error in webhook handler:', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
} 