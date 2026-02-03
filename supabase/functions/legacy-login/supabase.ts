// supabase.ts - FINAL VERSION
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Debug: Check what's available
console.log("Available env vars:");
console.log("PROJECT_URL:", Deno.env.get("PROJECT_URL") ? "✓" : "✗");
console.log("SERVICE_ROLE_KEY:", Deno.env.get("SERVICE_ROLE_KEY") ? "✓" : "✗");

// Use custom names that you set
const supabaseUrl = Deno.env.get("PROJECT_URL") || "";
const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

// Validate
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables");
}

console.log(`Connecting to: ${supabaseUrl.substring(0, 30)}...`);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});