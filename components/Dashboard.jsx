"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { uploadFileWithPayment, getUserFiles } from "@/lib/files"
import { countPdfPages, createPixPayment, checkPaymentStatus } from "@/lib/mercadopago"
import QRCodeModal from "@/components/QRCodeModal"
import SuccessAnimation from "@/components/SuccessAnimation"
import PDFPreviewModal from "@/components/PDFPreviewModal"
import { AnimatePresence } from "framer-motion"
import { FileText, Upload, Clock, CheckCircle, Eye, Printer, Download } from "lucide-react"

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

  // Variáveis para pré-visualização
  const [showPreview, setShowPreview] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [selectedHistoryFile, setSelectedHistoryFile] = useState(null)
  const [showHistoryPreview, setShowHistoryPreview] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const fileInputRef = useRef(null)

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
      if (selectedFile.type !== "application/pdf") {
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

        // Definir arquivo para pré-visualização
        setPreviewFile(selectedFile)
      } catch (error) {
        console.error("Erro ao processar o PDF:", error)
        setStatus("Erro ao processar o arquivo PDF. Verifique se é um PDF válido.")
        setStatusType("error")
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } finally {
        setLoading(false)
      }
    }
  }

  const startPaymentMonitoring = async (paymentId) => {
    setCheckingPayment(true)

    // Limite de verificações (5 minutos, verificando a cada 3 segundos)
    let checkCount = 0
    const maxChecks = 100 // Aproximadamente 5 minutos

    const interval = setInterval(async () => {
      try {
        checkCount++
        if (checkCount > maxChecks) {
          clearInterval(interval)
          setCheckingPayment(false)
          setStatus("Tempo limite de pagamento excedido. Tente novamente.")
          setStatusType("error")
          return
        }

        const status = await checkPaymentStatus(paymentId)
        setPaymentStatus(status)

        if (status === "approved") {
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
    setPreviewFile(null)
    // Clear file input
    if (fileInputRef.current) fileInputRef.current.value = ""
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
      return (
        <span className="badge badge-pending">
          <Clock size={14} className="inline mr-1" />
          Pendente
        </span>
      )
    } else if (status === "impresso") {
      return (
        <span className="badge badge-printed">
          <CheckCircle size={14} className="inline mr-1" />
          impresso
        </span>
      )
    }
    return <span>{status}</span>
  }

  // Modificar a função para manipular a visualização de arquivo do histórico
  const handleViewHistoryFile = (file) => {
    // Verificar se o arquivo existe no storage antes de abrir o modal
    setLoading(true)

    // Verificar se o arquivo existe no storage
    fetch(`/api/check-file?path=${encodeURIComponent(file.path)}`)
      .then((response) => response.json())
      .then((data) => {
        setLoading(false)
        if (data.exists) {
          setSelectedHistoryFile(file)
          setShowHistoryPreview(true)
        } else {
          setStatus("Arquivo não encontrado no servidor. Não é possível visualizar.")
          setStatusType("error")
        }
      })
      .catch((error) => {
        setLoading(false)
        console.error("Erro ao verificar arquivo:", error)
        setStatus("Erro ao verificar arquivo. Tente novamente.")
        setStatusType("error")
      })
  }

  // Nova função para download de arquivos
  const handleDownload = async (file) => {
    try {
      setDownloadLoading(true)
      setStatus("Iniciando download...")
      setStatusType("info")
      
      // Verificar se o arquivo existe
      const checkResponse = await fetch(`/api/check-file?path=${encodeURIComponent(file.path)}`)
      const checkData = await checkResponse.json()
      
      if (!checkData.exists) {
        setStatus("Arquivo não encontrado no servidor")
        setStatusType("error")
        setDownloadLoading(false)
        return
      }
      
      // Criar URL para download
      const downloadUrl = `/api/get-file?path=${encodeURIComponent(file.path)}`
      
      // Criar um elemento <a> temporário para iniciar o download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', file.nome)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setStatus(`Download iniciado para: ${file.nome}`)
      setStatusType("success")
      setShowHistoryPreview(false)
      setDownloadLoading(false)
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error)
      setStatus("Erro ao baixar o arquivo. Tente novamente.")
      setStatusType("error")
      setDownloadLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Painel de Impressão</h2>
        </div>

        <div className="file-upload-container">
          <h3 className="upload-title">
            <Upload size={20} className="inline mr-2" />
            Enviar Arquivo para Impressão
          </h3>

          <div className="file-input-wrapper">
            <div className="file-input-display">
              <label htmlFor="file-input" className="file-input-button">
                Escolher Arquivo
              </label>
              <div className="file-input-text">{file ? file.name : "nenhum arquivo selecionado"}</div>
            </div>

            <input
              type="file"
              id="file-input"
              className="file-input"
              onChange={handleFileChange}
              accept=".pdf"
              disabled={loading}
              ref={fileInputRef}
            />

            {!file && (
              <button className="file-select-btn" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                <FileText size={20} />
                Selecionar Arquivo
              </button>
            )}

            {file && pageCount > 0 && !pixQRCode && !showSuccess && (
              <div className="file-actions">
                <button className="file-action-btn preview" onClick={() => setShowPreview(true)} disabled={loading}>
                  <Eye size={18} />
                  Visualizar PDF
                </button>

                <button className="file-action-btn payment" onClick={handleCreatePayment} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="loading-spinner inline-block w-4 h-4 mr-2"></span>
                      Processando...
                    </>
                  ) : (
                    <>Gerar QR Code Pix</>
                  )}
                </button>
              </div>
            )}
          </div>

          {status && <div className={`status-message ${statusType ? `status-${statusType}` : ""}`}>{status}</div>}
        </div>

        <div className="file-history">
          <h3 className="upload-title">
            <Clock size={20} className="inline mr-2" />
            Histórico de Arquivos
          </h3>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Carregando...</p>
            </div>
          )}

          {!loading && files.length === 0 && (
            <p className="text-center py-4 text-muted">Nenhum arquivo enviado ainda.</p>
          )}

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
                  <div className="file-card-actions">
                    <button className="file-card-action-btn" onClick={() => handleViewHistoryFile(file)}>
                      <Eye size={16} />
                      <span>Visualizar</span>
                    </button>

                    <button className="file-card-action-btn" onClick={() => handleDownload(file)}>
                      <Download size={16} />
                      <span>Baixar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {showSuccess && <SuccessAnimation key="success" onComplete={handleSuccessComplete} />}
          {pixQRCode && (
            <QRCodeModal
              key="qrcode"
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
          {showPreview && previewFile && (
            <PDFPreviewModal
              key="preview"
              file={previewFile}
              onClose={() => setShowPreview(false)}
              pageCount={pageCount}
              totalPrice={totalPrice}
              onConfirm={handleCreatePayment}
              loading={loading}
            />
          )}
          {showHistoryPreview && selectedHistoryFile && (
            <PDFPreviewModal
              key="history-preview"
              historyFile={selectedHistoryFile}
              onClose={() => setShowHistoryPreview(false)}
              onDownload={() => handleDownload(selectedHistoryFile)}
              loading={downloadLoading}
              isHistory={true}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}