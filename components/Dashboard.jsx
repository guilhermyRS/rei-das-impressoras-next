"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { uploadFileWithPayment, getUserFiles } from "@/lib/files"
import { countPdfPages, createPixPayment, checkPaymentStatus } from "@/lib/mercadopago"
import QRCodeModal from "@/components/QRCodeModal"
import SuccessAnimation from "@/components/SuccessAnimation"
import PDFPreviewModal from "@/components/PDFPreviewModal"
import { AnimatePresence } from "framer-motion"
import { FileText, Upload, Clock, CheckCircle, Eye, Printer, Download, AlertTriangle } from "lucide-react"

export default function Dashboard() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState("")
  const [statusType, setStatusType] = useState("")
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const { user } = useAuth()

  // Payment variables
  const [pageCount, setPageCount] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [pixQRCode, setPixQRCode] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Preview variables
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
      console.error("Error loading files:", error)
      setStatus("Failed to load files: " + (error.message || "Unknown error"))
      setStatusType("error")
    } else {
      setFiles(data || [])
    }

    setLoading(false)
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setStatus("Please select a valid PDF file")
        setStatusType("error")
        return
      }

      setFile(selectedFile)
      setStatus("Processing file...")
      setStatusType("info")

      // Count pages and calculate price
      try {
        setLoading(true)
        const result = await countPdfPages(selectedFile)
        setPageCount(result.pageCount)
        setTotalPrice(result.totalPrice)
        setStatus(`File has ${result.pageCount} pages - Total: R$ ${result.totalPrice.toFixed(2)}`)
        setStatusType("info")

        // Set file for preview
        setPreviewFile(selectedFile)
      } catch (error) {
        console.error("Error processing PDF:", error)
        setStatus("Error processing PDF file. Please check if it's a valid PDF.")
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

    // Limit checks (5 minutes, checking every 3 seconds)
    let checkCount = 0
    const maxChecks = 100 // Approximately 5 minutes

    const interval = setInterval(async () => {
      try {
        checkCount++
        if (checkCount > maxChecks) {
          clearInterval(interval)
          setCheckingPayment(false)
          setStatus("Payment time limit exceeded. Please try again.")
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
        console.error("Error checking payment:", error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }

  const handleCreatePayment = async () => {
    if (!file || pageCount <= 0) {
      setStatus("Select a valid file first")
      setStatusType("error")
      return
    }

    setLoading(true)
    setStatus("Generating payment...")
    setStatusType("")

    try {
      // Create payment without sending the file yet
      const paymentData = await createPixPayment(totalPrice)

      setPaymentData(paymentData)
      if (paymentData.qr_code) {
        setPixQRCode(paymentData)
        startPaymentMonitoring(paymentData.id)
        setStatus("Pix QR Code generated! Complete the payment.")
        setStatusType("success")
      } else {
        setStatus("Error generating Pix QR Code")
        setStatusType("error")
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      setStatus("Error creating payment: " + (error.response?.data?.error || error.message || "Unknown error"))
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
    setStatus("Uploading file...")
    setStatusType("")

    try {
      const { data, error } = await uploadFileWithPayment(file, user.id, pageCount, paymentData.id, totalPrice)

      if (error) {
        console.error("Error uploading file:", error)
        setStatus("Error uploading file: " + (error.message || "Failed to process file"))
        setStatusType("error")
      } else {
        setStatus("File uploaded successfully!")
        setStatusType("success")
        resetForm()
        // Reload files list
        loadUserFiles()
      }
    } catch (err) {
      console.error("Unexpected error during upload:", err)
      setStatus("Unexpected error during upload. Please try again.")
      setStatusType("error")
    } finally {
      setLoading(false)
    }
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
    if (status === "pending" || status === "pendente") {
      return (
        <span className="badge badge-pending">
          <Clock size={14} className="inline mr-1" />
          Pending
        </span>
      )
    } else if (status === "completed" || status === "impresso") {
      return (
        <span className="badge badge-printed">
          <CheckCircle size={14} className="inline mr-1" />
          Completed
        </span>
      )
    } else if (status === "processing") {
      return (
        <span className="badge badge-processing">
          <Printer size={14} className="inline mr-1" />
          Processing
        </span>
      )
    } else if (status === "error") {
      return (
        <span className="badge badge-error">
          <AlertTriangle size={14} className="inline mr-1" />
          Error
        </span>
      )
    }
    return <span>{status}</span>
  }

  // Function to handle viewing history file
  const handleViewHistoryFile = (file) => {
    // Check if file exists in storage before opening modal
    setLoading(true)

    // Check if file exists in storage
    fetch(`/api/check-file?path=${encodeURIComponent(file.path)}`)
      .then((response) => response.json())
      .then((data) => {
        setLoading(false)
        if (data.exists) {
          setSelectedHistoryFile(file)
          setShowHistoryPreview(true)
        } else {
          setStatus("File not found on server. Unable to view.")
          setStatusType("error")
        }
      })
      .catch((error) => {
        setLoading(false)
        console.error("Error checking file:", error)
        setStatus("Error checking file. Please try again.")
        setStatusType("error")
      })
  }

  // Function for file download
  const handleDownload = async (file) => {
    try {
      setDownloadLoading(true)
      setStatus("Starting download...")
      setStatusType("info")

      // Check if file exists
      const checkResponse = await fetch(`/api/check-file?path=${encodeURIComponent(file.path)}`)
      const checkData = await checkResponse.json()

      if (!checkData.exists) {
        setStatus("File not found on server")
        setStatusType("error")
        setDownloadLoading(false)
        return
      }

      // Create URL for download
      const downloadUrl = `/api/get-file?path=${encodeURIComponent(file.path)}`

      // Create temporary <a> element to start download
      const link = document.createElement("a")
      link.href = downloadUrl
      link.setAttribute("download", file.nome)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatus(`Download started for: ${file.nome}`)
      setStatusType("success")
      setShowHistoryPreview(false)
      setDownloadLoading(false)
    } catch (error) {
      console.error("Error downloading file:", error)
      setStatus("Error downloading file. Please try again.")
      setStatusType("error")
      setDownloadLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Print Dashboard</h2>
        </div>

        <div className="file-upload-container">
          <h3 className="upload-title">
            <Upload size={20} className="inline mr-2" />
            Upload File for Printing
          </h3>

          <div className="file-input-wrapper">
            <div className="file-input-display">
              <label htmlFor="file-input" className="file-input-button">
                Choose File
              </label>
              <div className="file-input-text">{file ? file.name : "no file selected"}</div>
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
                Select File
              </button>
            )}

            {file && pageCount > 0 && !pixQRCode && !showSuccess && (
              <div className="file-actions">
                <button className="file-action-btn preview" onClick={() => setShowPreview(true)} disabled={loading}>
                  <Eye size={18} />
                  View PDF
                </button>

                <button className="file-action-btn payment" onClick={handleCreatePayment} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="loading-spinner inline-block w-4 h-4 mr-2"></span>
                      Processing...
                    </>
                  ) : (
                    <>Generate Pix QR Code</>
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
            File History
          </h3>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading...</p>
            </div>
          )}

          {!loading && files.length === 0 && <p className="text-center py-4 text-muted">No files uploaded yet.</p>}

          {!loading && files.length > 0 && (
            <div className="file-cards">
              {files.map((file) => (
                <div className="file-card" key={file.id}>
                  <div className="file-card-row">
                    <span className="file-card-label">File:</span>
                    <span className="file-card-value">{file.nome}</span>
                  </div>
                  <div className="file-card-row">
                    <span className="file-card-label">Upload Date:</span>
                    <span className="file-card-value">{formatDate(file.created_at)}</span>
                  </div>
                  <div className="file-card-row">
                    <span className="file-card-label">Status:</span>
                    <span className="file-card-value">{renderStatusBadge(file.status)}</span>
                  </div>
                  <div className="file-card-actions">
                    <button className="file-card-action-btn" onClick={() => handleViewHistoryFile(file)}>
                      <Eye size={16} />
                      <span>View</span>
                    </button>

                    <button className="file-card-action-btn" onClick={() => handleDownload(file)}>
                      <Download size={16} />
                      <span>Download</span>
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
                setStatus("Pix code copied!")
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
