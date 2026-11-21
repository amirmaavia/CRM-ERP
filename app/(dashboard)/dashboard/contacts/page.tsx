import { CrmManager } from "@/components/crm/crm-manager";
import { requireSession } from "@/lib/auth/session";
export default async function ContactsPage() { await requireSession(); return <CrmManager />; }
