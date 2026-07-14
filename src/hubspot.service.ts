import { Client } from "@hubspot/api-client";
import type { AppConfig } from "./config.js";

interface HubSpotEmailHeaders {
  from?: { email?: string };
}

export interface HubSpotEmail {
  id: string;
  from: string;
  subject: string;
  timestamp: Date;
  text: string;
  ticketId: string;
}

export class HubSpotService {
  private readonly client: Client;

  constructor(config: Pick<AppConfig, "hubspotAccessToken">) {
    this.client = new Client({ accessToken: config.hubspotAccessToken });
  }

  async getIncomingEmailForTicket(ticketId: string): Promise<HubSpotEmail> {
    const ticket = await this.client.crm.objects.basicApi.getById(
      "tickets",
      ticketId,
      undefined,
      undefined,
      ["emails"],
    );
    const emailId = ticket.associations?.emails?.results[0]?.id;
    if (!emailId)
      throw new Error(
        `Il ticket ${ticketId} non ha un'Email HubSpot associata`,
      );

    const email = await this.client.crm.objects.basicApi.getById(
      "emails",
      emailId,
      [
        "hs_email_direction",
        "hs_email_headers",
        "hs_email_subject",
        "hs_email_text",
        "hs_timestamp",
      ],
      undefined,
      ["tickets"],
    );
    const properties = email.properties;
    if (properties.hs_email_direction !== "INCOMING_EMAIL") {
      throw new Error(`L'Email HubSpot ${emailId} non è un'email in ingresso`);
    }

    const headers = JSON.parse(
      properties.hs_email_headers ?? "{}",
    ) as HubSpotEmailHeaders;
    const from = headers.from?.email;
    const timestamp = properties.hs_timestamp;
    const subject = properties.hs_email_subject;
    const text = properties.hs_email_text;
    const associatedTicketId = email.associations?.tickets?.results[0]?.id;
    if (
      !from ||
      !timestamp ||
      typeof subject !== "string" ||
      typeof text !== "string" ||
      !associatedTicketId
    ) {
      throw new Error(
        `L'Email HubSpot ${emailId} non contiene i dati necessari per il match`,
      );
    }

    return {
      id: emailId,
      from,
      subject,
      timestamp: new Date(timestamp),
      text,
      ticketId: associatedTicketId,
    };
  }
}
