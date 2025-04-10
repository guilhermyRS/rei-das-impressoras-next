import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client directly in the API route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user files using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("files")
      .select(`
        *,
        file_states(name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching files:", error)
      return NextResponse.json({ error: "Failed to fetch files: " + error.message }, { status: 500 })
    }

    // Transform data to include state name directly
    const transformedData = data.map((file) => ({
      ...file,
      state_name: file.file_states?.name,
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 })
  }
}
