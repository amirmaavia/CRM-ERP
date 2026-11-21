// Shared Web Crypto protocol. No private server keys belong in this module.
export const V2_AAD = new TextEncoder().encode("erp-api-v2");
export function toBase64(bytes: Uint8Array): string {
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
export type Envelope = { version: 2; iv: string; data: string };
export async function seal(key: CryptoKey, value: unknown): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: V2_AAD }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { version: 2, iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}
export async function open(key: CryptoKey, envelope: Envelope): Promise<unknown> {
  if (envelope.version !== 2 || typeof envelope.iv !== "string" || typeof envelope.data !== "string") throw new Error("Invalid encrypted envelope");
  const iv = fromBase64(envelope.iv);
  if (iv.length !== 12) throw new Error("Invalid IV");
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: V2_AAD }, key, fromBase64(envelope.data));
  return JSON.parse(new TextDecoder().decode(data));
}
