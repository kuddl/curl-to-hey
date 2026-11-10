import { test } from "node:test";
import assert from "node:assert/strict";
import { convertCurl, renderCommand, ConversionError } from "./convert.ts";
import { tokenize } from "./tokenize.ts";

const cmd = (input: string, reveal = true) => renderCommand(convertCurl(input), reveal);
const ignoredTexts = (input: string) =>
  convertCurl(input)
    .notes.filter((n) => n.kind === "ignored")
    .map((n) => n.text);
const warningTexts = (input: string) =>
  convertCurl(input)
    .notes.filter((n) => n.kind === "warning")
    .map((n) => n.text);

test("tokenize: quotes, escapes and line continuations", () => {
  assert.deepEqual(tokenize(`curl -H "A: b c" 'x y' a\\ b`), ["curl", "-H", "A: b c", "x y", "a b"]);
  assert.deepEqual(tokenize(`curl \\\n  -X POST`), ["curl", "-X", "POST"]);
  assert.throws(() => tokenize(`curl "abc`));
});

test("plain GET has no method flag", () => {
  assert.equal(cmd("curl https://example.com/a"), "hey https://example.com/a");
});

test("--url works and a missing URL is a hard error", () => {
  assert.equal(cmd("curl --url https://example.com"), "hey https://example.com");
  assert.throws(() => convertCurl("curl -H 'A: b'"), ConversionError);
});

test("-X sets the method", () => {
  assert.equal(cmd("curl -X PUT https://e.com"), "hey -m PUT https://e.com");
});

test("-d alone implies POST and a form content type", () => {
  assert.equal(
    cmd("curl -d 'a=1' https://e.com"),
    "hey -m POST -T application/x-www-form-urlencoded -d a=1 https://e.com",
  );
});

test("explicit -X wins over implied POST", () => {
  assert.equal(
    cmd("curl -X GET -d x https://e.com"),
    "hey -m GET -T application/x-www-form-urlencoded -d x https://e.com",
  );
});

test("multiple -d are joined with &", () => {
  assert.match(cmd("curl -d a=1 -d b=2 https://e.com"), /-d 'a=1&b=2'/);
});

test("-d @file is ignored and reported", () => {
  const c = cmd("curl -d @body.json https://e.com");
  assert.equal(c, "hey https://e.com");
  assert.equal(ignoredTexts("curl -d @body.json https://e.com").length, 1);
});

test("-G moves data into the query string", () => {
  assert.equal(cmd("curl -G -d q=1 https://e.com/s"), "hey -m GET 'https://e.com/s?q=1'");
  assert.equal(cmd("curl -G -d q=1 'https://e.com/s?x=2'"), "hey -m GET 'https://e.com/s?x=2&q=1'");
});

test("--json sets POST and JSON headers, explicit headers win", () => {
  assert.equal(
    cmd(`curl --json '{"a":1}' https://e.com`),
    `hey -m POST -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"a":1}' https://e.com`,
  );
  const withOwn = cmd(`curl --json '{}' -H 'content-type: text/plain' https://e.com`);
  assert.match(withOwn, /-H 'content-type: text\/plain'/);
  assert.doesNotMatch(withOwn, /Content-Type: application/);
});

test("-u becomes a Basic Authorization header", () => {
  const expected = Buffer.from("user:pass").toString("base64");
  assert.match(cmd("curl -u user:pass https://e.com"), new RegExp(`Authorization: Basic ${expected}`));
});

test("-u without password is not converted and reported", () => {
  assert.doesNotMatch(cmd("curl -u user https://e.com"), /Authorization/);
  assert.equal(ignoredTexts("curl -u user https://e.com").length, 1);
});

test("-A maps to -U, never -A", () => {
  assert.equal(cmd("curl -A agent/1 https://e.com"), "hey -U agent/1 https://e.com");
});

test("-I maps to HEAD, -e and -b to headers", () => {
  assert.equal(cmd("curl -I https://e.com"), "hey -m HEAD https://e.com");
  assert.equal(cmd("curl -e https://ref.test https://e.com"), "hey -H 'Referer: https://ref.test' https://e.com");
  assert.equal(cmd("curl -b 'a=1' https://e.com"), "hey -H 'Cookie: a=1' https://e.com");
});

test("-k is reported as ignored", () => {
  assert.equal(cmd("curl -k https://e.com"), "hey https://e.com");
  assert.equal(ignoredTexts("curl -k https://e.com").length, 1);
});

test("--max-time maps to -t with a caveat", () => {
  assert.equal(cmd("curl --max-time 5 https://e.com"), "hey -t 5 https://e.com");
  assert.equal(warningTexts("curl --max-time 5 https://e.com").length, 1);
});

test("-x strips http scheme with a caveat, rejects socks", () => {
  assert.equal(cmd("curl -x http://proxy:8080 https://e.com"), "hey -x proxy:8080 https://e.com");
  assert.equal(warningTexts("curl -x http://proxy:8080 https://e.com").length, 1);
  assert.equal(cmd("curl -x socks5://proxy:1080 https://e.com"), "hey https://e.com");
  assert.equal(ignoredTexts("curl -x socks5://proxy:1080 https://e.com").length, 1);
});

test("unlisted method passes through with a warning", () => {
  assert.equal(cmd("curl -X PATCH https://e.com"), "hey -m PATCH https://e.com");
  assert.equal(warningTexts("curl -X PATCH https://e.com").length, 1);
});

test("exact no-ops and --http2 / --no-keepalive map silently", () => {
  assert.equal(cmd("curl --compressed -L https://e.com"), "hey https://e.com");
  assert.equal(cmd("curl --http2 --no-keepalive https://e.com"), "hey -h2 -disable-keepalive https://e.com");
  assert.equal(ignoredTexts("curl --compressed -L https://e.com").length, 0);
});

test("combined short flags and attached values", () => {
  assert.equal(cmd("curl -sSL https://e.com"), "hey https://e.com");
  assert.equal(cmd("curl -XPOST https://e.com"), "hey -m POST https://e.com");
  assert.equal(
    cmd("curl --data=abc https://e.com"),
    "hey -m POST -T application/x-www-form-urlencoded -d abc https://e.com",
  );
});

test("every ignored option is listed, nothing is dropped silently", () => {
  const texts = ignoredTexts("curl -v -o out.txt -k https://e.com");
  assert.equal(texts.length, 3);
});

test("secrets are masked unless revealed", () => {
  const input = "curl -H 'Authorization: Bearer abcdefghijklmnop' -b 'session=sekret123' https://e.com";
  const masked = cmd(input, false);
  assert.match(masked, /Authorization: Bearer \*\*\*\*mnop/);
  assert.match(masked, /Cookie: \*\*\*\*/);
  assert.doesNotMatch(masked, /abcdefgh|sekret123/);
  const revealed = cmd(input, true);
  assert.match(revealed, /abcdefghijklmnop/);
});

test("curl input still goes through the curl path", () => {
  assert.equal(cmd("curl https://e.com"), "hey https://e.com");
});
