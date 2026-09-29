import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUrl, validateCreateInput, validateCustomCode, ValidationError } from "../src/validators.ts";

test("normalizes an HTTPS URL", () => {
  assert.equal(normalizeUrl("https://example.com/docs"), "https://example.com/docs");
});

test("rejects dangerous protocols", () => {
  assert.throws(() => normalizeUrl("javascript:alert(1)"), ValidationError);
});

test("validates custom codes", () => {
  assert.equal(validateCustomCode("my-link_1"), "my-link_1");
  assert.throws(() => validateCustomCode("admin"), /reserved/);
  assert.throws(() => validateCustomCode("a"), ValidationError);
});

test("creates an ISO expiry date", () => {
  const input = validateCreateInput({ url: "https://openai.com", expiresInDays: 7 });
  assert.match(input.expiresAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
});
