import { supabase } from './supabase';
import { checkPaymentStatus } from './mercadopago';

// Upload file with payment
export async function uploadFileWithPayment(file, userId, pageCount, paymentId = null) {
  try {
    // Se não houver paymentId, significa que o pagamento ainda não foi processado
    if (!paymentId) {
      throw new Error('ID de pagamento é obrigatório');
    }
    
    // Verificar status do pagamento
    const status = await checkPaymentStatus(paymentId);
    
    if (status !== 'approved') {
      throw new Error('Pagamento não aprovado');
    }

    // Se o pagamento foi aprovado, prosseguir com o upload
    const nome = `${Date.now()}_${file.name}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage.from('uploads').upload(nome, file);

    if (uploadError) throw uploadError;

    // Save file reference in database
    const { data, error } = await supabase
      .from('arquivos')
      .insert({
        nome: file.name,
        path: nome,
        status: 'pendente',
        usuario_id: userId,
        payment_id: paymentId, // Armazenar o ID do pagamento
        page_count: pageCount, // Armazenar o número de páginas
      })
      .select()
      .single();

    if (error) throw error;

    return { data };
  } catch (error) {
    return { error };
  }
}

// Get user file history
export async function getUserFiles(userId) {
  try {
    const { data, error } = await supabase
      .from('arquivos')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data };
  } catch (error) {
    return { error };
  }
}