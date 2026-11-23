// Fixed templates. The app picks a template by name; it can never send
// its own subject or HTML. Keep copy non-explicit (transactional only).

export type Rendered = { subject: string; html: string; text: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px">
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
${bodyHtml}
<p style="margin:32px 0 0;font-size:12px;color:#777">Midnight Vibes · <a href="https://midnightvibes.online" style="color:#777">midnightvibes.online</a><br>
Questions? Just reply to this email.</p>
</td></tr></table></body></html>`;
}

const firstName = (name: unknown) =>
  typeof name === "string" && name.trim() ? name.trim().slice(0, 40) : "there";

export const templates = {
  welcome(data: Record<string, unknown>): Rendered {
    const name = firstName(data.name);
    return {
      subject: "Welcome to Midnight Vibes",
      html: layout(
        "Welcome to Midnight Vibes",
        `<p style="font-size:16px;line-height:1.5">Hi ${escapeHtml(name)}, your account is ready.</p>
<p style="font-size:16px;line-height:1.5">Open <a href="https://midnightvibes.online">midnightvibes.online</a> any time to start a game.</p>`,
      ),
      text: `Hi ${name}, your account is ready.\n\nOpen https://midnightvibes.online any time to start a game.\n\nQuestions? Just reply to this email.\n— Midnight Vibes`,
    };
  },

  premium_confirmed(data: Record<string, unknown>): Rendered {
    const name = firstName(data.name);
    return {
      subject: "Your Midnight Vibes Premium is active",
      html: layout(
        "Premium is active",
        `<p style="font-size:16px;line-height:1.5">Hi ${escapeHtml(name)}, thanks for upgrading. Premium is now unlocked on your account.</p>
<p style="font-size:16px;line-height:1.5">Your payment receipt comes separately from Stripe.</p>`,
      ),
      text: `Hi ${name}, thanks for upgrading. Premium is now unlocked on your account.\n\nYour payment receipt comes separately from Stripe.\n\nQuestions? Just reply to this email.\n— Midnight Vibes`,
    };
  },
} satisfies Record<string, (data: Record<string, unknown>) => Rendered>;

export type TemplateName = keyof typeof templates;

export const isTemplateName = (v: unknown): v is TemplateName =>
  typeof v === "string" && Object.hasOwn(templates, v);
