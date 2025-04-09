import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  try {
    // Verificar se o arquivo existe no bucket
    const { data, error } = await supabase.storage.from("uploads").download(path)

    if (error) {
      console.error("Erro ao verificar arquivo:", error)
      return NextResponse.json({ exists: false, error: error.message }, { status: 200 })
    }

    return NextResponse.json({ exists: true }, { status: 200 })
  } catch (error) {
    console.error("Erro ao verificar arquivo:", error)
    return NextResponse.json({ exists: false, error: "Erro ao verificar arquivo" }, { status: 200 })
  }
}
