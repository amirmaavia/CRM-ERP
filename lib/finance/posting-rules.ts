import { InvoiceStatus, Prisma, PurchaseOrderStatus } from "@prisma/client";

export class PostingError extends Error {}

export function allocationPaidAmount(total: Prisma.Decimal, paid: Prisma.Decimal, amount: Prisma.Decimal) {
  if (amount.lte(0)) throw new PostingError("Allocation must be positive");
  if (amount.gt(total.sub(paid))) throw new PostingError("Allocation exceeds outstanding balance");
  return paid.add(amount);
}

export function supplierPaymentUpdate(purchase: { total: Prisma.Decimal; paidAmount: Prisma.Decimal; status: PurchaseOrderStatus }, amount: Prisma.Decimal) {
  if (purchase.status === PurchaseOrderStatus.CANCELLED) throw new PostingError("Cannot pay a cancelled purchase");
  // Receiving goods and settling money are separate operations.
  return { paidAmount: allocationPaidAmount(purchase.total, purchase.paidAmount, amount) };
}

export function customerPaymentUpdate(invoice: { total: Prisma.Decimal; paidAmount: Prisma.Decimal; status: InvoiceStatus }, amount: Prisma.Decimal) {
  if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.DRAFT) throw new PostingError("Only posted invoices can receive payments");
  const paidAmount = allocationPaidAmount(invoice.total, invoice.paidAmount, amount);
  return { paidAmount, status: paidAmount.gte(invoice.total) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID };
}

export function assertInvoiceStock(
  products: { id: string; name: string; currentQuantity: Prisma.Decimal }[],
  items: { productId: string; quantity: number }[],
) {
  const totals = new Map<string, Prisma.Decimal>();
  for (const item of items) totals.set(item.productId, (totals.get(item.productId) ?? new Prisma.Decimal(0)).add(item.quantity));
  for (const [id, quantity] of totals) {
    const product = products.find((candidate) => candidate.id === id);
    if (!product) throw new PostingError("One or more products are unavailable");
    if (product.currentQuantity.lt(quantity)) throw new PostingError(`Insufficient stock for ${product.name}. Available: ${product.currentQuantity}`);
  }
}
