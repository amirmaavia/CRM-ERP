import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import { requirePlatformAdmin } from "@/lib/http/api";

type ImportType = "companies" | "products" | "customers" | "leads" | "vendors" | "customer_ledger";
type Cell = string | number | boolean | null;
type Row = Record<string, Cell>;
type CheckedRow = { row: number; data: Row; errors: string[]; duplicate?: string };

const aliases: Record<ImportType, Record<string, string[]>> = {
  companies: { name: ["name", "company", "companyname", "businessname"], contactPerson: ["contactperson", "contact", "person"], email: ["email", "emailaddress"], phone: ["phone", "mobile", "telephone"], address: ["address", "location"], isCustomer: ["iscustomer", "customer", "sellto"], isVendor: ["isvendor", "vendor", "supplier", "buyfrom"] },
  products: { name: ["name", "product", "productname", "item"], sku: ["sku", "code", "itemcode", "productcode"], category: ["category", "categoryname"], unit: ["unit", "uom", "measure"], purchasePrice: ["purchaseprice", "cost", "costprice", "buyprice"], salePrice: ["saleprice", "sellingprice", "price"], taxRate: ["taxrate", "tax", "gst", "vat"], currentQuantity: ["currentquantity", "quantity", "qty", "openingstock", "stock"], minimumStock: ["minimumstock", "minstock", "reorderlevel"] },
  customers: { firstName: ["firstname", "first", "name", "customername"], lastName: ["lastname", "last", "surname"], company: ["company", "companyname", "business"], email: ["email", "emailaddress"], phone: ["phone", "mobile", "telephone"], address: ["address", "location"], tags: ["tags", "tag"] },
  leads: { firstName: ["firstname", "first", "name", "leadname"], lastName: ["lastname", "last", "surname"], company: ["company", "companyname", "business"], email: ["email", "emailaddress"], phone: ["phone", "mobile", "telephone"], source: ["source", "leadsource", "channel"], status: ["status", "leadstatus"] },
  vendors: { name: ["name", "vendor", "vendorname", "supplier", "suppliername"], contactPerson: ["contactperson", "contact", "person"], company: ["company", "companyname"], email: ["email", "emailaddress"], phone: ["phone", "mobile", "telephone"], address: ["address", "location"], openingBalance: ["openingbalance", "balance", "payable"] },
  customer_ledger: { customer: ["customer", "customername", "account", "accountname"], company: ["company", "companyname", "business"], email: ["email", "customeremail", "emailaddress"], date: ["date", "transactiondate", "invoicedate", "paymentdate"], transactionType: ["transactiontype", "type", "entrytype"], reference: ["reference", "referenceno", "voucher", "voucherno", "number", "invoicenumber"], invoiceReference: ["invoicereference", "againstinvoice", "allocateinvoice"], productSku: ["productsku", "sku", "itemcode", "productcode"], quantity: ["quantity", "qty"], rate: ["rate", "unitprice", "price"], taxRate: ["taxrate", "tax", "gst", "vat"], discount: ["discount", "disc"], debit: ["debit", "saleamount", "invoiceamount"], credit: ["credit", "paid", "paymentamount", "receiptamount"], paymentMethod: ["paymentmethod", "method", "mode"], notes: ["notes", "description", "remarks"] },
};

