"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { X, Download, FileText, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"

const PDFPreviewModal = ({
  file,
  historyFile,
  onClose,
  pageCount,
  totalPrice,
  onConfirm,
  onDownload,
  loading,
  isHistory = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [previewError, setPreviewError] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const canvasRef = useRef(null)
  const pdfDocRef = useRef(null)
  const renderTaskRef = useRef(null)

  // Função para carregar e renderizar o PDF
  useEffect(() => {
    let isMounted = true
    let objectUrl = null

    const loadPDF = async () => {
      if (!isMounted) return

      try {
        setPreviewLoading(true)
        setPreviewError(false)
        setErrorMessage("")

        // Importar PDF.js dinamicamente
        const pdfjs = await import("pdfjs-dist/webpack")
        const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry")
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

        let pdfData
        let source

        // Se for um arquivo do histórico, precisamos buscar do storage
        if (historyFile) {
          try {
            // Tentar obter o arquivo diretamente, sem verificação prévia
            const response = await fetch(`/api/get-file?path=${encodeURIComponent(historyFile.path)}`, {
              method: "GET",
              cache: "no-store", // Evitar cache
            })

            if (!response.ok) {
              throw new Error(`Erro ao carregar arquivo: ${response.status} ${response.statusText}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            pdfData = new Uint8Array(arrayBuffer)
            source = { data: pdfData }
          } catch (error) {
            console.error("Erro ao buscar arquivo:", error)
            throw new Error("Não foi possível carregar o arquivo do servidor. Tente novamente mais tarde.")
          }
        }
        // Se for um arquivo recém-selecionado, usamos o arquivo diretamente
        else if (file) {
          try {
            objectUrl = URL.createObjectURL(file)
            source = { url: objectUrl }
          } catch (error) {
            console.error("Erro ao criar URL para o arquivo:", error)
            throw new Error("Não foi possível processar o arquivo selecionado.")
          }
        } else {
          throw new Error("Nenhum arquivo fornecido")
        }

        // Carregar o documento PDF
        const loadingTask = pdfjs.getDocument(source)

        // Adicionar tratamento de erro para o carregamento
        loadingTask.promise.catch((error) => {
          console.error("Erro ao carregar PDF:", error)
          if (isMounted) {
            setPreviewError(true)
            setErrorMessage("Não foi possível carregar o PDF. O arquivo pode estar corrompido.")
            setPreviewLoading(false)
          }
        })

        const pdf = await loadingTask.promise

        if (!isMounted) {
          pdf.destroy()
          return
        }

        pdfDocRef.current = pdf
        setTotalPages(pdf.numPages)

        // Definir o número total de páginas
        if (pageCount && pageCount > 0) {
          setTotalPages(pageCount)
        } else if (historyFile && historyFile.page_count > 0) {
          setTotalPages(historyFile.page_count)
        } else {
          setTotalPages(pdf.numPages)
        }

        // Renderizar a primeira página
        await renderPage(pdf, 1)

        if (isMounted) {
          setPreviewLoading(false)
        }
      } catch (error) {
        console.error("Erro ao processar PDF:", error)
        if (isMounted) {
          setPreviewError(true)
          setErrorMessage(error.message || "Não foi possível carregar o PDF.")
          setPreviewLoading(false)
        }
      }
    }

    loadPDF()

    // Cleanup
    return () => {
      isMounted = false

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
        pdfDocRef.current = null
      }

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [file, historyFile, pageCount])

  // Modificar a função renderPage para aumentar a qualidade e remover a marca d'água
  const renderPage = async (pdfDoc, pageNumber) => {
    if (!canvasRef.current) return

    try {
      // Cancelar qualquer renderização em andamento
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }

      // Obter a página
      const page = await pdfDoc.getPage(pageNumber)

      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      // Limpar o canvas
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Calcular a escala para ajustar ao tamanho do container
      const viewport = page.getViewport({ scale: 1.0 })
      const containerWidth = canvas.parentElement.clientWidth

      // Aumentar a escala para melhorar a nitidez (2.0 para telas de alta resolução)
      const scale = (containerWidth / viewport.width) * 2.0
      const scaledViewport = page.getViewport({ scale })

      // Definir as dimensões do canvas com alta resolução
      canvas.height = scaledViewport.height
      canvas.width = scaledViewport.width

      // Ajustar o estilo CSS para manter o tamanho visual correto
      canvas.style.width = `${containerWidth}px`
      canvas.style.height = `${(containerWidth / viewport.width) * viewport.height}px`

      // Renderizar o PDF no canvas com alta qualidade
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
        enableWebGL: true,
        renderInteractiveForms: false,
      }

      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise

      // Removida a marca d'água "PRÉVIA"

      setCurrentPage(pageNumber)
    } catch (error) {
      console.error("Erro ao renderizar página:", error)
      setPreviewError(true)
      setErrorMessage("Erro ao renderizar a página do PDF.")
    }
  }

  // Funções de navegação
  const goToPreviousPage = () => {
    if (currentPage > 1 && pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages && pdfDocRef.current) {
      renderPage(pdfDocRef.current, currentPage + 1)
    }
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
        className="pdf-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="modal-close-button" aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="pdf-modal-content">
          <h3 className="pdf-modal-title">
            <FileText size={20} className="inline mr-2" />
            {isHistory ? historyFile?.nome : file?.name}
          </h3>

          <div className="pdf-preview-container">
            {previewLoading && (
              <div className="pdf-loading">
                <div className="loading-spinner"></div>
                <p>Carregando PDF...</p>
              </div>
            )}

            {previewError && (
              <div className="pdf-error">
                <AlertTriangle size={24} className="mb-2" />
                <p>{errorMessage || "Não foi possível carregar o PDF."}</p>
                <p className="text-xs mt-2">Tente novamente ou use outro arquivo.</p>
              </div>
            )}

            <div className={`pdf-canvas-container ${previewLoading ? "opacity-30" : "opacity-100"}`}>
              <div className="pdf-page-number">
                Página {currentPage} de {totalPages}
              </div>
              <canvas ref={canvasRef} className="pdf-canvas" />
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pdf-navigation">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1 || previewLoading || previewError}
                className="pdf-nav-button"
                aria-label="Página anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="pdf-page-info">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages || previewLoading || previewError}
                className="pdf-nav-button"
                aria-label="Próxima página"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {!isHistory && (
            <div className="pdf-info">
              <p>
                Total de páginas: <strong>{pageCount}</strong>
              </p>
              <p>
                Valor total: <strong>R$ {totalPrice.toFixed(2)}</strong>
              </p>
            </div>
          )}

          <div className="pdf-modal-buttons">
            <button 
              onClick={isHistory ? onDownload : onConfirm} 
              className="modal-button primary" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner inline-block w-4 h-4 mr-2"></span>
                  Processando...
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Baixar</span>
                </>
              )}
            </button>

            <button onClick={onClose} className="modal-button secondary">
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default PDFPreviewModal