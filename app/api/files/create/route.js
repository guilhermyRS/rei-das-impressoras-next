import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client directly in the API route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
)

export async function POST(request) {
  try {
    const { fileName, filePath, userId, paymentId, pageCount, isColor, totalPrice } = await request.json()

    // Validate required fields
    if (!fileName || !filePath || !userId || !paymentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // First, check if payment exists by transaction_id
    const { data: existingPayment, error: paymentCheckError } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("transaction_id", paymentId.toString())
      .maybeSingle()

    let paymentDbId = existingPayment?.id

    // If payment doesn't exist, create it
    if (!existingPayment) {
      const { data: newPayment, error: createPaymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          transaction_id: paymentId.toString(),
          amount: totalPrice || 0, // Store the actual payment amount
          status: "approved",
        })
        .select()
        .single()

      if (createPaymentError) {
        console.error("Error creating payment record:", createPaymentError)
        return NextResponse.json(
          { error: "Failed to create payment record: " + createPaymentError.message },
          { status: 500 },
        )
      }

      paymentDbId = newPayment.id
    }

    // Insert file record using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("files")
      .insert({
        file_name: fileName,
        file_path: filePath,
        state_id: 4, // Default to pending (4)
        user_id: userId,
        payment_id: paymentDbId, // Use the database-generated payment ID
        page_count: pageCount,
        is_color: isColor || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting file:", error)
      return NextResponse.json({ error: "Failed to create file record: " + error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 })
  }
}
