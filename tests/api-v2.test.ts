import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync, publicEncrypt, constants } from "node:crypto";
import { open, seal, toBase64 } from "../lib/http/v2-crypto";
import { handleV2, publicJwk } from "../lib/http/v2-server";
import { v2Fetch } from "../lib/http/v2-fetch";

test("V2 encrypts data and rejects tampering and incorrect keys", async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const value = { password: "secret", path: "/api/products?search=private" };
  const envelope = await seal(key, value);
  assert.ok(!JSON.stringify(envelope).includes("secret"));
  assert.deepEqual(await open(key, envelope), value);
  assert.notEqual(envelope.iv, (await seal(key, value)).iv);
  await assert.rejects(open(key, { ...envelope, data: "AAAA" }));
  const wrongKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  await assert.rejects(open(wrongKey, envelope));
});

test("browser V2 transport produces a valid integer timestamp with server clock synchronization", async () => {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const previous = process.env.API_V2_PRIVATE_KEY;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  process.env.API_V2_PRIVATE_KEY = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://erp.test" } } });
  try {
    const transport: typeof fetch = async (input, init) => {
      if (String(input) === "/api/v2/key") {
        // Fractional time deterministically exercises the high-resolution clock path.
        return Response.json(publicJwk(), { headers: { "X-V2-Server-Time": String(Date.now() + 0.5) } });
      }
      return handleV2(new Request(new URL(String(input), "https://erp.test"), init));
    };
    const response = await v2Fetch("/api/nonexistent", undefined, transport);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "API not found" });
  } finally {
    if (previous === undefined) delete process.env.API_V2_PRIVATE_KEY;
    else process.env.API_V2_PRIVATE_KEY = previous;
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("V2 rejects plaintext and cross-origin requests, and encrypts routing errors", async () => {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const previous = process.env.API_V2_PRIVATE_KEY;
  process.env.API_V2_PRIVATE_KEY = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  try {
    const plain = await handleV2(new Request("https://erp.test/api/v2", { method: "POST", body: '{}' }));
    assert.equal(plain.status, 400);
    assert.equal((await plain.json()).code, "V2_ENVELOPE_INVALID");
    assert.equal((await handleV2(new Request("https://erp.test/api/v2", { method: "POST", headers: { origin: "https://other.test" }, body: '{}' }))).status, 403);
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const wrapped = publicEncrypt({ key: pair.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(await crypto.subtle.exportKey("raw", key)));
    const payload = { path: "/api/nonexistent", method: "GET", contentType: null, body: null, timestamp: Date.now(), nonce: crypto.randomUUID() };
    const envelope = { ...await seal(key, payload), key: toBase64(wrapped) };
    const response = await handleV2(new Request("https://erp.test/api/v2", { method: "POST", body: JSON.stringify(envelope) }));
    assert.equal(response.headers.get("x-api-encryption"), "v2");
    const decoded = await open(key, await response.json()) as { status: number };
    assert.equal(decoded.status, 404);
    const expired = { ...await seal(key, { ...payload, timestamp: Date.now() - 120_000 }), key: envelope.key };
    const stale = await handleV2(new Request("https://erp.test/api/v2", { method: "POST", body: JSON.stringify(expired) }));
    assert.equal(stale.status, 400);
    assert.equal((await stale.json()).code, "V2_REQUEST_EXPIRED");
    const tampered = await handleV2(new Request("https://erp.test/api/v2", { method: "POST", body: JSON.stringify({ ...envelope, data: "AAAA" }) }));
    assert.equal((await tampered.json()).code, "V2_DECRYPT_FAILED");
  } finally {
    if (previous === undefined) delete process.env.API_V2_PRIVATE_KEY;
    else process.env.API_V2_PRIVATE_KEY = previous;
  }
});
