"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { uploadFile, getUserFiles } from "@/lib/files"

export default function Dashboard() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState("")
  const [statusType, setStatusType] = useState("")
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const { user } = useAuth()

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setStatus("")
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setStatus("Selecione um arquivo primeiro")
      setStatusType("error")
      return
    }

    setLoading(true)
    setStatus("Enviando arquivo...")
    setStatusType("")

    const { data, error } = await uploadFile(file, user.id)

    if (error) {
      console.error("Erro ao enviar arquivo:", error)
      setStatus("Erro ao enviar arquivo: " + error.message)
      setStatusType("error")
    } else {
      setStatus("Arquivo enviado com sucesso!")
      setStatusType("success")
      setFile(null)
      // Clear file input
      document.getElementById("file-input").value = ""
      // Reload files list
      loadUserFiles()
    }

    setLoading(false)
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

      <div className="file-upload-container">
        <h3 className="upload-title">Enviar Arquivo para Impressão</h3>

        <div className="file-input-wrapper">
          <input
            type="file"
            id="file-input"
            className="form-control file-input"
            onChange={handleFileChange}
            disabled={loading}
          />

          <button className="btn btn-primary" onClick={handleUpload} disabled={loading || !file}>
            {loading ? "Enviando..." : "Enviar para Impressão"}
          </button>
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