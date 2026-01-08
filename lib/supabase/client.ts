import { createClient, SupabaseClient } from "@supabase/supabase-js";


export const supabase: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_ANON_KEY!,
    {
        auth: {
            persistSession: true,  // ✅ MUST
            detectSessionInUrl: true, // optional for OAuth redirects
        },
    }
)