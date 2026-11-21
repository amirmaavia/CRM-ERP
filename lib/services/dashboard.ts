import { DealStage, InvoiceStatus, Prisma, RoleName, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const openDealStages: DealStage[] = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDashboardData(user: { id: string; actorId?: string; role: string; permissions: string[] }) {
  const userId = user.id;
  const isPlatformAdmin = user.role === RoleName.PLATFORM_ADMIN;
  const canViewCrm = user.permissions.includes("crm.read");
  const canViewInventory = user.permissions.includes("inventory.read");
  const canViewFinance = user.permissions.includes("finance.read") || isPlatformAdmin;

  const dealWhere: Prisma.DealWhereInput = { userId };
  const leadWhere: Prisma.LeadWhereInput = { userId };
  const taskWhere: Prisma.TaskWhereInput = { userId };
  const contactWhere: Prisma.ContactWhereInput = { userId, status: "ACTIVE" };
  const invoiceWhere: Prisma.InvoiceWhereInput = { userId, status: { not: InvoiceStatus.VOID } };
  const supplierWhere: Prisma.SupplierWhereInput = { userId, currentBalance: { gt: 0 } };
  const productWhere: Prisma.ProductWhereInput = { userId, active: true };
  const activityWhere: Prisma.ActivityLogWhereInput = { userId: user.actorId ?? userId };

  const sixMonthsAgo = startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1));
  const currentMonth = startOfMonth(new Date());

  const [
    totalCustomers,
    totalLeads,
    openDeals,
    pipeline,
    upcomingTasks,
    recentActivity,
    totalRevenue,
    monthSales,
    receivables,
    payables,
    lowStockRows,
    recentInvoices,
  ] = await prisma.$transaction([
    prisma.contact.count({ where: contactWhere }),
    prisma.lead.count({ where: leadWhere }),
    prisma.deal.count({ where: { ...dealWhere, stage: { in: openDealStages } } }),
    prisma.deal.groupBy({ by: ["stage"], where: dealWhere, _count: { id: true }, _sum: { value: true }, orderBy: { stage: "asc" } }),
    prisma.task.findMany({
      where: { ...taskWhere, status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] }, dueAt: { not: null } },
      select: { id: true, title: true, dueAt: true, priority: true, status: true, assignedTo: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    prisma.activityLog.findMany({
      where: activityWhere,
      select: { id: true, action: true, entityType: true, description: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    canViewFinance ? prisma.invoice.aggregate({ where: invoiceWhere, _sum: { total: true } }) : prisma.invoice.aggregate({ where: { id: "__hidden__" }, _sum: { total: true } }),
    canViewFinance ? prisma.invoice.aggregate({ where: { ...invoiceWhere, issueDate: { gte: currentMonth } }, _sum: { total: true } }) : prisma.invoice.aggregate({ where: { id: "__hidden__" }, _sum: { total: true } }),
    canViewFinance ? prisma.contact.aggregate({ where: { ...contactWhere, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }) : prisma.contact.aggregate({ where: { id: "__hidden__" }, _sum: { currentBalance: true } }),
    canViewFinance ? prisma.supplier.aggregate({ where: supplierWhere, _sum: { currentBalance: true } }) : prisma.supplier.aggregate({ where: { id: "__hidden__" }, _sum: { currentBalance: true } }),
    prisma.product.count({ where: { ...productWhere, currentQuantity: { lte: prisma.product.fields.minimumStock } } }),
    canViewFinance ? prisma.invoice.findMany({ where: { ...invoiceWhere, issueDate: { gte: sixMonthsAgo } }, select: { issueDate: true, total: true } }) : prisma.invoice.findMany({ where: { id: "__hidden__" }, select: { issueDate: true, total: true } }),
  ]);

  const monthlySales = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString("en-US", { month: "short" }), revenue: 0 };
  });
  for (const invoice of recentInvoices) {
    const bucket = monthlySales.find((item) => item.key === `${invoice.issueDate.getFullYear()}-${invoice.issueDate.getMonth()}`);
    if (bucket) bucket.revenue += Number(invoice.total);
  }

  const pipelineRows = pipeline as Array<{ stage: DealStage; _count: { id: number }; _sum: { value: Prisma.Decimal | null } }>;

  return {
    scope: "personal",
    canViewFinance,
    kpis: {
      totalCustomers: canViewCrm ? totalCustomers : 0,
      totalLeads: canViewCrm ? totalLeads : 0,
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      thisMonthSales: Number(monthSales._sum.total ?? 0),
      openDeals: canViewCrm ? openDeals : 0,
      totalReceivables: Number(receivables._sum.currentBalance ?? 0),
      totalPayables: Number(payables._sum.currentBalance ?? 0),
      lowStockItems: canViewInventory ? Number(lowStockRows ?? 0) : 0,
    },
    pipeline: (canViewCrm ? pipelineRows : []).map((item) => ({ stage: item.stage, deals: item._count.id, value: Number(item._sum.value ?? 0) })),
    monthlySales: monthlySales.map(({ month, revenue }) => ({ month, revenue })),
    upcomingTasks: canViewCrm ? upcomingTasks : [],
    recentActivity,
  };
}