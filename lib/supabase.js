import { createClient } from "@supabase/supabase-js"

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Regular client for most operations
export const supabase = createClient(supabaseUrl || "", supabaseKey || "")

// For server-side only code
// This is a safer approach that prevents exposing the service role key in client-side code
let supabaseAdmin = null

// Only initialize the admin client on the server side
if (typeof window === "undefined") {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  }
}

export { supabaseAdmin }
