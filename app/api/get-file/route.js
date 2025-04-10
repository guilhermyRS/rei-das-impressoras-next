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
    // Try to download the file directly using admin client
    const { data, error } = await supabaseAdmin.storage.from("uploads").download(path)

    if (error) {
      console.error("Error downloading file:", error)

      // More user-friendly error response
      return new NextResponse(
        JSON.stringify({
          error: "File not found or inaccessible",
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

    // Determine content type
    const contentType = path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"

    // Return file as response
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
    console.error("Error getting file:", error)

    // More detailed error response
    return new NextResponse(
      JSON.stringify({
        error: "Error processing request",
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
