import { createPrivateKey, createPublicKey, privateDecrypt, constants } from "node:crypto";
import { z } from "zod";
import { fromBase64, open, seal, toBase64, type Envelope } from "./v2-crypto";
import { v2Routes, type Handler } from "./v2-routes";

function privateKey() {
  const pem = process.env.API_V2_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!pem) throw new Error("API_V2_PRIVATE_KEY is required");
  return createPrivateKey(pem);
}
export function publicJwk() {
  return createPublicKey(privateKey()).export({ format: "jwk" });
}
const payloadSchema = z.object({
  path: z.string().max(8192), method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  contentType: z.string().max(256).nullable(), body: z.string().nullable(),
  timestamp: z.number().int(), nonce: z.string().uuid(),
});

export async function handleV2(request: Request): Promise<Response> {
  // Reject cross-origin browser mutations before decrypting or dispatching.
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Forbidden origin" }, { status: 403 });
  let key: CryptoKey;
  let payload: z.infer<typeof payloadSchema>;
  try {
    const raw = await request.text();
    if (raw.length > 24 * 1024 * 1024) return Response.json({ error: "Payload too large" }, { status: 413 });
    const envelope = JSON.parse(raw) as Envelope & { key: string };
    const secret = privateDecrypt({ key: privateKey(), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, fromBase64(envelope.key));
    key = await crypto.subtle.importKey("raw", Uint8Array.from(secret), "AES-GCM", false, ["encrypt", "decrypt"]);
    payload = payloadSchema.parse(await open(key, envelope));
    if (Math.abs(Date.now() - payload.timestamp) > 60_000) throw new Error("Expired request");
  } catch {
    return Response.json({ error: "Invalid encrypted V2 request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  let response: Response;
  try {
    const url = new URL(payload.path, request.url);
    if (!payload.path.startsWith("/api/") || url.origin !== new URL(request.url).origin || url.hash) throw new Error("Invalid API path");
    let matched: { load: () => Promise<Record<string, unknown>>; id: string } | undefined;
    for (const route of v2Routes) {
      const pattern = route.path.split("/");
      const parts = url.pathname.split("/");
      if (pattern.length === parts.length && pattern.every((part, i) => part === "[id]" || part === parts[i])) {
        matched = { load: route.load, id: pattern.includes("[id]") ? decodeURIComponent(parts[pattern.indexOf("[id]")]) : "" };
        break;
      }
    }
    if (!matched) response = Response.json({ error: "API not found" }, { status: 404 });
    else {
      const handler = (await matched.load())[payload.method] as Handler | undefined;
      if (!handler) response = Response.json({ error: "Method not allowed" }, { status: 405 });
      else {
        const headers = new Headers();
        for (const name of ["cookie", "authorization"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
        if (payload.contentType) headers.set("content-type", payload.contentType);
        const inner = new Request(url, { method: payload.method, headers, body: payload.body === null || ["GET", "HEAD"].includes(payload.method) ? undefined : fromBase64(payload.body) });
        response = await handler(inner, { params: { id: matched.id } });
      }
    }
  } catch {
    response = Response.json({ error: "Unable to process V2 request" }, { status: 500 });
  }
  const headers = new Headers({ "Cache-Control": "no-store", "X-API-Encryption": "v2" });
  for (const cookie of response.headers.getSetCookie()) headers.append("set-cookie", cookie);
  const safeHeaders = Array.from(response.headers.entries()).filter(([name]) => !["set-cookie", "content-length", "content-encoding", "transfer-encoding"].includes(name));
  return Response.json(await seal(key, { status: response.status, headers: safeHeaders, body: toBase64(new Uint8Array(await response.arrayBuffer())) }), { headers });
}
