import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/http/api";
import { getDashboardData } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

async function handleGET() {
  try {
    const auth = await getTenantContext();
    const dashboard = await getDashboardData({ id: auth.userId, actorId: auth.actorId, role: auth.role, permissions: auth.permissions });
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Dashboard query failed", error);
    return NextResponse.json({ error: "Dashboard data could not be loaded" }, { status: 500 });
  }
}
export const GET = secureRoute("", handleGET);
