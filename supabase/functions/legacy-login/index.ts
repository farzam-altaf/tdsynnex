// index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkPassword } from "./phpass.ts";
import { supabaseAdmin } from "./supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing credentials" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 1️⃣ Fetch user from legacy table
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, password, userId, role, firstName, lastName")
      .eq("email", email)
      .single();

    // Line 70 ke baad ye add karo for debugging
    console.log("User data:", {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordStartsWith: user.password?.substring(0, 10) + "..."
    });


    if (userError || !user) {
      console.log("User not found:", email);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`User found: ${user.email}, has password: ${!!user.password}`);

    // 2️⃣ Check if already migrated
    if (!user.password) {
      console.log("User already migrated, checking in auth.users...");

      // Check if user exists in auth.users
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.email === email);

      if (authUser) {
        return new Response(
          JSON.stringify({
            status: "already_migrated",
            userId: authUser.id,
            message: "Please use regular Supabase auth login"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        // User exists in public.users but not in auth.users
        return new Response(
          JSON.stringify({ error: "Account migration incomplete" }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 3️⃣ Verify PHPass password
    console.log("Verifying PHPass hash...");
    const isValid = checkPassword(password, user.password);

    if (!isValid) {
      console.log("Password verification failed");
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("Password verified successfully");

    // 4️⃣ Create Supabase Auth user
    let authUserId = user.userId;
    let userCreated = false;

    // Replace lines 86-106 with this:

    if (!authUserId) {
      try {
        console.log("Creating new auth user in Supabase Auth...");

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email.trim().toLowerCase(),
          password: password, // ✅ Supabase will hash this with bcrypt
          email_confirm: true,
          user_metadata: {
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            role: user.role || 'user',
            migrated_from_legacy: true,
            legacy_id: user.id
          }
        });

        if (authError) {
          console.error("Supabase Auth creation error:", {
            message: authError.message,
            status: authError.status,
            details: authError
          });

          // Check if user already exists in auth
          if (authError.message.includes("already registered")) {
            // Try to get existing user
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u =>
              u.email.toLowerCase() === user.email.toLowerCase()
            );

            if (existingUser) {
              authUserId = existingUser.id;
              console.log("Found existing auth user:", authUserId);
            } else {
              throw authError;
            }
          } else {
            throw authError;
          }
        } else {
          authUserId = authData.user.id;
          userCreated = true;
          console.log("✅ New auth user created in Supabase Auth:", authUserId);
        }

        // Update public.users with auth userId
        if (authUserId) {
          const { error: updateError } = await supabaseAdmin
            .from("users")
            .update({
              userId: authUserId,
              updated_at: new Date().toISOString()
            })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error updating users table:", updateError);
          } else {
            console.log("✅ Updated public.users with auth userId");
          }
        }

      } catch (createError) {
        console.error("❌ Failed to create/update auth user:", createError);
        return new Response(
          JSON.stringify({
            error: "Failed to create user account",
            details: String(createError),
            code: "AUTH_CREATION_FAILED"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      console.log("Auth user already exists, updating password...");

      // Update password in auth system
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: password,
      });
    }

    // 5️⃣ Generate sign-in token (optional but recommended)
    let sessionToken = null;
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
        options: {
          redirectTo: `${Deno.env.get("SITE_URL")}/auth/callback`,
        }
      });

      sessionToken = linkData?.properties?.hashed_token;
    } catch (tokenError) {
      console.log("Could not generate session token, continuing...");
    }

    // 6️⃣ Remove legacy password (optional - you can keep it for backup)
    await supabaseAdmin
      .from("users")
      .update({
        password: null,
        login_at: new Date().toISOString(),
        login_count: (parseInt(user.login_count || '0') + 1).toString()
      })
      .eq("id", user.id);

    console.log("Migration completed successfully");

    return new Response(
      JSON.stringify({
        status: "success",
        migrated: userCreated,
        userId: authUserId,
        email: user.email,
        sessionToken: sessionToken,
        message: userCreated
          ? "Account migrated to Supabase Auth successfully"
          : "Logged in successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error("Legacy login error:", err);
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: String(err)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});