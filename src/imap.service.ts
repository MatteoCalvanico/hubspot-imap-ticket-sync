import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { AppConfig } from "./config.js";
import type { MatchableEmail } from "./matcher.js";

export class ImapService {
  private readonly client: ImapFlow;
  private readonly mailbox: string;

  constructor(config: AppConfig["imap"]) {
    this.mailbox = config.mailbox;
    this.client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: true,
      auth:
        config.auth.type === "oauth2"
          ? { user: config.user, accessToken: config.auth.accessToken }
          : { user: config.user, pass: config.auth.password },
      logger: false,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async logout(): Promise<void> {
    await this.client.logout();
  }

  async unreadEmails(): Promise<MatchableEmail[]> {
    const lock = await this.client.getMailboxLock(this.mailbox);
    try {
      const uids = await this.client.search({ seen: false }, { uid: true });
      if (!uids || uids.length === 0) return [];
      const messages = await this.client.fetchAll(
        uids,
        { envelope: true, source: true },
        { uid: true },
      );
      return Promise.all(
        messages.map(async (message) => {
          if (
            !message.source ||
            !message.envelope?.from?.[0]?.address ||
            !message.envelope.date
          ) {
            throw new Error(
              `Email IMAP UID ${message.uid} priva dei metadati necessari`,
            );
          }
          const parsed = await simpleParser(message.source);
          return {
            uid: message.uid,
            from: message.envelope.from[0].address,
            subject: message.envelope.subject ?? "",
            timestamp: new Date(message.internalDate ?? message.envelope.date),
            text: parsed.text ?? "",
          };
        }),
      );
    } finally {
      lock.release();
    }
  }

  async markAsRead(uid: number): Promise<void> {
    const lock = await this.client.getMailboxLock(this.mailbox);
    try {
      await this.client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  }
}
