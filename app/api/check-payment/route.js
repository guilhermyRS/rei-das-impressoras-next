import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request) {
  // Get paymentId from URL search params
  const searchParams = request.nextUrl.searchParams;
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json(
      { error: 'Payment ID is required' },
      { status: 400 }
    );
  }

  try {
    const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentData = response.data;

    return NextResponse.json({
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      transaction_amount: paymentData.transaction_amount,
      payment_method: paymentData.payment_method_id,
      date_created: paymentData.date_created,
      date_approved: paymentData.date_approved
    });

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error.response?.data || error);
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado' },
        { status: 404 }
      );
    }

    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'Não autorizado - Token de acesso inválido' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Erro ao verificar status do pagamento',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}