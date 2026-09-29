import { randomBytes } from "node:crypto";

const RESERVED_CODES = new Set(["api", "health", "admin", "assets", "favicon.ico"]);
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,24}$/;

export type CreateLinkInput = {
  url: string;
  customCode?: string;
  expiresInDays?: number;
};

export type ValidatedLinkInput = {
  targetUrl: string;
  customCode: string | null;
  expiresAt: string | null;
};

export class ValidationError extends Error {
  readonly statusCode = 422;
}

export function normalizeUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("url is required");
  }

  if (value.length > 2048) {
    throw new ValidationError("url is too long");
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ValidationError("url must be a valid absolute URL");
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError("only http and https URLs are allowed");
  }

  return parsed.toString();
}

export function validateCustomCode(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !CODE_PATTERN.test(value)) {
    throw new ValidationError("customCode must contain 4-24 letters, numbers, _ or -");
  }
  if (RESERVED_CODES.has(value.toLowerCase())) {
    throw new ValidationError("customCode is reserved");
  }
  return value;
}

export function validateExpiry(value: unknown, now = new Date()): string | null {
  if (value === undefined || value === null || value === "") return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new ValidationError("expiresInDays must be an integer from 1 to 365");
  }
  const expires = new Date(now);
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires.toISOString();
}

export function validateCreateInput(body: unknown): ValidatedLinkInput {
  if (!body || typeof body !== "object") throw new ValidationError("JSON body is required");
  const input = body as CreateLinkInput;
  return {
    targetUrl: normalizeUrl(input.url),
    customCode: validateCustomCode(input.customCode),
    expiresAt: validateExpiry(input.expiresInDays)
  };
}

export function generateCode(): string {
  // base64url даёт URL-безопасные символы без дополнительной обработки.
  return randomBytes(6).toString("base64url").slice(0, 8);
}
