// pages/api/create-payment.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  try {
    const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const idempotencyKey = `key-${Date.now()}`;

    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      {
        transaction_amount: amount,
        payment_method_id: 'pix',
        payer: {
          email: 'developerguilhermy@gmail.com', // Idealmente, usar o email do usuário logado
        },
        description: 'Serviço de Impressão',
      },
      {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        }
      }
    );

    const paymentData = response.data;
    if (!paymentData.point_of_interaction || !paymentData.point_of_interaction.transaction_data.qr_code) {
      return res.status(400).json({ error: 'QR Code inválido ou não gerado.' });
    }

    return res.status(200).json({
      id: paymentData.id,
      qr_code: paymentData.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: paymentData.point_of_interaction.transaction_data.qr_code_base64,
      status: paymentData.status
    });
  } catch (error) {
    console.error('Erro ao criar pagamento Pix:', error.response?.data || error);
    return res.status(500).json({ 
      error: 'Erro ao criar pagamento', 
      details: error.response?.data || error.message 
    });
  }
}