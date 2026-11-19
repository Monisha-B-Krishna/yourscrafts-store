import "server-only";

/**
 * Sends email through Resend (free tier). Optional: without RESEND_API_KEY the
 * store works normally and simply doesn't send emails (CLAUDE.md §3).
 */
export function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  return {
    apiKey,
    // Until a domain is verified in Resend, only onboarding@resend.dev works,
    // and it can only send to the Resend account's own email (docs/setup.md).
    from: process.env.EMAIL_FROM || "Yours Crafts Woman <onboarding@resend.dev>",
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    // Only for automated tests; leave unset.
    apiBase: (process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/$/, ""),
    configured: apiKey.startsWith("re_"),
  };
}

export const isEmailConfigured = () => emailConfig().configured;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Returns true when Resend accepted the email. Never throws. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const config = emailConfig();
  if (!config.configured) return false;
  try {
    const response = await fetch(`${config.apiBase}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error("Email not sent:", response.status, (await response.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email not sent:", error);
    return false;
  }
}
