import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext, requireApiPermission, verifyOwnership } from "@/lib/http/api";

type Entry = {
  date: Date;
  order: number;
  reference: string;
  description: string;
  transactionType: string;
  saleDebit: number;
  receiptCredit: number;
  purchaseCredit: number;
  paymentDebit: number;
};

async function handleGET(request: Request, { params }: { params: { id: string } }) {
  const access = await requireApiPermission("ledgers.read");
  if (access.error) return access.error;
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined;
  const to = url.searchParams.get("to") ? new Date(`${url.searchParams.get("to")}T23:59:59.999`) : undefined;

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { contacts: { select: { id: true, firstName: true, lastName: true, currentBalance: true } }, supplierProfile: { select: { id: true, openingBalance: true, currentBalance: true } } },
  });

  try {
    verifyOwnership(company, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Company not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contactIds = company.contacts.map((contact) => contact.id);
  const supplierId = company.supplierProfile?.id;

  const [invoices, receipts, purchases, supplierPayments, settings] = await prisma.$transaction([
    prisma.invoice.findMany({
      where: { contactId: { in: contactIds }, userId, status: { not: "VOID" }, ...(from || to ? { issueDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.payment.findMany({ where: { contactId: { in: contactIds }, userId, direction: "IN", ...(from || to ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) } }),
    prisma.purchaseOrder.findMany({
      where: { supplierId: supplierId ?? "__none__", userId, status: { in: ["PARTIALLY_RECEIVED", "RECEIVED"] }, ...(from || to ? { orderDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
    prisma.payment.findMany({ where: { supplierId: supplierId ?? "__none__", userId, direction: "OUT", ...(from || to ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) } }),
    prisma.companySetting.findUnique({ where: { userId }, select: { companyName: true, address: true, phone: true, email: true, taxNumber: true, currency: true, watermarkText: true } }),
  ]);

  const entries: Entry[] = [];
  for (const invoice of invoices)
    entries.push({
      date: invoice.issueDate,
      order: 1,
      reference: invoice.number,
      description: `${invoice.type === "CASH_SALE" ? "Cash sale" : "Credit sale"}: ${invoice.items.map((item) => `${item.product.name} x ${item.quantity}`).join(", ")}`,
      transactionType: invoice.type,
      saleDebit: Number(invoice.total),
      receiptCredit: 0,
      purchaseCredit: 0,
      paymentDebit: 0,
    });
  for (const payment of receipts)
    entries.push({
      date: payment.paymentDate,
      order: 2,
      reference: payment.number,
      description: `Customer receipt (${payment.method.replaceAll("_", " ")})${payment.reference ? ` - ${payment.reference}` : ""}`,
      transactionType: "CUSTOMER_PAYMENT",
      saleDebit: 0,
      receiptCredit: Number(payment.amount),
      purchaseCredit: 0,
      paymentDebit: 0,
    });
  for (const purchase of purchases) {
    const receivedTotal = purchase.items.reduce((sum, item) => {
      const base = Number(item.receivedQuantity) * Number(item.unitPrice);
      return sum + base + base * Number(item.taxRate) / 100;
    }, 0);
    entries.push({
      date: purchase.orderDate,
      order: 1,
      reference: purchase.number,
      description: `${purchase.type === "CASH_PURCHASE" ? "Cash purchase" : "Credit purchase"}: ${purchase.items.map((item) => `${item.product.name} x ${item.receivedQuantity}`).join(", ")}`,
      transactionType: purchase.type,
      saleDebit: 0,
      receiptCredit: 0,
      purchaseCredit: receivedTotal,
      paymentDebit: 0,
    });
  }
  for (const payment of supplierPayments)
    entries.push({
      date: payment.paymentDate,
      order: 2,
      reference: payment.number,
      description: `Vendor payment (${payment.method.replaceAll("_", " ")})${payment.reference ? ` - ${payment.reference}` : ""}`,
      transactionType: "SUPPLIER_PAYMENT",
      saleDebit: 0,
      receiptCredit: 0,
      purchaseCredit: 0,
      paymentDebit: Number(payment.amount),
    });

  entries.sort((left, right) => left.date.getTime() - right.date.getTime() || left.order - right.order);
  let receivableRunning = 0;
  let payableRunning = Number(company.supplierProfile?.openingBalance ?? 0);
  const ledger = entries.map((entry) => {
    receivableRunning += entry.saleDebit - entry.receiptCredit;
    payableRunning += entry.purchaseCredit - entry.paymentDebit;
    return { ...entry, receivableRunning, payableRunning, netRunning: receivableRunning - payableRunning };
  });

  const receivable = company.contacts.reduce((sum, contact) => sum + Number(contact.currentBalance), 0);
  const payable = Number(company.supplierProfile?.currentBalance ?? 0);

  return NextResponse.json({
    company: { id: company.id, name: company.name, email: company.email, phone: company.phone, address: company.address, customerContactIds: contactIds, supplierId },
    business: settings,
    summary: {
      totalSales: entries.reduce((sum, entry) => sum + entry.saleDebit, 0),
      customerReceipts: entries.reduce((sum, entry) => sum + entry.receiptCredit, 0),
      totalPurchases: entries.reduce((sum, entry) => sum + entry.purchaseCredit, 0),
      vendorPayments: entries.reduce((sum, entry) => sum + entry.paymentDebit, 0),
      receivable,
      payable,
      netBalance: receivable - payable,
    },
    ledger,
  });
}

export const GET = secureRoute("ledgers.read", handleGET);
