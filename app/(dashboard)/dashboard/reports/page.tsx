import{ReportsView}from"@/components/reports/reports-view";import{requireSession}from"@/lib/auth/session";export default async function Page(){await requireSession();return <ReportsView/>}
