// Stripe Checkout — Netlify Function
// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN (en Netlify Dashboard → Site → Environment variables):
//   STRIPE_SECRET_KEY  →  sk_live_...  (o sk_test_... para pruebas)
//
// Instalación local:
//   cd netlify/functions && npm install stripe
// ─────────────────────────────────────────────────────────────────────────────

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const IVA = 0.21;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let items;
  try {
    ({ items } = JSON.parse(event.body));
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty');
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.name },
          // precio en céntimos con IVA incluido
          unit_amount: Math.round(item.price * (1 + IVA) * 100),
          tax_behavior: 'inclusive',
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${process.env.URL || 'https://tu-dominio.com'}/?pago=ok`,
      cancel_url:  `${process.env.URL || 'https://tu-dominio.com'}/#tienda`,
      locale: 'es',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe error:', err.message);
    return { statusCode: 500, body: 'Stripe error' };
  }
};
