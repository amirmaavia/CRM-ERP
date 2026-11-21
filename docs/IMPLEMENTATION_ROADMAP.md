# ERP hardening roadmap

This roadmap separates safe improvements from accounting changes that require stakeholder approval and controlled data migration.

## Phase 1 — Reliability foundation

- [x] Add a shared, runtime-validated reports API contract.
- [x] Make the reports screen handle network, server, and malformed-response failures.
- [x] Correct low-stock logic to compare quantity with `minimumStock`.
- [x] Add application and dashboard error boundaries.
- [x] Add a database-aware `/api/health` endpoint.
- [x] Add baseline browser security headers.
- [x] Add user and administrator guidance.
- [ ] Apply shared contracts and readable formatting to every remaining module.
- [ ] Add request cancellation and duplicate-submit protection to all forms.

## Phase 2 — Automated verification

- [ ] Unit tests for invoice totals, discounts, tax, COGS, aging, and stock valuation.
- [ ] Integration tests for tenant isolation and API permissions.
- [ ] End-to-end tests for sale → receipt → ledger and purchase → receipt → payment.
- [ ] CI checks for typecheck, lint, tests, Prisma validation, and production build.

## Phase 3 — Accounting core

- [ ] Approve the chart of accounts and opening-balance migration with the accountant.
- [ ] Add fiscal periods, accounts, journal entries, and balanced journal lines.
- [ ] Post sales, COGS, inventory, purchases, expenses, receipts, and payments atomically.
- [ ] Add reversal entries; never edit or delete a posted journal.
- [ ] Reconcile cached party balances against the general ledger.
- [ ] Add trial balance, general ledger, balance sheet, and cash-flow reports.

## Phase 4 — Inventory controls

- [ ] Choose weighted-average or FIFO costing before migrating inventory value.
- [ ] Add warehouse balances and transfers.
- [ ] Add stock counts, reservations, and negative-stock policy.
- [ ] Add optional batches, serial numbers, and expiry dates.

## Phase 5 — Production operations

- [ ] Add staging and production environments with validated secrets.
- [ ] Add structured logs, exception monitoring, metrics, and alerts.
- [ ] Add tested automated backups and restore drills.
- [ ] Add rate limits, CSRF review, dependency scanning, and deployment migrations.
- [ ] Add fiscal close, approval limits, and audit-retention policy.

## Release rule

Do not label the system “accounting complete” until Phase 3 is migrated, reconciled, and signed off by a qualified accountant. Each phase requires a database backup, staging verification, and an explicit rollback plan before production deployment.

