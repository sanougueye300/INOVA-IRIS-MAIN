const BRAND = "INOVA-IRIS";
const TAGLINE = "Sonatel SOC Platform";

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
  <title>Réinitialisation de mot de passe — ${BRAND}</title>
</head>
<body style="margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#090d16;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width:560px;background-color:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header with Orange & Sonatel SOC Branding -->
          <tr>
            <td style="background:linear-gradient(135deg, #18181b 0%, #09090b 100%);padding:28px 32px;border-bottom:1px solid #27272a;text-align:center;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="background-color:#FF7900;width:36px;height:36px;border-radius:8px;text-align:center;line-height:36px;color:#ffffff;font-weight:900;font-size:11px;letter-spacing:-0.5px;">
                      orange
                    </div>
                  </td>
                  <td style="vertical-align:middle;text-align:left;">
                    <div style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:0.04em;line-height:1.2;">${BRAND}</div>
                    <div style="font-size:10px;text-transform:uppercase;color:#FF7900;letter-spacing:0.12em;font-weight:700;">${TAGLINE}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security Badge Banner -->
          <tr>
            <td style="background-color:#1c1917;padding:12px 32px;border-bottom:1px solid #292524;text-align:center;">
              <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:rgba(255,121,0,0.12);border:1px solid rgba(255,121,0,0.25);color:#FF7900;font-size:11px;font-weight:700;letter-spacing:0.05em;">
                🛡️ CENTRE DES OPÉRATIONS DE SÉCURITÉ (SOC)
              </span>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:36px 32px;color:#d4d4d8;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
                Demande de réinitialisation de mot de passe
              </h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#a1a1aa;">
                Bonjour,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#d4d4d8;">
                Une demande de réinitialisation de vos identifiants réseau a été enregistrée pour votre compte d'accès <strong style="color:#ffffff;">${userEmail}</strong> à la plateforme <strong style="color:#ffffff;">${BRAND} SOC</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                Cliquez sur le bouton ci-dessous pour accéder directement à la page de mise à jour sécurisée de votre mot de passe :
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #FF7900 0%, #ea580c 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;box-shadow:0 8px 24px rgba(255,121,0,0.35);letter-spacing:0.02em;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Information Box -->
              <div style="background-color:#18181b;border:1px solid #27272a;border-left:4px solid #FF7900;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#f4f4f5;">
                  ⏱️ Validité du lien : ${expiresMinutes} minutes
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                  Pour des raisons de cybersécurité opérationnelle, ce lien à usage unique expirera automatiquement. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                </p>
              </div>

              <p style="margin:0 0 8px;font-size:11px;color:#71717a;">
                Si le bouton ne s'ouvre pas, copiez ce lien sécurisé dans votre navigateur :
              </p>
              <p style="margin:0;font-size:11px;word-break:break-all;color:#FF7900;">
                <a href="${resetUrl}" style="color:#FF7900;text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px;background-color:#09090b;text-align:center;border-top:1px solid #1f2937;">
              <p style="margin:0 0 4px;font-size:11px;color:#71717a;font-weight:600;">
                © 2026 ${BRAND} SOC · Sonatel · Orange Cyberdéfense
              </p>
              <p style="margin:0;font-size:10px;color:#52525b;">
                Djibril Sanou Gueye (djibrilsanougueye@esp.sn)
              </p>
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
  organization?: string | null;
  maskedPhone?: string;
  loginUrl: string;
}): string {
  const { fullName, userEmail, organization, maskedPhone, loginUrl } = params;
  const body = `
          <tr>
            <td style="padding:32px;color:#e4e4e7;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Bonjour <strong style="color:#fafafa;">${fullName}</strong>,</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                Votre compte agent SOC a été provisionné sur <strong style="color:#fb923c;">${BRAND}</strong>${organization ? ` pour <strong style="color:#fafafa;">${organization}</strong>` : ""}.
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#a1a1aa;">
                <strong style="color:#fafafa;">Identifiant :</strong> ${userEmail}<br/>
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
