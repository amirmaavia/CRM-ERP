import { z } from "zod";

const reportRowSchema = z.record(z.unknown());

export const reportDataSchema = z.object({
  profitLoss: z.object({
    revenue: z.number(),
    cogs: z.number(),
    grossProfit: z.number(),
    expenses: z.number(),
    netProfit: z.number(),
  }),
  aging: z.object({
    days0to30: z.number(),
    days31to60: z.number(),
    days60plus: z.number(),
  }),
  receivables: z.array(reportRowSchema),
  payables: z.array(reportRowSchema),
  stockValuation: z.array(reportRowSchema),
  stockValue: z.number(),
  sales: z.array(reportRowSchema),
  cashBook: z.array(reportRowSchema),
  staffPerformance: z.array(reportRowSchema),
});

export type ReportData = z.infer<typeof reportDataSchema>;
export type ReportTab = "sales" | "receivables" | "payables" | "stockValuation" | "cashBook" | "staffPerformance";

