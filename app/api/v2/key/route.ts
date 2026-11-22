import { publicJwk } from "@/lib/http/v2-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  try { return Response.json(publicJwk(), { headers: { "Cache-Control": "no-store", "X-V2-Server-Time": String(Date.now()) } }); }
  catch { return Response.json({ error: "V2 encryption is not configured" }, { status: 503 }); }
}
