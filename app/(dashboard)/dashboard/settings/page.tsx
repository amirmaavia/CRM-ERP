import { SettingsForm } from "@/components/settings/settings-form";
import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export default async function Page() { const session = await requireSession(); if (!session.user.permissions.includes("settings.manage")) redirect("/unauthorized"); return <SettingsForm />; }
