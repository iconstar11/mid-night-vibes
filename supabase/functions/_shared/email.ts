// Server-side only. Never import this from the Expo app.
// Requires the secret RESEND_API_KEY (set with `supabase secrets set`).

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "Midnight Vibes <noreply@send.midnightvibes.online>";
const REPLY_TO = "hello@midnightvibes.online";

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export type SendResult = { ok: true; id: string } | { ok: false };

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

/**
 * Sends one email through Resend. Always sends HTML + plain text.
 * Never throws; failures are logged server-side and reported as { ok: false }.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set");
    return { ok: false };
  }
  if (!isValidEmail(to)) {
    console.error("[email] rejected invalid recipient");
    return { ok: false };
  }
  if (!subject.trim() || subject.length > 200 || /[\r\n]/.test(subject)) {
    console.error("[email] rejected invalid subject");
    return { ok: false };
  }
  if (!html.trim() || !text.trim()) {
    console.error("[email] html and text are both required");
    return { ok: false };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Logged for you; never returned to the user.
      console.error("[email] Resend error", res.status, body?.name, body?.message);
      return { ok: false };
    }
    return { ok: true, id: String(body.id) };
  } catch (err) {
    console.error("[email] request failed", err instanceof Error ? err.message : err);
    return { ok: false };
  }
}
