-- Prisma connects as the database owner and continues to enforce tenant access in API routes.
-- RLS blocks direct access to public tables through Supabase's anon/authenticated Data API.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Role','Permission','RolePermission','User','Company','Lead','Contact','Deal','Task','Note','Document','Category','Warehouse','Product','Supplier','PurchaseOrder','PurchaseOrderItem','Invoice','InvoiceItem','Payment','PaymentAllocation','StockMovement','Expense','ActivityLog','CompanySetting','NotificationPreference'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;
