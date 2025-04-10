import { checkPaymentStatus } from "./mercadopago"

// Upload file with payment
export async function uploadFileWithPayment(file, userId, pageCount, paymentId = null, totalPrice = 0) {
  try {
    // If there's no paymentId, it means the payment hasn't been processed yet
    if (!paymentId) {
      throw new Error("Payment ID is required")
    }

    // Check payment status
    const status = await checkPaymentStatus(paymentId)

    if (status !== "approved") {
      throw new Error("Payment not approved")
    }

    // If payment is approved, proceed with upload
    const fileName = `${Date.now()}_${file.name}`

    // Use server-side API to upload the file to storage
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)

    const uploadResponse = await fetch("/api/files/upload", {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error(errorData.error || "Failed to upload file to storage")
    }

    const uploadData = await uploadResponse.json()

    // Use server-side API to insert the file record
    const response = await fetch("/api/files/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        filePath: fileName,
        userId: userId,
        paymentId: paymentId.toString(), // Ensure paymentId is a string
        pageCount: pageCount,
        isColor: false,
        totalPrice: totalPrice, // Pass the total price to store in the payment record
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create file record")
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error("Upload error:", error)
    return { error }
  }
}

// Get user file history
export async function getUserFiles(userId) {
  try {
    // Use server-side API to get user files
    const response = await fetch(`/api/files/list?userId=${userId}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to fetch user files")
    }

    const data = await response.json()

    // Transform data to match the expected format in the UI
    const transformedData = data.map((file) => ({
      ...file,
      nome: file.file_name,
      path: file.file_path,
      status: file.state_name || "pending",
    }))

    return { data: transformedData }
  } catch (error) {
    console.error("Error fetching user files:", error)
    return { error }
  }
}
