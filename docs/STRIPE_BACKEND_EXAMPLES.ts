/**
 * Exemples d'implémentation Backend pour INOVA-IRIS + Stripe
 * 
 * Ceci montre comment implémenter les endpoints API pour traiter les paiements Stripe.
 * Vous pouvez adapter ceci à votre framework backend (Node.js, Python, etc.)
 * 
 * NOTE: C'est un EXEMPLE. À adapter à votre environnement.
 */

// ========================================
// EXEMPLE: Node.js + Express
// ========================================

/*
import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST /api/create-checkout-session
// Crée une session Stripe Checkout
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const {
      email,
      amount,
      currency,
      offerId,
      offerName,
      companyName,
      fullName,
      phone,
    } = req.body;

    // Validation basique
    if (!email || !amount || !offerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase() === 'fcfa' ? 'xof' : currency.toLowerCase(),
            product_data: {
              name: offerName,
              description: `Abonnement SOC INOVA-IRIS - ${fullName}`,
              metadata: {
                offerId,
                companyName,
                phone,
              },
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/#offres`,
      metadata: {
        offerId,
        companyName,
        fullName,
        phone,
        email,
      },
    });

    // Sauvegarder les infos de commande en base
    const { error: dbError } = await supabase
      .from('orders')
      .insert([
        {
          stripe_session_id: session.id,
          email,
          full_name: fullName,
          company_name: companyName,
          phone,
          offer_id: offerId,
          amount,
          currency,
          status: 'pending',
        },
      ]);

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save order' });
    }

    res.json({
      sessionId: session.id,
      url: session.url, // Pour redirection directe si souhaité
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// GET /api/verify-payment/:sessionId
// Vérifie le statut d'un paiement
app.get('/api/verify-payment/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Récupérer la session depuis Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Récupérer le payment intent pour plus de détails
    const paymentIntent = session.payment_intent
      ? await stripe.paymentIntents.retrieve(session.payment_intent as string)
      : null;

    // Mettre à jour le statut en base
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: session.payment_status === 'paid' ? 'completed' : 'pending',
        stripe_payment_intent_id: paymentIntent?.id,
      })
      .eq('stripe_session_id', sessionId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    res.json({
      paid: session.payment_status === 'paid',
      status: session.payment_status,
      paymentIntentId: paymentIntent?.id,
      email: session.customer_email,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      customerDetails: session.customer_details,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// POST /api/webhooks/stripe
// Webhook pour recevoir les événements Stripe
app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Traiter l'événement
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Mettre à jour la commande
        await supabase
          .from('orders')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('stripe_session_id', session.id);

        // Créer le compte utilisateur
        // Envoyer un email de bienvenue
        // Générer les identifiants d'accès
        break;

      case 'charge.failed':
        const failedCharge = event.data.object;
        
        // Mettre à jour la commande
        await supabase
          .from('orders')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', failedCharge.payment_intent);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
*/

// ========================================
// EXEMPLE: Python + Flask
// ========================================

/*
from flask import Flask, request, jsonify
from stripe import Stripe
from supabase import create_client
import os
from datetime import datetime

app = Flask(__name__)
stripe = Stripe(os.getenv('STRIPE_SECRET_KEY'))
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.json
        email = data.get('email')
        amount = data.get('amount')
        currency = data.get('currency', 'xof')
        offer_id = data.get('offerId')
        offer_name = data.get('offerName')
        company_name = data.get('companyName')
        full_name = data.get('fullName')
        phone = data.get('phone')

        # Validation
        if not all([email, amount, offer_id]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Créer session Stripe
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'xof' if currency.lower() == 'fcfa' else currency.lower(),
                        'product_data': {
                            'name': offer_name,
                            'description': f'INOVA-IRIS SOC - {full_name}'
                        },
                        'unit_amount': int(amount * 100)
                    },
                    'quantity': 1
                }
            ],
            customer_email=email,
            mode='payment',
            success_url=f"{os.getenv('FRONTEND_URL')}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/#offres",
            metadata={
                'offerId': offer_id,
                'companyName': company_name,
                'fullName': full_name,
                'phone': phone
            }
        )

        # Sauvegarder en base
        supabase.table('orders').insert({
            'stripe_session_id': session.id,
            'email': email,
            'full_name': full_name,
            'company_name': company_name,
            'phone': phone,
            'offer_id': offer_id,
            'amount': amount,
            'currency': currency,
            'status': 'pending'
        }).execute()

        return jsonify({'sessionId': session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify-payment/<session_id>', methods=['GET'])
def verify_payment(session_id):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Mettre à jour en base
        supabase.table('orders').update({
            'status': 'completed' if session.payment_status == 'paid' else 'pending'
        }).eq('stripe_session_id', session_id).execute()

        return jsonify({
            'paid': session.payment_status == 'paid',
            'paymentIntentId': session.payment_intent,
            'email': session.customer_email,
            'amount': session.amount_total / 100 if session.amount_total else 0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
*/

// ========================================
// SCHÉMA DE BASE DE DONNÉES
// ========================================

/*
-- Table orders pour tracer les paiements
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  phone TEXT,
  offer_id TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'XOF',
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (offer_id) REFERENCES offers(id)
);

-- Indexer les colonnes importantes
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX idx_orders_status ON orders(status);
*/

// ========================================
// VARIABLES D'ENVIRONNEMENT REQUISES
// ========================================

/*
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://...
SUPABASE_KEY=...

# App URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Email (pour notifications)
RESEND_API_KEY=...
*/

export {};
