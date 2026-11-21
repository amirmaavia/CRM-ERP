# ERP user guide

Open **Help & Guide** in the app or the **Help** link in the header. Search by task or filter by category. Availability of actions depends on your role.

## 1. First login

Screen: `/dashboard/profile`

1. Ask the system administrator for your account email and temporary password. Public registration is disabled.
2. Sign in at /login. Open Profile, then Password, and replace the temporary password.
3. Sign in again after changing your password. Check your name and role in the header.
4. Ask whether your account has an isolated workspace or shares the administrator workspace. An empty isolated workspace is normal.

## 2. Understand your access

Screen: `/dashboard`

1. Use the sidebar to open the modules available to your role.
2. If a page says Permission denied, ask the administrator to review your role; do not use another person's login.
3. Only the system administrator creates users. Shared staff see workspace records according to their permissions.
4. Use Sign out when you finish, especially on a shared computer.

## 3. Set up business details

Screen: `/dashboard/settings`

1. Ask the administrator to open Settings and review business name, address, currency, timezone and tax details.
2. Check invoice branding and contact details before printing your first bill.
3. For an isolated account without Settings access, request administrator assistance; do not enter transactions under another workspace.
4. Confirm the opening stock and outstanding customer/vendor balances before starting live entry. Avoid importing and manually entering the same opening records.

## 4. Create customers and vendors

Screen: `/dashboard/companies`

1. Open Customer & Vendor Ledgers and search for the company first.
2. Click Add company if it does not exist. Enter its name and contact details.
3. Select Customer when you sell to it, Vendor when you buy from it, or both for the same business.
4. Click Create unified account. Open Full Ledger to check the account.

## 5. Add products

Screen: `/dashboard/inventory`

1. Open Inventory and click Add product.
2. Enter the product name, unique SKU, unit, purchase price and sale price. Use a consistent unit such as pcs or box.
3. Enter the applicable tax rate and minimum stock threshold, then click Save.
4. Search for the SKU to confirm it saved. New stock is recorded through a purchase receipt or an authorized opening adjustment; saving a product alone does not receive goods.

## 6. Record a purchase and receive goods

Screen: `/dashboard/suppliers`

1. Open Purchases. Make sure the vendor and product already exist.
2. Select the Purchases tab, click Add purchase, and choose the vendor, purchase type, product, quantity, unit price and tax rate.
3. Click Create and check the purchase total. Credit Purchase leaves an amount payable; Cash Purchase is settled when received.
4. Only after goods physically arrive, click Receive or Receive & Pay. Check the received quantity, inventory and vendor ledger. Do not record the same cash payment again.

## 7. Create a sale

Screen: `/dashboard/invoices`

1. Open Sales & Invoices and click Create bill.
2. Choose the customer and Cash Sale or Credit Sale. Check the issue date and due date where applicable.
3. Select the product and quantity; review prices, discounts, tax and total before posting.
4. Click Post bill & update ledger. Check the invoice and View / Print Slip. Cash sales create a receipt automatically; credit sales remain due.

## 8. Receive customer money

Screen: `/dashboard/payments`

1. Open Receipts & Payments and click Record payment.
2. Choose Customer and select the outstanding invoice being settled.
3. Enter the amount, payment method, date and reference. Check that the amount matches the money received.
4. Click Record, then review the invoice due amount and company ledger. A partial payment leaves a remaining balance. Do not record a second receipt for an already-settled cash sale.

## 9. Pay a vendor

Screen: `/dashboard/payments`

1. Open Receipts & Payments and click Record payment.
2. Choose Supplier and select the purchase being settled.
3. Enter the amount, method, payment date and reference, then click Record.
4. Check the remaining payable in Purchases and Full Ledger. Do not duplicate the automatic payment for a cash purchase.

## 10. Adjust stock

Screen: `/dashboard/inventory`

1. Count the actual goods and identify the reason for the difference.
2. Find the product in Inventory and click Adjust.
3. Enter a signed change, not the final total: if the system shows 10 and you counted 8, enter -2. Enter a clear reason.
4. Click Apply and confirm the final quantity. Stock adjustment alone does not issue a customer refund or vendor credit.

## 11. Manage leads and customers

Screen: `/dashboard/contacts`

1. Open Contacts & Leads and choose Customers or Leads.
2. Click Add customer or Add lead. Enter contact information and the available tags, source or status fields.
3. Save and search for the contact to check for duplicates.
4. Use Convert for a qualified lead when appropriate. Open the contact profile to add notes and review its history.

