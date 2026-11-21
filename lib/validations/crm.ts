import { ContactStatus, LeadStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(100), lastName: optionalText(100), email: z.union([z.string().trim().email(), z.literal("")]).optional().nullable(),
  phone: optionalText(50), address: optionalText(2000), companyId: optionalText(191), status: z.nativeEnum(ContactStatus).default("ACTIVE"),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});
export const contactUpdateSchema = contactSchema.partial();

export const leadSchema = z.object({
  firstName: z.string().trim().min(1).max(100), lastName: optionalText(100), email: z.union([z.string().trim().email(), z.literal("")]).optional().nullable(),
  phone: optionalText(50), source: optionalText(100), companyId: optionalText(191), assignedToId: optionalText(191), status: z.nativeEnum(LeadStatus).default("NEW"),
});
export const leadUpdateSchema = leadSchema.partial();
export const noteSchema = z.object({ content: z.string().trim().min(1).max(5000) });
