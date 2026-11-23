// POST /functions/v1/send-email   body: { template: "welcome" | "premium_confirmed", data?: { name?: string } }
// Sends ONLY to the signed-in user's own verified email. The client never chooses the recipient,
// subject or HTML, so this endpoint can't be used to spam other people.

import { createClient } from "npm:@supabase/supabase-js@2";
import { isValidEmail, sendEmail } from "../_shared/email.ts";
import { isTemplateName, templates } from "../_shared/email-templates.ts";

const ALLOWED_ORIGINS = new Set([
  "https://midnightvibes.online",
  "https://www.midnightvibes.online",
  "http://localhost:8081", // Expo web dev server
]);

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://midnightvibes.online";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  // 1. Who is calling? (verify_jwt is on by default; we also resolve the user.)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Not signed in" }, origin);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "Not signed in" }, origin);

  // Anonymous players have no email address to send to.
  if (user.is_anonymous || !isValidEmail(user.email)) {
    return json(400, { error: "No email on this account" }, origin);
  }

  // 2. Validate input: small JSON, known template, short optional name.
  const raw = await req.text();
  if (raw.length > 2_000) return json(413, { error: "Request too large" }, origin);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid request" }, origin);
  }
  const { template, data } = (body ?? {}) as { template?: unknown; data?: unknown };
  if (!isTemplateName(template)) return json(400, { error: "Invalid request" }, origin);
  const safeData: Record<string, unknown> = {};
  if (data && typeof data === "object" && "name" in data) {
    const name = (data as { name: unknown }).name;
    if (typeof name !== "string" || name.length > 40) {
      return json(400, { error: "Invalid request" }, origin);
    }
    safeData.name = name;
  }

  // 3. Rate limit (per user per hour/day, plus a global daily cap).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: allowed, error: rlErr } = await admin.rpc("claim_email_slot", {
    p_user_id: user.id,
    p_template: template,
  });
  if (rlErr) {
    console.error("[send-email] rate-limit check failed", rlErr.message);
    return json(500, { error: "Could not send email. Please try again later." }, origin);
  }
  if (!allowed) return json(429, { error: "Too many emails. Please try again later." }, origin);

  // 4. Render and send. Resend errors are logged inside sendEmail, never shown here.
  const { subject, html, text } = templates[template](safeData);
  const result = await sendEmail(user.email, subject, html, text);
  if (!result.ok) {
    return json(502, { error: "Could not send email. Please try again later." }, origin);
  }
  return json(200, { sent: true }, origin);
});
