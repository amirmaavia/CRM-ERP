"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import type { AppSession } from "@/types/auth";

export function DashboardProvider({ session: _session, children }: { session: AppSession; children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
