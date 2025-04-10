import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client directly in the API route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const fileName = formData.get("fileName")

    if (!file || !fileName) {
      return NextResponse.json({ error: "File and fileName are required" }, { status: 400 })
    }

    // Upload file to storage using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage.from("uploads").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Storage upload error:", error)
      return NextResponse.json({ error: "Failed to upload file to storage: " + error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false, // Disables body parsing, needed for file uploads
  },
}
