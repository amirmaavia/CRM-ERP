export const BUSINESS_ACCESS = [
  { key: "sales", label: "Sales & Invoices", description: "Create sales; read customer and product catalogs.", permissions: ["sales.read", "sales.write", "crm.read", "inventory.read"] },
  { key: "vendors", label: "Vendors & Purchases", description: "Manage vendors, purchases and goods receipt; read products.", permissions: ["vendors.read", "vendors.write", "inventory.read"] },
  { key: "inventory", label: "Inventory", description: "Create products and adjust stock.", permissions: ["inventory.read", "inventory.write"] },
  { key: "crm", label: "Customers, Leads, Deals & Tasks", description: "Manage customer relationships and follow-ups.", permissions: ["crm.read", "crm.write"] },
  { key: "payments", label: "Receipts & Payments", description: "Record customer receipts and vendor payments.", permissions: ["payments.read", "payments.write", "sales.read", "vendors.read", "crm.read"] },
  { key: "ledgers", label: "Customer & Vendor Ledgers", description: "Manage company accounts and inspect combined statements.", permissions: ["ledgers.read", "ledgers.write"] },
  { key: "reports", label: "Reports & Financial Overview", description: "Read business financial reports.", permissions: ["reports.read", "finance.read"] },
  { key: "amend", label: "Amend Financial Transactions", description: "Void invoices or amend payments; includes transaction access.", permissions: ["finance.amend", "sales.read", "sales.write", "payments.read", "payments.write"] },
  { key: "settings", label: "Business Settings", description: "Edit this business's settings.", permissions: ["settings.manage"] },
  { key: "team", label: "Manage Business Users", description: "Manage staff access within this business only.", permissions: ["business.users.manage"] },
] as const;
export const ALL_BUSINESS_KEYS = BUSINESS_ACCESS.map(item => item.key);
export function permissionsForAccess(keys: readonly string[]): string[] {
  return [...new Set(BUSINESS_ACCESS.filter(item => keys.includes(item.key)).flatMap(item => [...item.permissions]))];
}
export function effectiveBusinessPermissions(rolePermissions: string[], businessAccess: unknown, isOwner: boolean, isPlatformAdmin: boolean): string[] {
  if (isOwner || isPlatformAdmin) return [...new Set([...rolePermissions, ...permissionsForAccess(ALL_BUSINESS_KEYS)])];
  if (Array.isArray(businessAccess)) return permissionsForAccess(businessAccess.filter((key): key is string => typeof key === "string"));
  const expanded = [...rolePermissions];
  for (const mode of ["read", "write"]) {
    if (rolePermissions.includes(`finance.${mode}`)) expanded.push(`sales.${mode}`, `payments.${mode}`, `ledgers.${mode}`, ...(mode === "read" ? ["reports.read"] : []));
    if (rolePermissions.includes(`inventory.${mode}`)) expanded.push(`vendors.${mode}`);
  }
  return expanded;
}
