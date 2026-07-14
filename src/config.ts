import "node:process";

export interface AppConfig {
  hubspotAccessToken: string;
  imap: {
    host: string;
    port: number;
    mailbox: string;
    user: string;
    auth:
      | { type: "password"; password: string }
      | { type: "oauth2"; accessToken: string };
  };
  matchWindowMs: number;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Variabile d'ambiente obbligatoria mancante: ${name}`);
  return value;
}

export function loadConfig(): AppConfig {
  const authMode = process.env.IMAP_AUTH_MODE ?? "password";
  const port = Number(process.env.IMAP_PORT ?? "993");
  const windowMinutes = Number(process.env.MATCH_WINDOW_MINUTES ?? "2");

  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("IMAP_PORT non valido");
  if (!Number.isFinite(windowMinutes) || windowMinutes < 0)
    throw new Error("MATCH_WINDOW_MINUTES non valido");

  const auth =
    authMode === "oauth2"
      ? { type: "oauth2" as const, accessToken: required("IMAP_ACCESS_TOKEN") }
      : authMode === "password"
        ? { type: "password" as const, password: required("IMAP_PASSWORD") }
        : (() => {
            throw new Error(
              "IMAP_AUTH_MODE deve essere password oppure oauth2",
            );
          })();

  return {
    hubspotAccessToken: required("HUBSPOT_ACCESS_TOKEN"),
    imap: {
      host: process.env.IMAP_HOST ?? "outlook.office365.com",
      port,
      mailbox: process.env.IMAP_MAILBOX ?? "INBOX",
      user: required("IMAP_USER"),
      auth,
    },
    matchWindowMs: windowMinutes * 60_000,
  };
}
