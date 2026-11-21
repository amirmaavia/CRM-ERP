import { secureRoute } from "@/lib/http/secure-route";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/http/api";
import { reportDataSchema } from "@/lib/contracts/reports";

async function handleGET(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const u = new URL(request.url);
  const from = u.searchParams.get("from") ? new Date(u.searchParams.get("from")!) : new Date(new Date().getFullYear(), 0, 1);
  const to = u.searchParams.get("to") ? new Date(`${u.searchParams.get("to")}T23:59:59.999`) : new Date();

  const invoiceWhere: Prisma.InvoiceWhereInput = { userId, issueDate: { gte: from, lte: to }, status: { not: InvoiceStatus.VOID } };

  const [invoices, expenses, contacts, suppliers, products, payments, wonDeals] = await prisma.$transaction([
    prisma.invoice.findMany({ where: invoiceWhere, include: { contact: { select: { firstName: true, lastName: true } }, items: { include: { product: true } } }, orderBy: { issueDate: "desc" } }),
    prisma.expense.findMany({ where: { userId, expenseDate: { gte: from, lte: to } }, orderBy: { expenseDate: "desc" } }),
    prisma.contact.findMany({ where: { userId, currentBalance: { gt: 0 } }, select: { id: true, firstName: true, lastName: true, currentBalance: true, invoices: { where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } }, select: { dueDate: true, total: true, paidAmount: true } } }, orderBy: { currentBalance: "desc" } }),
    prisma.supplier.findMany({ where: { userId, currentBalance: { gt: 0 } }, select: { id: true, name: true, currentBalance: true }, orderBy: { currentBalance: "desc" } }),
    prisma.product.findMany({ where: { userId, active: true }, select: { id: true, name: true, sku: true, currentQuantity: true, minimumStock: true, purchasePrice: true } }),
    prisma.payment.findMany({ where: { userId, paymentDate: { gte: from, lte: to } }, include: { contact: { select: { firstName: true, lastName: true } }, supplier: { select: { name: true } } }, orderBy: { paymentDate: "desc" } }),
    prisma.deal.findMany({ where: { userId, stage: "WON", updatedAt: { gte: from, lte: to } }, include: { owner: { select: { name: true } } } }),
  ]);

  const revenue = invoices.reduce((s, x) => s + Number(x.total), 0);
  const cogs = invoices.reduce((s, x) => s + x.items.reduce((v, i) => v + Number(i.unitCost) * Number(i.quantity), 0), 0);
  const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const now = Date.now();

  const aging = { days0to30: 0, days31to60: 0, days60plus: 0 };
  for (const customer of contacts) {
    for (const invoice of customer.invoices) {
      const balance = Number(invoice.total.sub(invoice.paidAmount));
      const daysOverdue = invoice.dueDate ? Math.floor((now - new Date(invoice.dueDate).getTime()) / 86400000) : 0;
      if (daysOverdue <= 30) aging.days0to30 += balance;
      else if (daysOverdue <= 60) aging.days31to60 += balance;
      else aging.days60plus += balance;
    }
  }

  const topProducts = invoices
    .flatMap((inv) => inv.items.map((i) => ({ name: i.product?.name ?? "Unknown", revenue: Number(i.lineTotal), qty: Number(i.quantity) })))
    .reduce((acc, item) => {
      const existing = acc.find((a) => a.name === item.name);
      if (existing) { existing.revenue += item.revenue; existing.qty += item.qty; }
      else acc.push(item);
      return acc;
    }, [] as { name: string; revenue: number; qty: number }[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const profitLoss = {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    expenses: expenseTotal,
    netProfit: revenue - cogs - expenseTotal,
  };
  const receivables = contacts.map((contact) => ({
    customer: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    balance: Number(contact.currentBalance),
  }));
  const payables = suppliers.map((supplier) => ({
    supplier: supplier.name,
    balance: Number(supplier.currentBalance),
  }));
  const stockValuation = products.map((product) => ({
    product: product.name,
    sku: product.sku,
    quantity: Number(product.currentQuantity),
    unitCost: Number(product.purchasePrice),
    value: Number(product.currentQuantity) * Number(product.purchasePrice),
  }));
  const sales = invoices.map((invoice) => ({
    invoice: invoice.number,
    date: invoice.issueDate,
    customer: [invoice.contact.firstName, invoice.contact.lastName].filter(Boolean).join(" "),
    status: invoice.status,
    total: Number(invoice.total),
    paid: Number(invoice.paidAmount),
    balance: Number(invoice.total) - Number(invoice.paidAmount),
  }));
  const cashBook = payments.map((payment) => ({
    payment: payment.number,
    date: payment.paymentDate,
    party: payment.contact
      ? [payment.contact.firstName, payment.contact.lastName].filter(Boolean).join(" ")
      : payment.supplier?.name ?? "—",
    direction: payment.direction,
    method: payment.method,
    amount: Number(payment.amount),
  }));
  const staffPerformance = Array.from(
    wonDeals.reduce((staff, deal) => {
      const owner = deal.owner?.name ?? "Unassigned";
      const current = staff.get(owner) ?? { staff: owner, wonDeals: 0, value: 0 };
      current.wonDeals += 1;
      current.value += Number(deal.value);
      staff.set(owner, current);
      return staff;
    }, new Map<string, { staff: string; wonDeals: number; value: number }>()).values(),
  ).sort((a, b) => b.value - a.value);
  const stockValue = stockValuation.reduce((sum, product) => sum + product.value, 0);

  const reportData = reportDataSchema.parse({
    profitLoss,
    aging,
    receivables,
    payables,
    stockValuation,
    stockValue,
    sales,
    cashBook,
    staffPerformance,
  });

  return NextResponse.json({
    ...reportData,
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    expenseTotal,
    netProfit: revenue - cogs - expenseTotal,
    topProducts,
    lowStock: products.filter((p) => p.currentQuantity.lte(p.minimumStock)).slice(0, 10),
    arTotal: contacts.reduce((sum, c) => sum + Number(c.currentBalance), 0),
    apTotal: suppliers.reduce((sum, s) => sum + Number(s.currentBalance), 0),
    paymentsReceived: payments.filter((p) => p.direction === "IN").reduce((sum, p) => sum + Number(p.amount), 0),
    paymentsMade: payments.filter((p) => p.direction === "OUT").reduce((sum, p) => sum + Number(p.amount), 0),
    wonDealsCount: wonDeals.length,
    wonDealsValue: wonDeals.reduce((sum, d) => sum + Number(d.value), 0),
  });
}

export const GET = secureRoute("reports.read", handleGET);
