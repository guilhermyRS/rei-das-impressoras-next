// pages/api/check-payment.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  try {
    const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`
        }
      }
    );

    return res.status(200).json({ status: response.data.status });
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error.response?.data || error);
    return res.status(500).json({ 
      error: 'Erro ao verificar pagamento', 
      details: error.response?.data || error.message 
    });
  }
}