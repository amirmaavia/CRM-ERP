import { ContactProfile } from "@/components/crm/contact-profile";
import { requireSession } from "@/lib/auth/session";
export default async function ContactPage({ params }: { params: { id: string } }) { await requireSession(); return <ContactProfile id={params.id} />; }
