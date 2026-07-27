// Envoi d'email via l'API HTTP de Resend (https://resend.com).
// Remplace le SMTP direct : les connexions SMTP sortantes depuis Render
// (port 465/587) sont peu fiables ("Connection timeout"), alors que l'API
// HTTPS de Resend passe systématiquement.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const sendEmail = async (to, subject, html, attachments = []) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant - service email indisponible");
  }

  const payload = {
    from: process.env.FROM_EMAIL || "onboarding@resend.dev",
    to: [to],
    subject,
    html,
  };

  if (attachments.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    }));
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return response.json();
};
