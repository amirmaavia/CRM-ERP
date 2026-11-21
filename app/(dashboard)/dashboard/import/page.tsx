import{ExcelImporter}from"@/components/import/excel-importer";import{requireAdmin}from"@/lib/auth/session";export default async function Page(){await requireAdmin();return <ExcelImporter/>}
