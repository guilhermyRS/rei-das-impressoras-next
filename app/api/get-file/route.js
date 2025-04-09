import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  try {
    // Tentar baixar o arquivo diretamente
    const { data, error } = await supabase.storage.from("uploads").download(path)

    if (error) {
      console.error("Erro ao baixar arquivo:", error)

      // Resposta de erro mais amigável
      return new NextResponse(
        JSON.stringify({
          error: "Arquivo não encontrado ou inacessível",
          details: error.message,
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0",
          },
        },
      )
    }

    // Determinar o tipo de conteúdo
    const contentType = path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"

    // Retornar o arquivo como resposta
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.split("/").pop()}"`,
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Erro ao obter arquivo:", error)

    // Resposta de erro mais detalhada
    return new NextResponse(
      JSON.stringify({
        error: "Erro ao processar a solicitação",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  }
}
