const BRAND = "INOVA-IRIS";
const TAGLINE = "Plateforme SOC Sonatel";

export function passwordResetEmailHtml(params: {
  resetUrl: string;
  userEmail: string;
  expiresMinutes?: number;
}): string {
  const { resetUrl, userEmail, expiresMinutes = 15 } = params;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Réinitialisation — ${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);line-height:48px;font-size:24px;">🛡️</div>
              <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:800;letter-spacing:0.04em;">${BRAND}</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;text-transform:uppercase;letter-spacing:0.12em;">${TAGLINE}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#e4e4e7;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Bonjour,</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                Une demande de réinitialisation de mot de passe a été effectuée pour le compte
                <strong style="color:#fafafa;">${userEmail}</strong> sur la plateforme <strong style="color:#fb923c;">${BRAND}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien expire dans <strong style="color:#fafafa;">${expiresMinutes} minutes</strong>.
              </p>
              <p style="text-align:center;margin:0 0 28px;">
                <a href="${resetUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(234,88,12,0.35);">
                  Réinitialiser mon mot de passe
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#71717a;line-height:1.5;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
              </p>
              <p style="margin:0 0 24px;font-size:11px;word-break:break-all;color:#fb923c;">
                <a href="${resetUrl}" style="color:#fb923c;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. Votre mot de passe restera inchangé.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#09090b;text-align:center;border-top:1px solid #27272a;">
              <p style="margin:0;font-size:11px;color:#52525b;">© Sonatel · ${BRAND} — Sécurité opérationnelle</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function otpSmsMessage(code: string, expiresMinutes: number): string {
  return `${BRAND}: votre code de connexion est ${code}. Valide ${expiresMinutes} min. Ne le partagez avec personne.`;
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);padding:28px 32px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);line-height:48px;font-size:24px;">🛡️</div>
              <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:800;letter-spacing:0.04em;">${BRAND}</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:12px;text-transform:uppercase;letter-spacing:0.12em;">${TAGLINE}</p>
            </td>
          </tr>
          ${bodyHtml}
          <tr>
            <td style="padding:20px 32px;background:#09090b;text-align:center;border-top:1px solid #27272a;">
              <p style="margin:0;font-size:11px;color:#52525b;">© Sonatel · ${BRAND} — Sécurité opérationnelle</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeAccountEmailHtml(params: {
  fullName: string;
  userEmail: string;
  password?: string;
  organization?: string | null;
  maskedPhone?: string;
  loginUrl: string;
}): string {
  const { fullName, userEmail, password, organization, maskedPhone, loginUrl } = params;
  const body = `
          <tr>
            <td style="padding:32px;color:#e4e4e7;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Bonjour <strong style="color:#fafafa;">${fullName}</strong>,</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                Votre compte agent SOC a été provisionné sur <strong style="color:#fb923c;">${BRAND}</strong>${organization ? ` pour <strong style="color:#fafafa;">${organization}</strong>` : ""}.
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                <strong style="color:#fafafa;">Identifiant :</strong> ${userEmail}<br/>
                ${password ? `<strong style="color:#fafafa;">Mot de passe temporaire :</strong> <code style="background:#27272a;padding:2px 6px;border-radius:4px;color:#fb923c;font-family:monospace;font-size:13px;">${password}</code><br/>` : ""}
                ${maskedPhone ? `<strong style="color:#fafafa;">OTP SMS :</strong> envoyé au ${maskedPhone} à chaque connexion<br/>` : ""}
                <strong style="color:#fafafa;">Authentification :</strong> mot de passe + double facteur (OTP)
              </p>
              <p style="text-align:center;margin:24px 0 28px;">
                <a href="${loginUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(234,88,12,0.35);">
                  Accéder à la console SOC
                </a>
              </p>
              <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                Conservez vos identifiants en lieu sûr. En cas de perte d'accès, utilisez la récupération par e-mail ou vos questions de secours.
              </p>
            </td>
          </tr>`;
  return emailShell(`Bienvenue — ${BRAND}`, body);
}

export function otpEmailHtml(params: {
  code: string;
  userEmail: string;
  fullName?: string | null;
  expiresMinutes?: number;
}): string {
  const { code, userEmail, fullName, expiresMinutes = 2 } = params;
  const greeting = fullName ? `Bonjour <strong style="color:#fafafa;">${fullName}</strong>,` : "Bonjour,";
  const body = `
          <tr>
            <td style="padding:32px;color:#e4e4e7;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                Voici votre code de double authentification pour le compte
                <strong style="color:#fafafa;">${userEmail}</strong> sur <strong style="color:#fb923c;">${BRAND}</strong>.
              </p>
              <p style="text-align:center;margin:0 0 24px;">
                <span style="display:inline-block;background:#27272a;color:#fb923c;font-family:monospace;font-size:28px;font-weight:800;letter-spacing:0.3em;padding:16px 28px;border-radius:12px;border:1px solid #3f3f46;">
                  ${code}
                </span>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;text-align:center;">
                Ce code expire dans <strong style="color:#fafafa;">${expiresMinutes} minutes</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                Ne partagez jamais ce code. L'équipe SOC ne vous le demandera jamais par téléphone ou e-mail.
              </p>
            </td>
          </tr>`;
  return emailShell(`Code OTP — ${BRAND}`, body);
}
