import "./globals.css"
import Header from "@/components/Header"
import { AuthProvider } from "@/lib/auth"

export const metadata = {
  title: "Sistema de Autoatendimento de Impressão",
  description: "Sistema para gestão de impressões",
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <div className="app-container">
            <Header />
            <main className="container">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
