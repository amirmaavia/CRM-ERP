# Recommended business improvements

These are recommendations from the current code review, not newly implemented modules. Priorities assume a small trading or stock-based business. Confirm transaction volume, branch count and accounting requirements before implementation.

| Priority | Feature | Current gap | Business benefit / first deliverable |
| --- | --- | --- | --- |
| 1 | Expense entry | Expense table and report aggregation exist, but no expense-entry page/API was found. | Record rent, wages, transport and utilities with receipts; otherwise the profit summary can omit operating costs. |
| 1 | Sales returns, purchase returns and credit notes | Stock adjustment and invoice voiding exist; a complete return/refund workflow was not found. | Link returned quantities, refunds/credits and stock movements to the original transaction. |
| 1 | Bank and cash reconciliation | Payments and a cash book exist; bank statement matching and reconciled balances do not. | Match receipts/payments to statements and daily cash counts, and flag differences. |
| 1 | Accounting ledger and period close | No chart of accounts or journal models were found. | Add balanced double-entry postings, opening balances, general ledger, trial balance, balance sheet and period locks, with accountant-reviewed migration. |
| 1 | Backups and production verification | Backup guidance exists, but automated backups and tested restore jobs were not found in the repository. | Scheduled encrypted backups, monitored results, restore rehearsal and live-workflow regression tests. Verify any infrastructure-managed backups separately. |
| 2 | Quotations and sales orders | Deals and direct invoices exist, but no dedicated quotation/order workflow was found. | Quote, approve, reserve stock, deliver and invoice without retyping. |
| 2 | Credit limits and collection reminders | Credit sales and aging reports exist; enforcement and automated collection delivery are incomplete. | Customer credit limits, due-date reminders and a collection follow-up queue. |
| 2 | Purchase approvals and replenishment | Basic purchases and low-stock flags exist. | Suggested reorder quantities, supplier lead times and approval thresholds before purchases are placed. |
| 2 | Barcode, serial number and warranty tracking | Product SKU exists; per-unit serial/warranty models were not found. | Particularly useful for batteries/electronics: trace an individual sold item and its warranty/return history. |
| 2 | Warehouses and stock counts | Warehouse model exists, but no complete per-location balance/transfer/count workflow was found. | Track stock by branch/location, reconcile physical counts and audit transfers. |
| 3 | Mobile navigation and POS | Sidebar is hidden on small screens without a full replacement navigation; no dedicated POS flow was found. | Accessible mobile menus, fast barcode checkout and receipt printing for counter sales. |
| 3 | Notifications and integrations | Reminder/preferences fields exist; the header notification control is a placeholder. | Delivery-backed reminders and notification inbox; add payment, ecommerce or messaging integrations only when needed. |
| 3 | Payroll and local invoicing compliance | No payroll workflow or jurisdiction-specific compliance integration was found. | Consider only after confirming staffing, registration and local reporting obligations with the responsible adviser. |

## Suggested delivery order

1. Finish live database/browser acceptance, mail setup, backup/restore and critical transaction tests.
2. Add expense entry, return/credit workflows, and cash/bank reconciliation.
3. Build and reconcile the accounting ledger before relying on full financial statements.
4. Add quotations/orders, credit controls, reorder planning and stock traceability as the business needs them.
5. Prioritize branches, POS, payroll and integrations according to actual workflows.

## Source context

The implementation-gap findings above come from this repository's schema, routes and UI, not a vendor checklist. The feature priorities are recommendations.

- [SBA business management guidance](https://www.sba.gov/counseling/manage-your-business/) supports maintaining bookkeeping and cash-flow information.
- [Odoo serial-number documentation](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/serial_numbers.html) demonstrates individual-item stock tracking, which is relevant to serial/warranty workflows.

## Guidance added in this update

Help & Guide now provides 18 searchable topics, topic filters, permission-aware screen links, a first-day workflow and a practice scenario. The header includes Help so the guide is reachable on small screens. The printable/reference Markdown copy is USER_GUIDE.md. Feature recommendations do not mean those features are already implemented.
