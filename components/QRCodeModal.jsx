"use client"

import { motion } from "framer-motion"
import { X, Copy, CheckCircle, Clock } from "lucide-react"
import { useState } from "react"

const QRCodeModal = ({ qrCode, onClose, onCopyCode, paymentStatus }) => {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    onCopyCode()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="modal-close-button" aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="modal-content">
          <h3 className="modal-title">Escaneie o QR Code Pix</h3>

          <div className="qr-code-wrapper">
            <img src={`data:image/png;base64,${qrCode.qr_code_base64}`} alt="QR Code Pix" className="qr-code-image" />
          </div>

          <p className="modal-description">
            Escaneie o código QR com o aplicativo do seu banco para realizar o pagamento Pix.
          </p>

          <div className="modal-buttons">
            <button onClick={handleCopyCode} className={`modal-button primary ${copied ? "copied" : ""}`}>
              {copied ? (
                <>
                  <CheckCircle size={18} />
                  <span>Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Copiar Código Pix</span>
                </>
              )}
            </button>

            <button onClick={onClose} className="modal-button secondary">
              Fechar
            </button>
          </div>

          {paymentStatus && (
            <div className={`payment-status ${paymentStatus === "approved" ? "approved" : "pending"}`}>
              {paymentStatus === "approved" ? (
                <p>
                  <CheckCircle size={16} />
                  Pagamento aprovado!
                </p>
              ) : (
                <p className="pulse">
                  <Clock size={16} />
                  Aguardando pagamento...
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default QRCodeModal
