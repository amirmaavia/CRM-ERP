import { InvoiceSlip } from "@/components/finance/invoice-slip";
import { requireSession } from "@/lib/auth/session";
export default async function InvoiceSlipPage({ params }: { params: { id: string } }) { await requireSession(); return <InvoiceSlip id={params.id} />; }
