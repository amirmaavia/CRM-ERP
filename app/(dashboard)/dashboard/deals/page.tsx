import { DealsBoard } from "@/components/work/deals-board"; import { requireSession } from "@/lib/auth/session"; export default async function Page(){await requireSession();return <DealsBoard/>}
