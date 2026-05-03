
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    // Frontend se Data receive karna
    const { priceId, userId, userEmail, planName } = await req.json();

    if (!userId || !priceId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Stripe Checkout Session Create Karna
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      client_reference_id: userId, // 🔥 Yeh ID Webhook mein database update karne ke kaam aayegi
      metadata: {
        plan: planName // 'pro' ya 'ultra'
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // Agar monthly hai. One-time ke liye 'payment' likhein
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}