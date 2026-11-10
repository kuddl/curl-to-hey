import { test } from "node:test";
import assert from "node:assert/strict";
import { maskAuthValue, maskHeader, maskSecret } from "./mask.ts";

test("masking format", () => {
  assert.equal(maskSecret("short"), "****");
  assert.equal(maskSecret("longerSecretValue"), "****alue");
  assert.equal(maskAuthValue("Bearer x9QzabcdEFGH"), "Bearer ****EFGH");
  assert.equal(maskAuthValue("Basic dXNlcjpwYXNz"), "Basic ****YXNz");
  assert.equal(maskHeader("Accept: text/html"), "Accept: text/html");
});
