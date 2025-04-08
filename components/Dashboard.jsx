"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { uploadFileWithPayment, getUserFiles } from "@/lib/files"
import { countPdfPages, createPixPayment, checkPaymentStatus } from "@/lib/mercadopago"
import QRCodeModal from "@/components/QRCodeModal"
import SuccessAnimation from "@/components/SuccessAnimation"
import { AnimatePresence } from "framer-motion"

export default function Dashboard() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState("")
  const [statusType, setStatusType] = useState("")
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const { user } = useAuth()
  
  // Novas variáveis para pagamento
  const [pageCount, setPageCount] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [pixQRCode, setPixQRCode] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserFiles()
    }
  }, [user])

  const loadUserFiles = async () => {
    setLoading(true)

    const { data, error } = await getUserFiles(user.id)

    if (error) {
      console.error("Erro ao carregar arquivos:", error)
    } else {
      setFiles(data || [])
    }

    setLoading(false)
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setStatus("Por favor, selecione um arquivo PDF válido")
        setStatusType("error")
        return
      }
      
      setFile(selectedFile)
      setStatus("Processando arquivo...")
      setStatusType("info")
      
      // Contar páginas e calcular preço
      try {
        setLoading(true)
        const result = await countPdfPages(selectedFile)
        setPageCount(result.pageCount)
        setTotalPrice(result.totalPrice)
        setStatus(`Arquivo tem ${result.pageCount} páginas - Total: R$ ${result.totalPrice.toFixed(2)}`)
        setStatusType("info")
      } catch (error) {
        console.error("Erro ao processar o PDF:", error)
        setStatus("Erro ao processar o arquivo PDF. Verifique se é um PDF válido.")
        setStatusType("error")
        setFile(null)
        document.getElementById("file-input").value = ""
      } finally {
        setLoading(false)
      }
    }
  }
  
  const startPaymentMonitoring = async (paymentId) => {
    setCheckingPayment(true)
    
    // Limite de verificações (5 minutos, verificando a cada 3 segundos)
    let checkCount = 0;
    const maxChecks = 100; // Aproximadamente 5 minutos
    
    const interval = setInterval(async () => {
      try {
        checkCount++;
        if (checkCount > maxChecks) {
          clearInterval(interval);
          setCheckingPayment(false);
          setStatus("Tempo limite de pagamento excedido. Tente novamente.");
          setStatusType("error");
          return;
        }
        
        const status = await checkPaymentStatus(paymentId)
        setPaymentStatus(status)
        
        if (status === 'approved') {
          clearInterval(interval)
          setCheckingPayment(false)
          setPixQRCode(null)
          setShowSuccess(true)
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }
  
  const handleCreatePayment = async () => {
    if (!file || pageCount <= 0) {
      setStatus("Selecione um arquivo válido primeiro")
      setStatusType("error")
      return
    }
    
    setLoading(true)
    setStatus("Gerando pagamento...")
    setStatusType("")
    
    try {
      // Criar pagamento direto sem enviar o arquivo ainda
      const paymentData = await createPixPayment(totalPrice)
      
      setPaymentData(paymentData)
      if (paymentData.qr_code) {
        setPixQRCode(paymentData)
        startPaymentMonitoring(paymentData.id)
        setStatus("QR Code Pix gerado! Efetue o pagamento.")
        setStatusType("success")
      } else {
        setStatus("Erro ao gerar QR Code Pix")
        setStatusType("error")
      }
    } catch (error) {
      console.error("Erro ao criar pagamento:", error)
      setStatus("Erro ao criar pagamento: " + (error.response?.data?.error || error.message))
      setStatusType("error")
    } finally {
      setLoading(false)
    }
  }

  const handleUploadAfterPayment = async () => {
    if (!file || !paymentData?.id) {
      return
    }
    
    setLoading(true)
    setStatus("Enviando arquivo...")
    setStatusType("")
    
    const { data, error } = await uploadFileWithPayment(file, user.id, pageCount, paymentData.id)
    
    if (error) {
      console.error("Erro ao enviar arquivo:", error)
      setStatus("Erro ao enviar arquivo: " + error.message)
      setStatusType("error")
    } else {
      setStatus("Arquivo enviado com sucesso!")
      setStatusType("success")
      resetForm()
      // Reload files list
      loadUserFiles()
    }
    
    setLoading(false)
  }
  
  const resetForm = () => {
    setFile(null)
    setPaymentData(null)
    setPixQRCode(null)
    setPaymentStatus(null)
    setPageCount(0)
    setTotalPrice(0)
    // Clear file input
    document.getElementById("file-input").value = ""
  }
  
  const handleSuccessComplete = () => {
    setShowSuccess(false)
    handleUploadAfterPayment()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const renderStatusBadge = (status) => {
    if (status === "pendente") {
      return <span className="badge badge-pending">Pendente</span>
    } else if (status === "impresso") {
      return <span className="badge badge-printed">Impresso</span>
    }
    return <span>{status}</span>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Painel de Impressão</h2>
      </div>

      <AnimatePresence>
        {showSuccess && <SuccessAnimation onComplete={handleSuccessComplete} />}
        {pixQRCode && (
          <QRCodeModal
            qrCode={pixQRCode}
            onClose={() => setPixQRCode(null)}
            onCopyCode={() => {
              navigator.clipboard.writeText(pixQRCode.qr_code)
              setStatus("Código Pix copiado!")
              setStatusType("success")
            }}
            paymentStatus={paymentStatus}
          />
        )}
      </AnimatePresence>

      <div className="file-upload-container">
        <h3 className="upload-title">Enviar Arquivo para Impressão</h3>

        <div className="file-input-wrapper">
          <input
            type="file"
            id="file-input"
            className="form-control file-input"
            onChange={handleFileChange}
            accept=".pdf"
            disabled={loading}
          />
          
          {file && pageCount > 0 && (
            <div className="file-info">
              <p>Número de páginas: {pageCount}</p>
              <p className="price-info">Valor total: R$ {totalPrice.toFixed(2)}</p>
            </div>
          )}

          {file && pageCount > 0 && !pixQRCode && !showSuccess && (
            <button className="btn btn-payment" onClick={handleCreatePayment} disabled={loading}>
              {loading ? "Processando..." : "Gerar QR Code Pix"}
            </button>
          )}
          
          {!file && (
            <button className="btn btn-primary" onClick={() => document.getElementById("file-input").click()} disabled={loading}>
              {loading ? "Carregando..." : "Selecionar Arquivo"}
            </button>
          )}
        </div>

        {status && <div className={`status-message ${statusType ? `status-${statusType}` : ""}`}>{status}</div>}
      </div>

      <div className="file-history">
        <h3 className="upload-title">Histórico de Arquivos</h3>

        {loading && <p>Carregando...</p>}

        {!loading && files.length === 0 && <p>Nenhum arquivo enviado ainda.</p>}

        {!loading && files.length > 0 && (
          <div className="file-cards">
            {files.map((file) => (
              <div className="file-card" key={file.id}>
                <div className="file-card-row">
                  <span className="file-card-label">Arquivo:</span>
                  <span className="file-card-value">{file.nome}</span>
                </div>
                <div className="file-card-row">
                  <span className="file-card-label">Data de Envio:</span>
                  <span className="file-card-value">{formatDate(file.created_at)}</span>
                </div>
                <div className="file-card-row">
                  <span className="file-card-label">Status:</span>
                  <span className="file-card-value">{renderStatusBadge(file.status)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}