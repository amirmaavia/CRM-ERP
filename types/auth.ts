import type { RoleName } from "@prisma/client";

export type AppSession = { user: { id: string; tenantId: string; name: string; email: string; image: string | null; role: RoleName; permissions: string[] } };
