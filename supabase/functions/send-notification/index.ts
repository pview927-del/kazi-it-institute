import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const pub = Deno.env.get("VAPID_PUBLIC_KEY");
    const priv = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
    if (!url || !anonKey || !serviceKey || !pub || !priv) throw new Error("Push secrets are not configured.");
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const adminClient = createClient(url, serviceKey);
    const { data: profile, error: profileError } = await adminClient.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin") return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    const input = await req.json();
    const title = String(input.title || "KAZI IT AND INSTITUTE").slice(0, 120);
    const body = String(input.body || "নতুন নোটিশ প্রকাশিত হয়েছে।").slice(0, 500);
    const targetUrl = String(input.url || "./notices.html").slice(0, 500);
    webpush.setVapidDetails(subject, pub, priv);
    const { data: subscriptions, error: subError } = await adminClient.from("push_subscriptions").select("id,endpoint,p256dh,auth");
    if (subError) throw subError;
    let sent = 0, failed = 0;
    for (const row of subscriptions || []) {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ title, body, url: targetUrl }), { TTL: 86400 });
        sent++;
      } catch (err) {
        failed++;
        if (err?.statusCode === 404 || err?.statusCode === 410) await adminClient.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
    return new Response(JSON.stringify({ ok: true, sent, failed, total: (subscriptions || []).length }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Push send failed" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});