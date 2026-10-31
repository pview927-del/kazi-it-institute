import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ success: false, message: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const { username, code } = await req.json();
    const validUsername = Deno.env.get("KAZI_ADMIN_USERNAME");
    const validCode = Deno.env.get("KAZI_ADMIN_CODE");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminEmail = Deno.env.get("KAZI_ADMIN_AUTH_EMAIL");

    if (!validUsername || !validCode || !supabaseUrl || !serviceRoleKey || !adminEmail) {
      throw new Error("Missing required server secrets");
    }
    if (typeof username !== "string" || typeof code !== "string" ||
        username !== validUsername || code !== validCode) {
      return Response.json({ success: false, message: "ভুল Username অথবা Code" }, { status: 401, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: adminEmail
    });
    if (error || !data?.properties?.hashed_token) {
      throw new Error("Could not create secure Admin session");
    }

    return Response.json({
      success: true,
      token_hash: data.properties.hashed_token
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Admin login error:", error?.message || error);
    return Response.json({ success: false, message: "Admin login server configuration error" }, { status: 500, headers: corsHeaders });
  }
});