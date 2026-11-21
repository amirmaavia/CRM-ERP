import { Prisma, PrismaClient, RoleName } from "@prisma/client";
import { createSupabaseAdminClient } from "../lib/supabase/admin";

const prisma = new PrismaClient();

const permissionDescriptions: Record<string, string> = {
  "users.manage": "Create, update, and deactivate staff accounts",
  "crm.read": "View CRM records",
  "crm.write": "Create and update CRM records",
  "inventory.read": "View products and stock",
  "inventory.write": "Manage products and stock",
  "finance.read": "View invoices, payments, and reports",
  "finance.write": "Create financial transactions",
  "finance.amend": "Edit or void posted financial transactions",
  "settings.manage": "Manage company settings",
};

const rolePermissions: Record<RoleName, string[]> = {
  PLATFORM_ADMIN: Object.keys(permissionDescriptions),
  MANAGER: [ "crm.read", "crm.write", "inventory.read", "inventory.write", "finance.read", "finance.write", "settings.manage"],
  SALES: ["crm.read", "crm.write", "inventory.read", "finance.read", "finance.write"],
  ACCOUNTANT: ["crm.read", "inventory.read", "finance.read", "finance.write", "finance.amend"],
  INVENTORY: ["inventory.read", "inventory.write"],
  USER: ["crm.read", "crm.write", "inventory.read", "inventory.write", "finance.read", "finance.write"],
};

