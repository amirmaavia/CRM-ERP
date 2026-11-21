import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext, requireApiPermission } from "@/lib/http/api";

async function handleGET(request: Request) {
  const access = await requireApiPermission("ledgers.read");
  if (access.error) return access.error;
  const auth = await getTenantContext();
  const { userId } = auth;
  const search = new URL(request.url).searchParams.get("search")?.trim();
  const companies = await prisma.company.findMany({
    where: { userId, ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }] } : {}) },
    include: { contacts: { select: { id: true, currentBalance: true } }, supplierProfile: { select: { id: true, currentBalance: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json(
    companies.map((company) => {
      const receivable = company.contacts.reduce((sum, contact) => sum + Number(contact.currentBalance), 0);
      const payable = Number(company.supplierProfile?.currentBalance ?? 0);
      return {
        ...company,
        contacts: company.contacts.map(({ id }) => ({ id })),
        supplierId: company.supplierProfile?.id,
        receivable,
        payable,
        netBalance: receivable - payable,
        roles: [company.contacts.length ? "CUSTOMER" : null, company.supplierProfile ? "VENDOR" : null].filter(Boolean),
      };
    }),
  );
}

async function handlePOST(request: Request) {
  const access = await requireApiPermission("ledgers.write");
  if (access.error) return access.error;
  const auth = await getTenantContext();
  const { userId } = auth;
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  if (!body.isCustomer && !body.isVendor) return NextResponse.json({ error: "Select customer, vendor, or both" }, { status: 400 });

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({ data: { name, email: body.email || null, phone: body.phone || null, address: body.address || null, userId } });
    if (body.isCustomer) await tx.contact.create({ data: { firstName: name, email: body.email || null, phone: body.phone || null, address: body.address || null, companyId: created.id, tags: ["Company Account"], userId } });
    if (body.isVendor) await tx.supplier.create({ data: { name, contactPerson: body.contactPerson || null, email: body.email || null, phone: body.phone || null, address: body.address || null, companyId: created.id, userId } });
    return created;
  });
  return NextResponse.json(company, { status: 201 });
}

export const GET = secureRoute("ledgers.read", handleGET);

export const POST = secureRoute("ledgers.write", handlePOST);
