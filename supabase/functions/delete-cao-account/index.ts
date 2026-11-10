import { createClient } from "npm:@supabase/supabase-js@2.98.0";

const allowedOrigins = new Set(["https://caofinder.com", "https://www.caofinder.com"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = {
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  };
  const respond = (error: string, status: number) => Response.json({ error }, { status, headers });

  if (origin && !allowedOrigins.has(origin)) return respond("Origin not allowed", 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return respond("Method not allowed", 405);

  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond("Sign in to continue", 401);

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const adminKey = (secretKeys ? JSON.parse(secretKeys).default : undefined)
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!adminKey || !url) return respond("Account deletion is unavailable", 503);

  const admin = createClient(url, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return respond("Sign in to continue", 401);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return respond("Could not delete the account", 500);
  return new Response(null, { status: 204, headers });
});