## 12. Track deals and tasks

Screen: `/dashboard/deals`

1. Open Deals Pipeline and click Add deal. Enter title, value, probability and expected close date.
2. Update the deal stage as the opportunity progresses. A won deal does not replace posting a sales invoice.
3. Open Tasks and click Add task. Enter title, priority and due/reminder times.
4. Use the List or Calendar view to review upcoming work. Do not assume reminder emails are delivered merely because a reminder time is saved.

## 13. Review ledgers and reports

Screen: `/dashboard/reports`

1. Open Customer & Vendor Ledgers, find the business, and open Full Ledger.
2. Compare sales, purchases, receipts and payments against the source documents. Receivable means the customer owes you; payable means you owe the vendor.
3. Open Reports and select the date range. Review aging, stock valuation, cash book and the available profit summary.
4. Print or save a PDF where the screen offers printing. Profit summaries depend on complete expense and cost data and are not a substitute for a reconciled set of accounts.

## 14. Import existing Excel records

Screen: `/dashboard/import`

1. The system administrator opens Excel Import and downloads the matching template.
2. Copy data under the template headers; confirm dates, SKUs and customer/vendor identities.
3. Upload the file, choose the data type and review invalid or duplicate rows before Confirm Import.
4. Check the resulting records and totals. Use historical billing only when appropriate for old sales that must not change current stock; do not import transactions already entered manually.

## 15. Create and support users

Screen: `/admin/users`

1. As system administrator, open Management, Users, then Create user / Manage access.
2. Click Add user. Enter name, email, temporary password and the least-privileged suitable role.
3. Choose Own isolated workspace for separate data, or explicitly choose Share administrator workspace for staff who need that data. Click Create user.
4. Use role and status controls to maintain access. Review Management activity and Failures only when investigating issues. Never ask staff to send passwords.

## 16. Recover a password

Screen: `/dashboard/profile`

1. On the login screen, choose Forgot password and enter the account email.
2. If recovery is configured, check the inbox and spam folder for the reset link. Use it within 30 minutes.
3. Set the new password and sign in again. Previous sessions become invalid.
4. If recovery is unavailable or no email arrives, contact the system administrator. Email delivery requires system SMTP configuration.

## 17. Handle a failed save

Screen: `/dashboard/activity`

1. Read the message and avoid repeatedly clicking Save.
2. Refresh the relevant list and search for the record: the server may have saved it even if the screen failed to refresh.
3. For duplicate SKU/email errors, locate the existing record instead of creating another copy. For insufficient stock, verify receipts and physical stock.
4. If it still fails, send the administrator the screen name, time, record reference and error message. Do not include passwords. Review My Activity for your recent actions.

## 18. Close the day and month

Screen: `/dashboard/reports`

1. Daily: check sales, receipts, purchase receipts and payments against documents; count cash and review unpaid balances.
2. Daily: check low stock and tomorrow's tasks. Investigate errors or duplicate entries before leaving.
3. Monthly: review customer aging, supplier dues, physical stock and bank/cash differences with the accountant. Keep an approved record of expenses until the expense-entry workflow is added.
4. Ask the administrator to confirm a tested database backup. A printed report is not a backup. Period locking and full financial reconciliation remain planned improvements.

## Suggested first practice

Use an administrator-approved test workspace: add a test customer and vendor, add a product, receive 5 units, sell 2 units on credit, record the customer payment and check that 3 units remain. Review the invoice and ledger. Do not enter fictional transactions in the live books.

## Business sub-users

Business owners can now open **Business Sub-users** in the sidebar or `/dashboard/sub-users`, click **Add sub-user**, enter name, email, temporary password and role, then click **Create user**. Staff automatically belong to that owner's workspace. Owners can update staff roles and activate, deactivate or suspend their own staff. Only roles within the owner's permissions are available. Sub-users cannot create more accounts. System administrators alone create independent businesses and administrator accounts.

## Management Tools: give one user several types of access

1. Open **Management Tools** in the sidebar.
2. Click **Add business user**, or **Edit access** for an existing employee.
3. Select multiple checkboxes, for example **Sales & Invoices** and **Vendors & Purchases**.
4. Choose **All business access (Business admin)** only when the employee needs all available operations in this business.
5. Click **Save user access**. Use Activate/Deactivate or Suspend when needed.

This replaces the earlier Business Sub-users screen. Only owners or users granted Manage Business Users can manage this business's staff. Platform administration remains separate. Selected operations can include read-only catalogs needed by the workflow; the checkbox descriptions explain these dependencies.
