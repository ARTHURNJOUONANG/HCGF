import { appendFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Envoi d’e-mails. Sans RESEND_API_KEY : journal uniquement (démo).
 * Quand la clé arrivera, le même appel partira réellement.
 */
export type Mail = {
  to: string;
  subject: string;
  texte: string;
};

export type MailResult = {
  mode: "journal" | "resend";
};

async function journaliser(mail: Mail) {
  const ligne = JSON.stringify({
    at: new Date().toISOString(),
    to: mail.to,
    subject: mail.subject,
    texte: mail.texte.slice(0, 2000),
  });
  const dossier = path.join(process.cwd(), "storage");
  await mkdir(dossier, { recursive: true });
  await appendFile(path.join(dossier, "mail-journal.jsonl"), `${ligne}\n`, "utf8");
  console.info(`[mailer:journal] ${mail.subject} → ${mail.to}`);
}

export async function envoyerMail(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "HCGF <noreply@hcgf.fr>";

  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        text: mail.texte,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Envoi e-mail refusé (${res.status}) ${detail.slice(0, 200)}`);
    }
    return { mode: "resend" };
  }

  await journaliser(mail);
  return { mode: "journal" };
}