function key(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function clean(value: unknown): Cell { if (value === undefined || value === null) return null; if (typeof value === "number" || typeof value === "boolean") return value; return String(value).trim(); }
function bool(value: Cell, fallback = false) { if (value === null || value === "") return fallback; return ["true", "yes", "y", "1", "customer", "vendor", "supplier"].includes(String(value).toLowerCase()); }
function number(value: Cell, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function ledgerType(value: Cell) { const normalized = String(value || "").toUpperCase().replace(/[\s-]+/g, "_"); if (["SALE", "INVOICE", "DEBIT", "CREDIT_SALE"].includes(normalized)) return "CREDIT_SALE"; if (["CASH_SALE", "CASHSALE"].includes(normalized)) return "CASH_SALE"; if (["PAYMENT", "RECEIPT", "CREDIT", "CUSTOMER_PAYMENT"].includes(normalized)) return "PAYMENT"; return null; }
function parsedDate(value: Cell) { const date = new Date(String(value || "")); return Number.isNaN(date.getTime()) ? null : date; }
function identifier(data: Row, type: ImportType) { if (type === "products") return data.sku; if (type === "companies" || type === "vendors") return data.name; if (type === "customer_ledger") return data.reference; return data.email; }

function normalize(raw: Record<string, unknown>, type: ImportType): Row {
  const source = new Map(Object.entries(raw).map(([header, value]) => [key(header), clean(value)]));
  const row: Row = {};
  for (const [field, options] of Object.entries(aliases[type])) {
    const match = options.find((option) => source.has(option));
    row[field] = match ? source.get(match) ?? null : null;
  }
  return row;
}

function validate(data: Row, type: ImportType) {
  const errors: string[] = [];
  if (type === "customer_ledger") {
    if (!data.email && !data.company && !data.customer) errors.push("Customer email, company, or customer name is required");
    if (!parsedDate(data.date)) errors.push("Valid date is required");
    const entryType = ledgerType(data.transactionType);
    if (!entryType) errors.push("Type must be SALE, CASH_SALE, or PAYMENT");
    if (!data.reference) errors.push("Unique reference is required");
    if (entryType === "CREDIT_SALE" || entryType === "CASH_SALE") {
      if (!data.productSku) errors.push("Product SKU is required for a sale");
      if (number(data.quantity) <= 0) errors.push("Quantity must be greater than zero");
      if (number(data.rate) < 0) errors.push("Rate cannot be negative");
    } else if (number(data.credit) <= 0) errors.push("Credit/payment amount must be greater than zero");
  } else if (type === "products") {
    if (!data.name) errors.push("Product name is required");
    if (!data.sku) errors.push("SKU is required");
    if (!data.unit) errors.push("Unit is required");
    if (data.purchasePrice === null || Number.isNaN(Number(data.purchasePrice))) errors.push("Valid purchase price is required");
    if (data.salePrice === null || Number.isNaN(Number(data.salePrice))) errors.push("Valid sale price is required");
  } else if (type === "companies" || type === "vendors") {
    if (!data.name) errors.push("Name is required");
  } else if (!data.firstName) errors.push("Name/first name is required");
  if (data.email && !/^\S+@\S+\.\S+$/.test(String(data.email))) errors.push("Email is invalid");
  if (type === "leads" && data.status && !["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].includes(String(data.status).toUpperCase().replace(/\s+/g, "_"))) errors.push("Lead status is invalid");
  return errors;
}

function detect(headers: string[]): ImportType | null {
  const normalized = headers.map(key);
  if (normalized.some((header) => ["transactiontype", "entrytype", "saleamount", "receiptamount", "customeremail"].includes(header)) && normalized.some((header) => ["debit", "credit", "reference", "voucherno"].includes(header))) return "customer_ledger";
  if (normalized.some((header) => ["sku", "itemcode", "productcode"].includes(header))) return "products";
  if (normalized.some((header) => ["leadsource", "source", "leadstatus"].includes(header))) return "leads";
  if (normalized.some((header) => ["openingbalance", "payable", "vendorname", "suppliername"].includes(header))) return "vendors";
  if (normalized.some((header) => ["iscustomer", "isvendor", "sellto", "buyfrom"].includes(header))) return "companies";
  if (normalized.some((header) => ["customername", "firstname"].includes(header))) return "customers";
  return null;
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestedType = form.get("type") as ImportType | null;
    const mode = form.get("mode") === "import" ? "import" : "preview";

    if (!(file instanceof File)) return NextResponse.json({ error: "Select an Excel or CSV file" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File exceeds the 5 MB limit" }, { status: 413 });
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Only .xlsx, .xls and .csv files are supported" }, { status: 400 });

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: "Workbook has no worksheets" }, { status: 400 });

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false });
    if (!rawRows.length) return NextResponse.json({ error: "The first worksheet contains no data" }, { status: 400 });
    if (rawRows.length > 1000) return NextResponse.json({ error: "Maximum 1,000 rows per import" }, { status: 400 });

    const type = requestedType && requestedType !== ("auto" as ImportType) ? requestedType : detect(Object.keys(rawRows[0]));
    if (!type || !aliases[type]) return NextResponse.json({ error: "Could not detect the data type. Select it manually." }, { status: 400 });

    const checked: CheckedRow[] = rawRows.map((raw, index) => ({ row: index + 2, data: normalize(raw, type), errors: validate(normalize(raw, type), type) }));
    const identifiers = checked.map((item) => String(identifier(item.data, type) || "").toLowerCase()).filter(Boolean);
    const repeats = new Set(identifiers.filter((value, index) => identifiers.indexOf(value) !== index));
    for (const item of checked) {
      const rowIdentifier = String(identifier(item.data, type) || "").toLowerCase();
      if (rowIdentifier && repeats.has(rowIdentifier)) item.errors.push("Duplicate row in workbook");
    }

    if (type === "products") {
      const existing = await prisma.product.findMany({ where: { sku: { in: checked.map((item) => String(item.data.sku || "")).filter(Boolean) } }, select: { sku: true } });
      const set = new Set(existing.map((item) => item.sku.toLowerCase()));
      for (const item of checked) if (set.has(String(item.data.sku).toLowerCase())) item.duplicate = "SKU already exists";
    }
    if (type === "companies") {
      const existing = await prisma.company.findMany({ where: { name: { in: checked.map((item) => String(item.data.name || "")).filter(Boolean) } }, select: { name: true } });
      const set = new Set(existing.map((item) => item.name.toLowerCase()));
      for (const item of checked) if (set.has(String(item.data.name).toLowerCase())) item.duplicate = "Company already exists";
    }
    if (type === "vendors") {
      const existing = await prisma.supplier.findMany({ where: { name: { in: checked.map((item) => String(item.data.name || "")).filter(Boolean) } }, select: { name: true } });
      const set = new Set(existing.map((item) => item.name.toLowerCase()));
      for (const item of checked) if (set.has(String(item.data.name).toLowerCase())) item.duplicate = "Vendor already exists";
    }

    if (type === "customer_ledger") {
      const emails = checked.map((item) => String(item.data.email || "")).filter(Boolean);
      const companies = checked.map((item) => String(item.data.company || "")).filter(Boolean);
      const names = checked.map((item) => String(item.data.customer || "")).filter(Boolean);
      const skus = checked.map((item) => String(item.data.productSku || "")).filter(Boolean);
      const references = checked.map((item) => String(item.data.reference || "")).filter(Boolean);

      const [contacts, products, invoices, payments] = await Promise.all([
        prisma.contact.findMany({ where: { OR: [{ email: { in: emails } }, { firstName: { in: names } }, { company: { name: { in: companies } } }] }, include: { company: { select: { name: true } } } }),
        prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } }),
        prisma.invoice.findMany({ where: { number: { in: references } }, select: { number: true } }),
        prisma.payment.findMany({ where: { number: { in: references } }, select: { number: true } }),
      ]);

      const productSet = new Set(products.map((item) => item.sku.toLowerCase()));
      const invoiceSet = new Set(invoices.map((item) => item.number.toLowerCase()));
      const paymentSet = new Set(payments.map((item) => item.number.toLowerCase()));

      for (const item of checked) {
        const email = String(item.data.email || "").toLowerCase();
        const company = String(item.data.company || "").toLowerCase();
        const customer = String(item.data.customer || "").toLowerCase();

        const match = contacts.some((contact) =>
          email ? contact.email?.toLowerCase() === email : company ? contact.company?.name.toLowerCase() === company : `${contact.firstName} ${contact.lastName || ""}`.trim().toLowerCase() === customer || contact.firstName.toLowerCase() === customer
        );
        if (!match) item.errors.push("Customer/company was not found; import customers/companies first");

        const entryType = ledgerType(item.data.transactionType);
        const reference = String(item.data.reference || "").toLowerCase();
        if ((entryType === "CREDIT_SALE" || entryType === "CASH_SALE") && !productSet.has(String(item.data.productSku || "").toLowerCase())) item.errors.push("Product SKU was not found; import products first");
        if (entryType === "PAYMENT" ? paymentSet.has(reference) : invoiceSet.has(reference)) item.duplicate = "Ledger reference already exists";
      }
    }

    const valid = checked.filter((item) => !item.errors.length && !item.duplicate);
    if (mode === "preview") return NextResponse.json({ fileName: file.name, sheetName, detectedType: type, totalRows: checked.length, validRows: valid.length, invalidRows: checked.length - valid.length, rows: checked.slice(0, 100) });
    if (!valid.length) return NextResponse.json({ error: "No valid, non-duplicate rows to import" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      for (const { data } of valid) {
        if (type === "customer_ledger") {
          const email = data.email ? String(data.email) : null;
          const companyName = data.company ? String(data.company) : null;
          const customerName = data.customer ? String(data.customer) : null;

          const contact = await tx.contact.findFirst({
            where: email ? { email } : companyName ? { company: { name: companyName } } : { OR: [{ firstName: customerName! }, { company: { name: customerName! } }] },
          });
          if (!contact) throw new Error(`Customer not found for ledger reference ${data.reference}`);

          const entryType = ledgerType(data.transactionType)!;
          const date = parsedDate(data.date)!;
          const reference = String(data.reference);
          const notes = data.notes ? String(data.notes) : null;

          if (entryType === "CREDIT_SALE" || entryType === "CASH_SALE") {
            const product = await tx.product.findUniqueOrThrow({ where: { userId_sku: { userId: contact.userId, sku: String(data.productSku) } } });
            const quantity = new Prisma.Decimal(number(data.quantity));
            const rate = new Prisma.Decimal(number(data.rate));
            const taxRate = new Prisma.Decimal(number(data.taxRate));
            const discount = new Prisma.Decimal(number(data.discount));
            const base = quantity.mul(rate);
            const calculated = base.sub(discount).add(base.sub(discount).mul(taxRate).div(100));
            const total = number(data.debit) > 0 ? new Prisma.Decimal(number(data.debit)) : calculated;
            const taxTotal = Prisma.Decimal.max(total.sub(base).add(discount), 0);
            const cash = entryType === "CASH_SALE";

            const invoice = await tx.invoice.create({
              data: {
                number: reference,
                contactId: contact.id,
                type: cash ? "CASH_SALE" : "CREDIT_SALE",
                status: cash ? "PAID" : "UNPAID",
                issueDate: date,
                dueDate: date,
                subtotal: base,
                taxTotal,
                discountTotal: discount,
                total,
                paidAmount: cash ? total : new Prisma.Decimal(0),
                notes,
                affectsStock: false,
                createdById: auth.session.user.id,
                userId: contact.userId,
                items: { create: { productId: product.id, quantity, unitPrice: rate, unitCost: product.purchasePrice, taxRate, discount, lineTotal: total } },
              },
            });

            await tx.contact.update({ where: { id: contact.id }, data: { currentBalance: { increment: total } } });
            if (cash) {
              await tx.payment.create({
                data: {
                  number: `${reference}-CASH`,
                  partyType: "CUSTOMER",
                  direction: "IN",
                  method: "CASH",
                  amount: total,
                  paymentDate: date,
                  contactId: contact.id,
                  createdById: auth.session.user.id,
                  userId: contact.userId,
                  notes: `Imported cash sale ${reference}`,
                  allocations: { create: { invoiceId: invoice.id, amount: total } },
                },
              });
              await tx.contact.update({ where: { id: contact.id }, data: { currentBalance: { decrement: total } } });
            }
          } else {
            const amount = new Prisma.Decimal(number(data.credit));
            const rawMethod = String(data.paymentMethod || "CASH").toUpperCase().replace(/[\s-]+/g, "_");
            const method = (["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"].includes(rawMethod) ? rawMethod : "OTHER") as "CASH" | "BANK_TRANSFER" | "CHEQUE" | "CARD" | "OTHER";

            let invoiceId: string | undefined;
            const invoiceReference = data.invoiceReference ? String(data.invoiceReference) : null;
            if (invoiceReference) {
              const invoice = await tx.invoice.findUnique({ where: { userId_number: { userId: contact.userId, number: invoiceReference } } });
              if (!invoice || invoice.contactId !== contact.id) throw new Error(`Invoice ${invoiceReference} not found for this customer`);
              const remaining = invoice.total.sub(invoice.paidAmount);
              if (amount.gt(remaining)) throw new Error(`Payment ${reference} exceeds invoice ${invoiceReference} balance`);
              const paid = invoice.paidAmount.add(amount);
              await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: paid, status: paid.gte(invoice.total) ? "PAID" : "PARTIALLY_PAID" } });
              invoiceId = invoice.id;
            }

            await tx.payment.create({
              data: {
                number: reference,
                partyType: "CUSTOMER",
                direction: "IN",
                method,
                amount,
                paymentDate: date,
                reference,
                contactId: contact.id,
                notes,
                createdById: auth.session.user.id,
                userId: contact.userId,
                allocations: invoiceId ? { create: { invoiceId, amount } } : undefined,
              },
            });
            await tx.contact.update({ where: { id: contact.id }, data: { currentBalance: { decrement: amount } } });
          }
          continue;
        }

        if (type === "companies") {
          const company = await tx.company.create({
            data: { name: String(data.name), email: data.email ? String(data.email) : null, phone: data.phone ? String(data.phone) : null, address: data.address ? String(data.address) : null, userId: auth.session.user.id },
          });
          const isCustomer = bool(data.isCustomer, true);
          const isVendor = bool(data.isVendor, true);
          if (isCustomer) await tx.contact.create({ data: { firstName: company.name, companyId: company.id, email: company.email, phone: company.phone, address: company.address, tags: ["Company Account"], userId: auth.session.user.id } });
          if (isVendor) await tx.supplier.create({ data: { name: company.name, companyId: company.id, contactPerson: data.contactPerson ? String(data.contactPerson) : null, email: company.email, phone: company.phone, address: company.address, userId: auth.session.user.id } });
        } else if (type === "products") {
          let categoryId: string | null = null;
          if (data.category) categoryId = (await tx.category.upsert({ where: { userId_name: { userId: auth.session.user.id, name: String(data.category) } }, update: {}, create: { name: String(data.category), userId: auth.session.user.id } })).id;
          await tx.product.create({
            data: {
              name: String(data.name),
              sku: String(data.sku),
              unit: String(data.unit),
              purchasePrice: new Prisma.Decimal(number(data.purchasePrice)),
              salePrice: new Prisma.Decimal(number(data.salePrice)),
              taxRate: new Prisma.Decimal(number(data.taxRate)),
              currentQuantity: new Prisma.Decimal(number(data.currentQuantity)),
              minimumStock: new Prisma.Decimal(number(data.minimumStock)),
              categoryId,
              userId: auth.session.user.id,
            },
          });
        } else if (type === "customers") {
          let companyId: string | null = null;
          if (data.company) companyId = (await tx.company.findFirst({ where: { name: String(data.company), userId: auth.session.user.id } }))?.id ?? null;
          await tx.contact.create({
            data: { firstName: String(data.firstName), lastName: data.lastName ? String(data.lastName) : null, email: data.email ? String(data.email) : null, phone: data.phone ? String(data.phone) : null, address: data.address ? String(data.address) : null, companyId, tags: data.tags ? String(data.tags).split(",").map((tag) => tag.trim()).filter(Boolean) : [], userId: auth.session.user.id },
          });
        } else if (type === "leads") {
          let companyId: string | null = null;
          if (data.company) companyId = (await tx.company.findFirst({ where: { name: String(data.company), userId: auth.session.user.id } }))?.id ?? null;
          await tx.lead.create({ data: { firstName: String(data.firstName), lastName: data.lastName ? String(data.lastName) : null, email: data.email ? String(data.email) : null, phone: data.phone ? String(data.phone) : null, source: data.source ? String(data.source) : null, status: data.status ? String(data.status).toUpperCase().replace(/\s+/g, "_") as "NEW" : "NEW", companyId, assignedToId: auth.session.user.id, userId: auth.session.user.id } });
        } else {
          await tx.supplier.create({ data: { name: String(data.name), contactPerson: data.contactPerson ? String(data.contactPerson) : null, email: data.email ? String(data.email) : null, phone: data.phone ? String(data.phone) : null, address: data.address ? String(data.address) : null, openingBalance: new Prisma.Decimal(number(data.openingBalance)), currentBalance: new Prisma.Decimal(number(data.openingBalance)), userId: auth.session.user.id } });
        }
      }
      await tx.activityLog.create({ data: { userId: auth.session.user.id, action: "CREATE", entityType: "ExcelImport", description: `Imported ${valid.length} ${type} rows from ${file.name}`, newValues: { type, rows: valid.length, skipped: checked.length - valid.length } } });
    });
    return NextResponse.json({ message: `Imported ${valid.length} ${type} records`, imported: valid.length, skipped: checked.length - valid.length, type });
  } catch (error) {
    console.error("Excel import failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Excel import failed" }, { status: 500 });
  }
}