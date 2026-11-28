import assert from "node:assert/strict";
import { test } from "node:test";
import { InvoiceStatus, Prisma, PurchaseOrderStatus } from "@prisma/client";
import { allocationPaidAmount, assertInvoiceStock, customerPaymentUpdate, supplierPaymentUpdate } from "../lib/finance/posting-rules";

const decimal = (value: string | number) => new Prisma.Decimal(value);

test("paying a supplier preserves every receiving state", () => {
  for (const status of Object.values(PurchaseOrderStatus).filter((value) => value !== PurchaseOrderStatus.CANCELLED)) {
    const purchase = { status, total: decimal(100), paidAmount: decimal(20) };
    const partial = supplierPaymentUpdate(purchase, decimal(30));
    assert.equal(partial.paidAmount.toString(), "50");
    assert.equal({ ...purchase, ...partial }.status, status);
    const full = supplierPaymentUpdate(purchase, decimal(80));
    assert.equal(full.paidAmount.toString(), "100");
    assert.equal({ ...purchase, ...full }.status, status);
  }
});

test("supplier payments reject overpayment and cancelled purchases", () => {
  const purchase = { status: PurchaseOrderStatus.RECEIVED, total: decimal(100), paidAmount: decimal(90) };
  assert.throws(() => supplierPaymentUpdate(purchase, decimal(11)), /outstanding balance/);
  assert.throws(() => supplierPaymentUpdate({ ...purchase, status: PurchaseOrderStatus.CANCELLED }, decimal(1)), /cancelled/);
});

test("customer payments settle posted invoices and reject void or draft invoices", () => {
  const invoice = { status: InvoiceStatus.UNPAID, total: decimal(100), paidAmount: decimal(0) };
  const partial = customerPaymentUpdate(invoice, decimal(40));
  assert.equal(partial.status, InvoiceStatus.PARTIALLY_PAID);
  assert.equal(customerPaymentUpdate({ ...invoice, ...partial }, decimal(60)).status, InvoiceStatus.PAID);
  for (const status of [InvoiceStatus.VOID, InvoiceStatus.DRAFT]) {
    assert.throws(() => customerPaymentUpdate({ ...invoice, status }, decimal(10)), /posted invoices/);
  }
});

test("allocation arithmetic handles decimal amounts without binary rounding and rejects nonpositive values", () => {
  assert.equal(allocationPaidAmount(decimal("0.3"), decimal("0.1"), decimal("0.2")).toString(), "0.3");
  for (const amount of [0, -1]) assert.throws(() => allocationPaidAmount(decimal(100), decimal(0), decimal(amount)), /positive/);
});

test("invoice stock checks combine repeated product lines", () => {
  const products = [{ id: "p1", name: "Cable", currentQuantity: decimal(10) }];
  assert.throws(() => assertInvoiceStock(products, [{ productId: "p1", quantity: 6 }, { productId: "p1", quantity: 5 }]), /Insufficient stock/);
  assert.doesNotThrow(() => assertInvoiceStock(products, [{ productId: "p1", quantity: 6 }, { productId: "p1", quantity: 4 }]));
  assert.throws(() => assertInvoiceStock(products, [{ productId: "missing", quantity: 1 }]), /unavailable/);
});
