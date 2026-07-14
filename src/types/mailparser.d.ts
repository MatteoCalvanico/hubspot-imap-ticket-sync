declare module 'mailparser' {
  export interface ParsedMail {
    text?: string | null;
  }

  export function simpleParser(source: Buffer): Promise<ParsedMail>;
}
