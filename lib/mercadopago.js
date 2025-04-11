// lib/mercadopago.js
import axios from 'axios';

// Configuração do preço por página
const PRICE_PER_PAGE = Number(process.env.NEXT_PUBLIC_PRICE_PER_PAGE) || 0.50;

// Função para contar páginas do PDF
export async function countPdfPages(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // Converter o arquivo para ArrayBuffer
        const arrayBuffer = event.target.result;
        
        // Importar PDF.js dinamicamente (apenas no cliente)
        const pdfjs = await import('pdfjs-dist');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        // Carregar o PDF usando pdf.js
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        // Obter o número de páginas
        const pageCount = pdf.numPages;
        
        // Calcular o preço baseado no número de páginas
        const totalPrice = pageCount * PRICE_PER_PAGE;
        
        resolve({ 
          pageCount, 
          totalPrice,
          pricePerPage: PRICE_PER_PAGE
        });
      } catch (error) {
        console.error('Erro ao processar PDF:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// Função para criar pagamento Pix usando a API route
export async function createPixPayment(amount) {
  try {
    const response = await axios.post('/api/create-payment', { amount });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pagamento Pix:', error.response?.data || error);
    throw error;
  }
}

// Função com tratamento de erro aprimorado para verificar status do pagamento
export async function checkPaymentStatus(paymentId) {
  try {
    const response = await axios.get(`/api/check-payment?paymentId=${paymentId}`);
    return response.data.status;
  } catch (error) {
    // Log detalhado do erro
    console.error('Erro ao verificar pagamento:', {
      message: error.message,
      responseData: error.response?.data,
      responseStatus: error.response?.status
    });
    
    // Retorna um status de erro que o sistema pode tratar
    if (error.response?.status === 404) {
      return "not_found";
    } else if (error.response?.status === 401) {
      return "unauthorized";
    } else {
      return "error";
    }
  }
}