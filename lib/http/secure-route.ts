import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getApiSession } from "@/lib/http/api";

type Context = { params: { id: string } };
type Handler = (request: Request, context: Context) => Promise<Response>;

export function secureRoute(permission: string, handler: Handler) {
  return async (request: Request, context: Context) => {
    const session = await getApiSession();
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (permission && !session.user.permissions.includes(permission)) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    const tenantId = session.user.tenantId;
    try {
      if (!["GET", "HEAD"].includes(request.method) && request.headers.get("content-type")?.includes("application/json")) {
        const body = await request.clone().json();
        const check = async (value: unknown): Promise<void> => {
          if (!value || typeof value !== "object") return;
          if (Array.isArray(value)) { for (const item of value) await check(item); return; }
          for (const [key, id] of Object.entries(value)) {
            if (typeof id === "string" && id) {
              const where = { id, userId: tenantId };
              let exists: unknown = true;
              switch (key) {
                case "companyId": exists = await prisma.company.findFirst({ where, select: { id: true } }); break;
                case "contactId": exists = await prisma.contact.findFirst({ where, select: { id: true } }); break;
                case "leadId": exists = await prisma.lead.findFirst({ where, select: { id: true } }); break;
                case "dealId": exists = await prisma.deal.findFirst({ where, select: { id: true } }); break;
                case "productId": exists = await prisma.product.findFirst({ where, select: { id: true } }); break;
                case "categoryId": exists = await prisma.category.findFirst({ where, select: { id: true } }); break;
                case "supplierId": exists = await prisma.supplier.findFirst({ where, select: { id: true } }); break;
                case "warehouseId": exists = await prisma.warehouse.findFirst({ where, select: { id: true } }); break;
                case "invoiceId": exists = await prisma.invoice.findFirst({ where, select: { id: true } }); break;
                case "purchaseOrderId": exists = await prisma.purchaseOrder.findFirst({ where, select: { id: true } }); break;
                case "assignedToId": case "ownerId": exists = await prisma.user.findFirst({ where: { id, status: "ACTIVE", OR: [{ id: tenantId }, { accountOwnerId: tenantId }] }, select: { id: true } }); break;
              }
              if (!exists) throw new Error("NOT_FOUND");
            }
            if (id && typeof id === "object") await check(id);
          }
        };
        await check(body);
      }
      const response = await handler(request, context);
      if (request.method !== "GET" || response.status >= 400) {
        await prisma.activityLog.create({ data: { userId: session.user.id, action: request.method === "POST" ? "CREATE" : request.method === "DELETE" ? "DELETE" : "UPDATE", entityType: "ApiRequest", description: `${request.method} ${new URL(request.url).pathname} (${response.status})`, newValues: { status: response.status } } }).catch(() => console.error("Request audit could not be persisted"));
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const status = message === "NOT_FOUND" ? 404 : message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : error instanceof SyntaxError ? 400 : 500;
      await prisma.activityLog.create({ data: { userId: session.user.id, action: "UPDATE", entityType: "ApiRequest", description: `${request.method} ${new URL(request.url).pathname} (${status})`, newValues: { status } } }).catch(() => console.error("Request audit could not be persisted"));
      return NextResponse.json({ error: status === 404 ? "Resource not found" : status === 403 ? "Permission denied" : status === 400 ? "Invalid request" : status === 401 ? "Authentication required" : "An unexpected error occurred" }, { status });
    }
  };
}
