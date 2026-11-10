import { test } from "node:test";
import assert from "node:assert/strict";
import { convertInput, renderCommand } from "./convert.ts";
import { isRawRequest, rawToCurl } from "./raw.ts";

const raw = (text: string, reveal = true) => renderCommand(convertInput(text), reveal);

test("raw request detection", () => {
  assert.equal(isRawRequest("GET /x HTTP/1.1\nHost: a.test"), true);
  assert.equal(isRawRequest("curl https://e.com"), false);
});

test("raw GET: host becomes the URL, user-agent becomes -U, secrets masked", () => {
  const input = [
    "GET /v1/medium/1000922/jobs?offset=0&limit=10 HTTP/1.1",
    "Authorization: Bearer eyJxxxxxxxxxxbK-g1_2yfiaqGlw",
    "Content-Type: application/json",
    "Host: ohws.prospective.ch",
    "User-Agent: HTTPie",
  ].join("\n");
  assert.equal(
    raw(input),
    "hey -H 'Authorization: Bearer eyJxxxxxxxxxxbK-g1_2yfiaqGlw' -H 'Content-Type: application/json' -U HTTPie 'https://ohws.prospective.ch/v1/medium/1000922/jobs?offset=0&limit=10'",
  );
  const masked = raw(input, false);
  assert.match(masked, /Authorization: Bearer \*\*\*\*g1_2yfiaqGlw|Authorization: Bearer \*\*\*\*/);
  assert.doesNotMatch(masked, /eyJxxxx/);
  assert.equal(convertInput(input).notes.filter((n) => n.kind === "warning").length, 1);
});

test("raw POST with body and CRLF line endings", () => {
  const input = 'POST /items HTTP/1.1\r\nHost: api.test:8443\r\nContent-Type: application/json\r\n\r\n{"a":1}';
  assert.equal(
    raw(input),
    "hey -m POST -H 'Content-Type: application/json' -d '{\"a\":1}' https://api.test:8443/items",
  );
});

test("raw request with absolute target keeps the given scheme without warning", () => {
  const input = "GET http://plain.test/a HTTP/1.1\nHost: plain.test";
  assert.equal(raw(input), "hey http://plain.test/a");
  assert.equal(convertInput(input).notes.length, 0);
});

test("raw request without Host is an error", () => {
  assert.throws(() => convertInput("GET /a HTTP/1.1\nAccept: */*"), /Host/);
});

test("raw request pasted into a single line (search field) is still recognised", () => {
  const flat =
    "GET /v1/medium/1000922/jobs?offset=0&limit=10&lang=de&f=10:1122860 HTTP/1.1 Authorization: Bearer eyJxxxxxxxxxxbK-g1_2yfiaqGlw Content-Type: application/json Host: ohws.prospective.ch User-Agent: HTTPie";
  assert.equal(isRawRequest(flat), true);
  assert.equal(
    raw(flat),
    "hey -H 'Authorization: Bearer eyJxxxxxxxxxxbK-g1_2yfiaqGlw' -H 'Content-Type: application/json' -U HTTPie 'https://ohws.prospective.ch/v1/medium/1000922/jobs?offset=0&limit=10&lang=de&f=10:1122860'",
  );
});

test("isRawRequest: only a request line with HTTP version counts", () => {
  assert.equal(isRawRequest("GET /a HTTP/1.1"), true);
  assert.equal(isRawRequest("POST /a HTTP/2"), true);
  assert.equal(isRawRequest("  PUT /a HTTP/1.0\nHost: x.test"), true);
  assert.equal(isRawRequest("curl -X GET https://e.com"), false);
  assert.equal(isRawRequest("GET https://e.com"), false);
  assert.equal(isRawRequest("GET /a"), false);
  assert.equal(isRawRequest(""), false);
});

test("rawToCurl: builds the expected curl command for multi-line input", () => {
  const { curl, assumedScheme } = rawToCurl("GET /a?b=1 HTTP/1.1\nHost: h.test\nAccept: */*");
  assert.equal(
    curl,
    "curl -H 'Accept: */*' 'https://h.test/a?b=1'".replace("'https://h.test/a?b=1'", "'https://h.test/a?b=1'"),
  );
  assert.equal(assumedScheme, true);
});

test("rawToCurl: absolute target is used as-is and reports no assumed scheme", () => {
  const { curl, assumedScheme } = rawToCurl("GET https://abs.test/x HTTP/1.1\nHost: abs.test");
  assert.equal(curl, "curl https://abs.test/x");
  assert.equal(assumedScheme, false);
});

test("raw single line: method and body-less GET without extra flags", () => {
  assert.equal(raw("GET /a HTTP/1.1 Host: s.test"), "hey https://s.test/a");
});

test("raw single line: explicit method is kept", () => {
  assert.equal(
    raw("DELETE /items/3 HTTP/1.1 Host: s.test Accept: application/json"),
    "hey -m DELETE -H 'Accept: application/json' https://s.test/items/3",
  );
});

test("raw single line: header values with colons stay intact", () => {
  assert.equal(
    raw("GET /a HTTP/1.1 Host: s.test X-Trace: a:b:c Accept: text/html"),
    "hey -H 'X-Trace: a:b:c' -H 'Accept: text/html' https://s.test/a",
  );
});

test("raw single line: Host with port", () => {
  assert.equal(raw("GET /a HTTP/1.1 Host: s.test:8443"), "hey https://s.test:8443/a");
});

test("raw single line: secrets are masked on screen", () => {
  const masked = raw("GET /a HTTP/1.1 Authorization: Bearer abcdefghijklmnop Host: s.test", false);
  assert.match(masked, /Authorization: Bearer \*\*\*\*mnop/);
  assert.doesNotMatch(masked, /abcdefgh/);
});

test("raw: multi-line request without blank line has no body", () => {
  assert.equal(raw("GET /a HTTP/1.1\nHost: s.test\nAccept: */*"), "hey -H 'Accept: */*' https://s.test/a");
});

test("raw: content-length is dropped, hey computes it", () => {
  assert.equal(
    raw("POST /a HTTP/1.1\nHost: s.test\nContent-Length: 7\nContent-Type: text/plain\n\nabc=123"),
    "hey -m POST -H 'Content-Type: text/plain' -d abc=123 https://s.test/a",
  );
});
