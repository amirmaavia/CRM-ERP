import { fromBase64, open, seal, toBase64 } from "./v2-crypto";

// A fresh AES key per request; the RSA public key is safe to expose to clients.
export async function v2Fetch(input: RequestInfo | URL, init?: RequestInit, transport: typeof fetch = fetch): Promise<Response> {
  const request = new Request(new URL(input instanceof Request ? input.url : String(input), window.location.origin), input instanceof Request ? input : undefined);
  const original = new Request(request, init);
  if (new URL(original.url).origin !== window.location.origin) throw new Error("V2 requires a same-origin API");
  const keyResponse = await transport("/api/v2/key", { cache: "no-store", signal: original.signal });
  if (!keyResponse.ok) throw new Error("V2 encryption is unavailable");
  // Base freshness on server time: an incorrect device clock must not break V2.
  const serverTime = Number(keyResponse.headers.get("x-v2-server-time"));
  const receivedAt = performance.now();
  const publicKey = await crypto.subtle.importKey("jwk", await keyResponse.json(), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["wrapKey"]);
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const wrappedKey = await crypto.subtle.wrapKey("raw", key, publicKey, "RSA-OAEP");
  const url = new URL(original.url);
  const envelope = await seal(key, {
    path: url.pathname + url.search, method: original.method,
    contentType: original.headers.get("content-type"),
    body: original.body ? toBase64(new Uint8Array(await original.arrayBuffer())) : null,
    timestamp: Number.isFinite(serverTime) && serverTime > 0 ? Math.floor(serverTime + (performance.now() - receivedAt)) : Date.now(), nonce: crypto.randomUUID(),
  });
  const response = await transport("/api/v2", {
    method: "POST", credentials: original.credentials, signal: original.signal, cache: "no-store",
    headers: { "Content-Type": "application/json", ...(original.headers.has("authorization") ? { Authorization: original.headers.get("authorization")! } : {}) },
    body: JSON.stringify({ ...envelope, key: toBase64(new Uint8Array(wrappedKey)) }),
  });
  if (response.headers.get("x-api-encryption") !== "v2") {
    const failure = await response.json().catch(() => null);
    const code = failure?.code;
    throw new Error(typeof code === "string" && /^V2_[A-Z_]+$/.test(code) ? `V2 request failed. Reference: ${code}` : "Invalid V2 response");
  }
  const decoded = await open(key, await response.json()) as { body: string; status: number; headers: [string, string][] };
  return new Response([204, 205, 304].includes(decoded.status) || original.method === "HEAD" ? null : fromBase64(decoded.body), { status: decoded.status, headers: decoded.headers });
}
