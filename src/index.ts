import "dotenv/config";
import { loadConfig } from "./config.js";
import { HubSpotService } from "./hubspot.service.js";
import { ImapService } from "./imap.service.js";
import { findMatchingEmails } from "./matcher.js";

async function main(): Promise<void> {
  const [ticketId] = process.argv
    .slice(2)
    .filter((argument) => !argument.startsWith("--"));
  const apply = process.argv.includes("--apply");
  if (!ticketId) throw new Error("Uso: npm run dev -- <ticket-id> [--apply]");

  const config = loadConfig();
  const hubspot = new HubSpotService(config);
  const hubspotEmail = await hubspot.getIncomingEmailForTicket(ticketId);

  const imap = new ImapService(config.imap);
  await imap.connect();
  try {
    const candidates = await imap.unreadEmails();
    const matches = findMatchingEmails(
      hubspotEmail,
      candidates,
      config.matchWindowMs,
    );
    if (matches.length !== 1) {
      console.log(
        JSON.stringify(
          {
            ticketId,
            hubspotEmailId: hubspotEmail.id,
            result: "not-marked",
            matches: matches.length,
          },
          null,
          2,
        ),
      );
      return;
    }

    const match = matches[0];
    if (!match) throw new Error("Match IMAP non disponibile");
    if (!apply) {
      console.log(
        JSON.stringify(
          {
            ticketId,
            hubspotEmailId: hubspotEmail.id,
            imapUid: match.uid,
            result: "dry-run",
          },
          null,
          2,
        ),
      );
      return;
    }
    await imap.markAsRead(match.uid);
    console.log(
      JSON.stringify(
        {
          ticketId,
          hubspotEmailId: hubspotEmail.id,
          imapUid: match.uid,
          result: "marked-read",
        },
        null,
        2,
      ),
    );
  } finally {
    await imap.logout();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    const details = error as Error & {
      response?: { statusCode?: number; body?: unknown };
      responseStatus?: string;
      responseText?: string;
    };
    const diagnostic = {
      statusCode: details.response?.statusCode,
      body: details.response?.body,
      imapStatus: details.responseStatus,
      imapMessage: details.responseText,
    };
    if (Object.values(diagnostic).some((value) => value !== undefined)) {
      console.error(JSON.stringify(diagnostic, null, 2));
    }
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
