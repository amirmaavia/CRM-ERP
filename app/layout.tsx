import type { Metadata } from "next";
import "./globals.css";
import { ApiActivityProvider } from "@/components/providers/api-activity-provider";

export const metadata: Metadata = { title: { default: "Nexa ERP", template: "%s · Nexa ERP" }, description: "One clear workspace for CRM, inventory, sales and finance." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ApiActivityProvider>{children}</ApiActivityProvider></body></html>;
}
