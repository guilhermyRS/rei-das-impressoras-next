import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client directly in the API route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 })
  }

  try {
    // Check if file exists in bucket using admin client
    const { data, error } = await supabaseAdmin.storage.from("uploads").download(path)

    if (error) {
      console.error("Error checking file:", error)
      return NextResponse.json({ exists: false, error: error.message }, { status: 200 })
    }

    return NextResponse.json({ exists: true }, { status: 200 })
  } catch (error) {
    console.error("Error checking file:", error)
    return NextResponse.json({ exists: false, error: "Error checking file" }, { status: 200 })
  }
}
