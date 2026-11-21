# Business Management Platform

CRM, inventory, purchasing, invoicing, payments, and operational reporting platform built with Next.js, TypeScript, Prisma, MySQL, NextAuth, Tailwind CSS, TanStack Query, React Hook Form, Zod, and Recharts. It is an advanced MVP undergoing production and accounting hardening.

## Documentation

- [User and administrator guide](docs/USER_GUIDE.md)
- [Implementation and production-hardening roadmap](docs/IMPLEMENTATION_ROADMAP.md)

## Build status

The project is implemented module-by-module in this order:

1. Schema and folder structure — complete
2. Auth & Roles — complete
3. Dashboard — complete
4. Contacts & Leads — complete
5. Deals Pipeline — complete
6. Tasks — complete
7. Product & Inventory — complete
8. Suppliers & Purchases — complete
9. Invoicing & Stock Integration — complete
10. Payments — complete
11. Reports — complete
12. Settings — complete

## Planned structure

```text
app/
  (auth)/                 # Login and password recovery
  (dashboard)/            # Secured module pages
  api/                    # Session-secured route handlers
components/
  layout/                 # Sidebar and header
  ui/                     # Shared enterprise UI primitives
  forms/                  # Validated module forms
  tables/                 # Paginated/filterable tables
lib/
  auth/                   # NextAuth and RBAC helpers
  db/                     # Prisma client and transactions
  services/               # Business workflows
  validations/            # Zod schemas
prisma/
  schema.prisma
  seed.ts
types/                    # Shared application types
```

## Local setup

1. Install Node.js 20+ and create a Supabase project.
2. Copy `.env.example` to `.env` and set the Supabase database URLs, project URL, anon key, and service-role key.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate` and then `npm run db:secure`.
6. Run `npm run db:seed` to create or link the management account in Supabase Auth.
7. Run `npm run dev` and open `http://localhost:3000`.

The seed administrator defaults to `admin@example.com` / `ChangeMe123!`. Override both values in `.env` and change the password immediately outside development.

### Transfer an existing MySQL database

Keep the old MySQL URL in `SOURCE_DATABASE_URL`, put the Supabase direct PostgreSQL URL in `DIRECT_URL`, and run `npm run db:migrate`, `npm run db:transfer`, then `npm run db:secure`. The transfer preserves ERP IDs and relationships. The management user is linked with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Other migrated users must use **Forgot password** once because old bcrypt password hashes cannot be imported into Supabase Auth.

## Authentication and authorization

- Supabase Auth manages passwords, recovery email, secure cookies, and sessions.
- Application roles and permission keys are loaded from PostgreSQL for every authenticated session.
- Middleware protects dashboard and admin URLs; server pages and APIs independently enforce access.
- Admins can manage staff, managers, and other admins. Only super admins can assign or manage the super-admin role.
- Password recovery and reset links are managed by Supabase Auth.
- Staff belong to the administrator's shared workspace: records are shared, while creators, assignees, and activity logs retain the individual user's identity.
- Built-in least-privilege roles are Platform Admin, Manager, Sales, Accountant, Inventory, and User. Navigation and ledger endpoints enforce their permission keys.

Core invoice and payment mutations use atomic Prisma transactions. Customer and supplier balances are cached for reads but remain derivable from invoices, opening balances, and payment allocations. A formal double-entry ledger is planned and must be reviewed by a qualified accountant before the system is represented as accounting-complete.
