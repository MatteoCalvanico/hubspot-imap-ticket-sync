import { createHash } from "node:crypto";

export interface MatchableEmail {
  uid: number;
  from: string;
  subject: string;
  timestamp: Date;
  text: string;
}

export function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u200b]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export function contentHash(value: string): string {
  return createHash("sha256")
    .update(normalizeText(value), "utf8")
    .digest("hex");
}

export function findMatchingEmails(
  target: Omit<MatchableEmail, "uid">,
  candidates: MatchableEmail[],
  windowMs: number,
): MatchableEmail[] {
  const targetHash = contentHash(target.text);
  const exactContentMatches = candidates.filter(
    (candidate) => contentHash(candidate.text) === targetHash,
  );
  if (exactContentMatches.length > 0) return exactContentMatches;

  const targetFrom = target.from.trim().toLowerCase();
  const targetSubject = normalizeText(target.subject).toLowerCase();
  return candidates.filter(
    (candidate) =>
      candidate.from.trim().toLowerCase() === targetFrom &&
      normalizeText(candidate.subject).toLowerCase() === targetSubject &&
      Math.abs(candidate.timestamp.getTime() - target.timestamp.getTime()) <=
        windowMs,
  );
}
