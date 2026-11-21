import { DealStage, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
export const dealSchema = z.object({ title: z.string().trim().min(2).max(191), value: z.coerce.number().min(0), stage: z.nativeEnum(DealStage).default("PROSPECTING"), probability: z.coerce.number().int().min(0).max(100).default(0), expectedCloseDate: z.string().optional().nullable(), contactId: z.string().optional().nullable(), ownerId: z.string().optional().nullable(), position: z.coerce.number().int().min(0).default(0) });
export const dealUpdateSchema = dealSchema.partial();
export const taskSchema = z.object({ title: z.string().trim().min(2).max(191), description: z.string().max(5000).optional().nullable(), status: z.nativeEnum(TaskStatus).default("TODO"), priority: z.nativeEnum(TaskPriority).default("MEDIUM"), dueAt: z.string().optional().nullable(), reminderAt: z.string().optional().nullable(), assignedToId: z.string().optional().nullable(), dealId: z.string().optional().nullable() });
export const taskUpdateSchema = taskSchema.partial();
