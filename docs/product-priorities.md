# Release priorities

Initial audience hypothesis: Pakistan wholesalers/distributors. Validate with interviews before adding industry-specific features. This is an ordered backlog, not a claim that the application is production-ready.

## P0 — release blockers: reliability and correct records

| Work | Acceptance criteria | State |
| --- | --- | --- |
| Deployment/auth/V2 reliability | Fresh production deploy supports login, navigation, GET and mutation requests; errors have safe diagnostics; exposed credentials rotated | Local fixes exist; production verification pending |
| Invoice stock accuracy | Repeated product lines deduct their full sum; insufficient stock rolls back the entire invoice; concurrent checkouts cannot oversell without explicit override | Aggregated stock validation and conditional atomic decrement implemented; DB concurrency verification pending |
| Payment posting correctness | Supplier payment never changes receiving status; overpayment and payments against void/draft invoices rejected; decimal allocation total matches payment | Posting rules implemented; DB integration verification pending |
| Concurrent finance changes | Two allocations against the same balance cannot overpay; conflict returns 409 without partial commits | Serializable isolation added to invoice/payment creation; remaining finance flows pending |
| Supplier payment reversal | Reversal restores purchase paidAmount, supplier balance and allocations atomically; repeated reversal is rejected | Confirmed gap in payment DELETE; next fix |
| Receive/void concurrency | Repeated or concurrent receiving/voiding never double-updates stock or balances | Review and integration tests needed |
| Duplicate submission prevention | Stable idempotency key survives network retries; same key replays the result; changed payload conflicts; tenant isolation enforced | Not implemented; requires durable database design |
| Tenant security | Cross-tenant IDs fail on every read/write; member deletion never exposes tenant records | Requires full route audit and integration tests |
| Backups and recovery | Scheduled backup, documented retention, successful restore drill against isolated database | Not verified |
| Financial acceptance | Accountant verifies purchases, sales, partial payments, cash transactions, voids, balances and rounding against a reference ledger | Not verified |

Do not run destructive tests or restore drills against production. Do not treat pure rule tests as proof of database concurrency behavior. Existing inconsistent records need read-only reconciliation before any repair is proposed.

## P1 — first pilot usability

1. Customer/vendor opening balances and transaction history: balances reconcile before and after import.
2. Excel onboarding: preview, row errors, duplicate detection and safe import rollback.
3. Outstanding balance/aging report: matches individual account statements and payment allocations.
4. Mobile billing and invoice PDF/share: a pilot user completes a real bill without assistance.
5. Setup checklist: company details, products, opening stock, parties and first invoice.

## P2 — validate before expanding

Sales/purchase returns with audit trails; recovery reminders; accountant access; multi-warehouse inventory. Evaluate FBR integration with qualified local advice and a licensed integration route where applicable. Defer payroll, manufacturing and AI features until pilot customers justify them.

## Pilot gate and measurement

Start with 3–5 assisted businesses after P0 acceptance. Track time to first real invoice, weekly active businesses, reconciliation discrepancies, support time, and paid renewals. Agree success targets with pilot owners. Add recurring feature requests to P1 only when they block a repeated real workflow.