async function main() {
  const permissions = new Map<string, number>();
  for (const [key, description] of Object.entries(permissionDescriptions)) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
    permissions.set(key, permission.id);
  }

  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name.replaceAll("_", " ").toLowerCase() },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions[name].map((key) => ({ roleId: role.id, permissionId: permissions.get(key)! })),
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.PLATFORM_ADMIN } });
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const supabase = createSupabaseAdminClient();
  const existingAuthUsers = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existingAuthUsers.error) throw existingAuthUsers.error;
  let authUser = existingAuthUsers.data.users.find(user => user.email?.toLowerCase() === email);
  if (!authUser) {
    const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: process.env.SEED_ADMIN_NAME ?? "System Administrator" } });
    if (created.error || !created.data.user) throw created.error ?? new Error("Could not create Supabase administrator");
    authUser = created.data.user;
  }
  await prisma.user.upsert({
    where: { email },
    update: { roleId: adminRole.id, status: "ACTIVE", supabaseAuthId: authUser.id },
    create: {
      name: process.env.SEED_ADMIN_NAME ?? "System Administrator",
      email,
      supabaseAuthId: authUser.id,
      roleId: adminRole.id,
    },
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { email } });

  // Create default company setting for admin
  await prisma.companySetting.upsert({
    where: { userId: admin.id },
    update: { companyName: "My Business", watermarkText: "Am" },
    create: { userId: admin.id, companyName: "My Business", watermarkText: "Am" },
  });

  // Create notification preference for admin
  await prisma.notificationPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // Create demo data for admin tenant
  const category = await prisma.category.upsert({
    where: { userId_name: { userId: admin.id, name: "Office Supplies" } },
    update: {},
    create: { userId: admin.id, name: "Office Supplies" },
  });

  const product = await prisma.product.upsert({
    where: { userId_sku: { userId: admin.id, sku: "DEMO-PAPER-A4" } },
    update: { currentQuantity: new Prisma.Decimal(95) },
    create: {
      userId: admin.id,
      name: "A4 Paper Box",
      sku: "DEMO-PAPER-A4",
      unit: "box",
      purchasePrice: new Prisma.Decimal(800),
      salePrice: new Prisma.Decimal(1000),
      taxRate: new Prisma.Decimal(15),
      currentQuantity: new Prisma.Decimal(95),
      minimumStock: new Prisma.Decimal(10),
      categoryId: category.id,
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { userId_name: { userId: admin.id, name: "Main Warehouse" } },
    update: {},
    create: { userId: admin.id, name: "Main Warehouse" },
  });

  const contact = await prisma.contact.upsert({
    where: { userId_email: { userId: admin.id, email: "customer@example.com" } },
    update: {},
    create: { userId: admin.id, firstName: "Demo", lastName: "Customer", email: "customer@example.com", phone: "0300-0000000" },
  });

  const supplier = await prisma.supplier.upsert({
    where: { userId_email: { userId: admin.id, email: "supplier@example.com" } },
    update: {},
    create: { userId: admin.id, name: "Demo Wholesale Supplier", email: "supplier@example.com", phone: "021-0000000" },
  });

  const lead = await prisma.lead.upsert({
    where: { userId_email: { userId: admin.id, email: "lead@example.com" } },
    update: {},
    create: { userId: admin.id, firstName: "Demo", lastName: "Lead", email: "lead@example.com", source: "Website", assignedToId: admin.id },
  });

  if (!await prisma.deal.findFirst({ where: { userId: admin.id, title: "Demo Office Supply Contract" } })) {
    await prisma.deal.create({
      data: { userId: admin.id, title: "Demo Office Supply Contract", value: new Prisma.Decimal(75000), stage: "PROPOSAL", probability: 60, contactId: contact.id, ownerId: admin.id },
    });
  }

  if (!await prisma.task.findFirst({ where: { userId: admin.id, title: "Follow up demo customer" } })) {
    await prisma.task.create({ data: { userId: admin.id, title: "Follow up demo customer", dueAt: new Date(Date.now() + 86400000), priority: "HIGH", assignedToId: admin.id, createdById: admin.id } });
  }

  const invoice = await prisma.invoice.upsert({
    where: { userId_number: { userId: admin.id, number: "INV-DEMO-001" } },
    update: {},
    create: {
      userId: admin.id,
      number: "INV-DEMO-001",
      contactId: contact.id,
      type: "CREDIT_SALE",
      status: "PARTIALLY_PAID",
      subtotal: new Prisma.Decimal(5000),
      taxTotal: new Prisma.Decimal(750),
      total: new Prisma.Decimal(5750),
      paidAmount: new Prisma.Decimal(2000),
      dueDate: new Date(Date.now() + 30 * 86400000),
      createdById: admin.id,
      items: { create: { productId: product.id, quantity: new Prisma.Decimal(5), unitPrice: new Prisma.Decimal(1000), unitCost: new Prisma.Decimal(800), taxRate: new Prisma.Decimal(15), lineTotal: new Prisma.Decimal(5750) } },
    },
  });

  const purchase = await prisma.purchaseOrder.upsert({
    where: { userId_number: { userId: admin.id, number: "PO-DEMO-001" } },
    update: {},
    create: {
      userId: admin.id,
      number: "PO-DEMO-001",
      supplierId: supplier.id,
      status: "RECEIVED",
      subtotal: new Prisma.Decimal(8000),
      total: new Prisma.Decimal(8000),
      items: { create: { productId: product.id, quantity: new Prisma.Decimal(10), receivedQuantity: new Prisma.Decimal(10), unitPrice: new Prisma.Decimal(800), lineTotal: new Prisma.Decimal(8000) } },
    },
  });

  const customerPayment = await prisma.payment.upsert({
    where: { userId_number: { userId: admin.id, number: "PAY-DEMO-CUST-001" } },
    update: {},
    create: {
      userId: admin.id,
      number: "PAY-DEMO-CUST-001",
      partyType: "CUSTOMER",
      direction: "IN",
      method: "BANK_TRANSFER",
      amount: new Prisma.Decimal(2000),
      reference: "DEMO-RECEIPT",
      contactId: contact.id,
      createdById: admin.id,
      allocations: { create: { invoiceId: invoice.id, amount: new Prisma.Decimal(2000) } },
    },
  });

  await prisma.payment.upsert({
    where: { userId_number: { userId: admin.id, number: "PAY-DEMO-SUP-001" } },
    update: {},
    create: {
      userId: admin.id,
      number: "PAY-DEMO-SUP-001",
      partyType: "SUPPLIER",
      direction: "OUT",
      method: "CASH",
      amount: new Prisma.Decimal(3000),
      reference: "DEMO-PAYABLE",
      supplierId: supplier.id,
      createdById: admin.id,
      allocations: { create: { purchaseOrderId: purchase.id, amount: new Prisma.Decimal(3000) } },
    },
  });

  await prisma.contact.update({ where: { id: contact.id }, data: { currentBalance: new Prisma.Decimal(3750) } });
  await prisma.supplier.update({ where: { id: supplier.id }, data: { currentBalance: new Prisma.Decimal(5000) } });

  if (!await prisma.stockMovement.findFirst({ where: { userId: admin.id, reference: "INV-DEMO-001" } })) {
    await prisma.stockMovement.create({
      data: { userId: admin.id, productId: product.id, type: "OUT", quantity: new Prisma.Decimal(-5), quantityBefore: new Prisma.Decimal(100), quantityAfter: new Prisma.Decimal(95), reference: invoice.number, invoiceId: invoice.id, note: "Demo invoice sale", createdById: admin.id },
    });
  }

  void lead;
  void customerPayment;
  console.info(`Seeded roles, permissions, and administrator ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
