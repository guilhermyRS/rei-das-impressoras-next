import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { amount } = body;

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    // Mercado Pago API call
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
    
    // Verify if the payment data contains QR code information
    if (!paymentData.point_of_interaction || !paymentData.point_of_interaction.transaction_data.qr_code) {
      return NextResponse.json(
        { error: 'QR Code inválido ou não gerado.' },
        { status: 400 }
      );
    }

    // Return successful response with payment data
    return NextResponse.json({
      id: paymentData.id,
      qr_code: paymentData.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: paymentData.point_of_interaction.transaction_data.qr_code_base64,
      status: paymentData.status
    });
    
  } catch (error) {
    // Enhanced error logging
    console.error('Erro ao criar pagamento Pix:', {
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      errorMessage: error.message
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Erro ao criar pagamento', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}

// Optionally handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}