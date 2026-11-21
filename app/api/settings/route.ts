import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/http/api";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().trim().min(2).max(191),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(2000).optional(),
  currency: z.string().length(3),
  timezone: z.string().min(1).max(100),
  taxNumber: z.string().max(100).optional(),
  lowStockEmails: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  smtpHost: z.string().max(191).optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(191).optional(),
  smtpPassword: z.string().max(500).optional(),
  smtpFrom: z.union([z.string().email(), z.literal("")]).optional(),
  watermarkText: z.string().max(50).default("Am"),
});

async function handleGET() {
  const auth = await getTenantContext();
  const { userId } = auth;
  const x = await prisma.companySetting.findUnique({ where: { userId } });
  if (!x) return NextResponse.json({ companyName: "My Business", currency: "PKR", timezone: "Asia/Karachi", lowStockEmails: true, emailNotifications: true, watermarkText: "Am" });
  return NextResponse.json({ ...x, smtpPassword: x.smtpPassword ? "********" : "" });
}

async function handlePATCH(r: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const parsed = schema.safeParse(await r.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const x = parsed.data;
  const current = await prisma.companySetting.findUnique({ where: { userId } });
  const smtpPassword = x.smtpPassword === "********" ? current?.smtpPassword : x.smtpPassword || null;

  const saved = await prisma.companySetting.upsert({
    where: { userId },
    update: { ...x, email: x.email || null, phone: x.phone || null, smtpHost: x.smtpHost || null, smtpUser: x.smtpUser || null, smtpFrom: x.smtpFrom || null, smtpPassword },
    create: { userId, ...x, email: x.email || null, phone: x.phone || null, smtpHost: x.smtpHost || null, smtpUser: x.smtpUser || null, smtpFrom: x.smtpFrom || null, smtpPassword },
  });
  return NextResponse.json({ ...saved, smtpPassword: saved.smtpPassword ? "********" : "" });
}
export const GET = secureRoute("settings.manage", handleGET);

export const PATCH = secureRoute("settings.manage", handlePATCH);
