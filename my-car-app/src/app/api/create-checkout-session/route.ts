import { NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

const SUBSCRIPTION_PRICES = {
  basic: process.env.STRIPE_BASIC_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { tier } = await request.json()
    const priceId = SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES]

    if (!priceId) {
      return new NextResponse('Invalid subscription tier', { status: 400 })
    }

    // Get user data from Supabase
    const { data: userData } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('clerk_id', userId)
      .single()

    if (!userData) {
      return new NextResponse('User not found', { status: 404 })
    }

    let customerId = userData.stripe_customer_id

    // If customer doesn't exist in Stripe, create them
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          clerk_id: userId,
        },
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('clerk_id', userId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      payment_method_types: ['card'],
      subscription_data: {
        trial_period_days: 7
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: {
        userId,
        tier,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new NextResponse('Error creating checkout session', { status: 500 })
  }
} 