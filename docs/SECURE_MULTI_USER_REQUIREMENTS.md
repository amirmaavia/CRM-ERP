## Objective

I already have an existing system/application. **Do NOT rebuild the project from scratch.** Update and extend the existing system while preserving all current functionality, UI, workflows, APIs, business logic, and existing features unless a change is specifically required for multi-user support.

The main requirement is to convert the existing system into a **secure user-wise/multi-tenant system**.

### 1. Existing System Must Remain Intact

- First inspect and understand the complete existing codebase.
- Identify the current architecture, authentication, database structure, APIs, frontend pages, services, functions, roles, and existing workflows.
- Do not unnecessarily rewrite working code.
- Do not remove or break any existing functionality.
- Existing users/data/features must continue working after the update.
- Make changes incrementally and according to the existing project architecture.
- Reuse existing components, functions, APIs, utilities, and patterns wherever possible.
- Before modifying anything, understand how the current system works.

---

## 2. User Management / Authentication

Add proper user management to the existing system.

### Required features

- Administrator-only User Creation (public self-signup is disabled)
- User Login
- Logout
- Forgot Password
- Reset Password
- Change Password
- User Profile
- Session/token management
- Authentication state persistence
- Proper protected routes
- Unauthorized access handling

Each user must have a unique user ID.

The system must know which authenticated user owns which data.

If the existing authentication system is already present, **extend it instead of replacing it**.

---

## 3. Strict User-Wise Data Isolation

This is the **most important requirement**.

Every user's data must be completely isolated from every other user's data.

For example:

```text
User A
 ├── Data
 ├── Operations
 ├── Settings
 ├── Records
 ├── Reports
 └── Activity

User B
 ├── Data
 ├── Operations
 ├── Settings
 ├── Records
 ├── Reports
 └── Activity
```

User A must NEVER be able to see, modify, delete, access, or manipulate User B's data.

### Security requirements

Do NOT rely only on frontend filtering.

User ownership/authorization must be enforced at the backend/API/database level.

Every user-owned record should have an appropriate ownership relationship such as:

```text
user_id
```

or an equivalent tenant/owner relationship according to the existing architecture.

Every API request that accesses user-owned resources must verify:

1. The user is authenticated.
2. The requested resource exists.
3. The resource belongs to the authenticated user.
4. The authenticated user has permission to perform the requested operation.

Never trust a `user_id` sent from the frontend.

For example, this must NOT be enough:

```text
GET /records?user_id=123
```

The backend must determine the authenticated user from the authenticated session/token and enforce ownership.

Prevent:

- IDOR (Insecure Direct Object Reference)
- Cross-user data access
- Cross-user update
- Cross-user deletion
- Cross-user API access
- Cross-user file access
- Cross-user dashboard access
- Cross-user reports
- Cross-user settings access

---

# 4. Operations / Management Dashboard

Create a separate **Operations / Management Dashboard** for administrators/management.

This dashboard is for monitoring and supporting users.

The management dashboard should allow authorized management/admin users to see system-level information such as:

### User Overview

- Total users
- Active users
- Inactive users
- Recently registered users
- Last active users
- Login activity
- User status
- User creation date
- Last activity
- User-wise usage statistics

### User Search

Management should be able to search/filter users by:

- Name
- Email
- User ID
- Status
- Registration date
- Last activity

### User Details

When management opens a user, show that user's information and activity according to their permission level.

For example:

```text
User
 ├── Profile
 ├── Account Status
 ├── Last Login
 ├── Last Activity
 ├── Usage Statistics
 ├── Operations/Actions
 ├── Errors
 └── Activity History
```

The purpose is to allow management/support staff to understand:

> Which user is using the system, what they are doing, whether they are facing an issue, and how we can support them.

---

# 5. Activity / Audit Logging

Implement a proper activity/audit log.

Track important user actions, for example:

- Administrator-created account
- Login
- Logout
- Password change
- Create
- Update
- Delete
- Important system operations
- Failed operations
- API errors
- Important settings changes

Each activity should ideally contain:

```text
id
user_id
action
resource
resource_id
timestamp
status
metadata
```

Do not log sensitive information such as passwords, tokens, secrets, or other credentials.

Management should be able to inspect activity history according to their permissions.

---

# 6. Roles & Permissions

Implement a proper role-based access-control structure compatible with the existing system.

At minimum support:

```text
USER
ADMIN / MANAGEMENT
```

The exact role names can follow the existing project's conventions.

### USER

A normal user can:

- Access their own account
- Access their own data
- Perform existing system operations
- View their own records
- Modify their own allowed data

A normal user must NOT:

- Access another user's data
- Access management dashboard
- View system-wide user information
- View another user's activity

### ADMIN / MANAGEMENT

Authorized management users can:

- Access management dashboard
- View users
- Search/filter users
- Monitor activity
- View system-level statistics
- Support users
- Perform only explicitly authorized management actions

Do not give admin access simply by hiding frontend routes. Authorization must also be enforced server-side.

---

# 7. Support User Functionality

The management dashboard should make it easy to support users.

Add appropriate functionality for management to:

- Find a user
- Open user details
- See recent activity
- See errors/failures
- Understand what the user has been doing
- Identify problems
- Review relevant user-owned information

If an "impersonate user" or "login as user" feature is considered useful, **do not implement it unless the existing architecture and security model support it safely**.

If implemented, it must:

- Require explicit admin permission
- Never expose the user's password
- Create an audit log
- Clearly indicate that the admin is operating in support/impersonation mode
- Prevent privilege escalation
- Provide a secure exit back to the admin account

---

# 8. Database Changes

Inspect the existing database schema first.

Modify the schema only where required.

For user-owned entities, introduce the appropriate ownership relationship.

Example:

```text
users
 ├── id
 ├── name
 ├── email
 ├── password_hash
 ├── role
 ├── status
 ├── created_at
 └── updated_at

existing_table
 ├── id
 ├── user_id
 ├── ...
```

Do NOT blindly add `user_id` to every table.

Determine which entities are actually user-owned and how they are related.

Add:

- Proper foreign keys where appropriate
- Indexes for user ownership queries
- Unique constraints where required
- Appropriate cascade/restrict behavior
- Migration scripts
- Backward-compatible data migration if existing records already exist

---

# 9. Existing Data Migration

This is important because the system already exists.

Before changing the schema, determine how current data is associated.

If existing data currently has no user ownership:

1. Do NOT arbitrarily assign data to users.
2. Determine the safest migration strategy.
3. Preserve all existing data.
4. Create a migration/backfill mechanism where appropriate.
5. Document any records that cannot safely be assigned.
6. Do not destroy existing records.

If there is already a primary/admin account or existing authentication model, use it appropriately as the owner where logically correct.

---

# 10. API Security

Review every existing API endpoint.

Classify endpoints into:

```text
Public
Authenticated User
Admin/Management
System/Internal
```

For every authenticated endpoint, verify authorization.

Example:

```text
User A → GET /api/orders/100
```

If order `100` belongs to User B:

```text
403 Forbidden
```

or the appropriate secure response according to the existing API convention.

Do not leak whether unauthorized resources exist if that would create an information-disclosure issue.

Review:

- GET
- POST
- PUT
- PATCH
- DELETE
- File endpoints
- Reports
- Search endpoints
- Export endpoints
- WebSocket/socket events
- Background jobs
- Scheduled jobs
- Any direct database access

---

# 11. Frontend

Update the existing frontend without destroying the current UI.

Add:

### Authentication

```text
Administrator-only User Creation
Login
Forgot Password
Reset Password
Profile
Logout
```

### User Dashboard

Keep all existing functionality, but make it user-specific.

The user should only see:

```text
My Data
My Operations
My Reports
My Settings
My Activity
```

according to the existing application's features.

### Management Dashboard

Add a separate protected management area.

For example:

```text
/management
/management/users
/management/users/:userId
/management/activity
/management/analytics
```

Use the project's existing routing conventions instead of blindly adopting these exact URLs.

---

# 12. UI/UX

Keep the existing design language.

Do not redesign the entire application unless necessary.

The new functionality should look like it belongs to the existing application.

Make the management dashboard clean and useful.

Include:

- Summary cards
- User table
- Search
- Filters
- Pagination
- User detail view
- Activity timeline/table
- Status indicators
- Useful error information
- Responsive layout

---

# 13. Real-Time / Existing Events

If the existing application uses:

- WebSockets
- Socket.IO
- Events
- Notifications
- Background workers
- Real-time updates

review them carefully.

Make sure events are also user-isolated.

For example:

```text
User A's event → User A only
User B's event → User B only
Management/system event → authorized management users only
```

Do not allow a client to subscribe to another user's channel/room simply by changing an ID.

Server-side authorization must control subscriptions.

---

# 14. Files / Storage

If the existing system stores files, images, reports, documents, or other user-specific resources:

make sure users cannot access another user's files by manipulating filenames, IDs, paths, URLs, or API parameters.

Use ownership checks and secure storage access.

---

# 15. Error Handling

Do not expose sensitive backend information to normal users.

Return appropriate errors such as:

```text
401 Unauthorized
403 Forbidden
404 Not Found
400 Bad Request
500 Internal Server Error
```

Follow the existing application's error-handling conventions.

Do not expose:

- Database credentials
- Tokens
- Passwords
- Internal stack traces
- Secrets
- Sensitive user information

---

# 16. Testing

Before considering the work complete, test the system with at least:

```text
User A
User B
Admin/Management
```

### Critical security test

Create:

```text
User A → Data A
User B → Data B
```

Then verify:

```text
User A cannot access Data B
User B cannot access Data A
```

Test this through:

- UI
- Direct API requests
- Manipulated IDs
- Query parameters
- Route parameters
- POST body
- PUT/PATCH body
- DELETE requests
- File URLs/endpoints
- WebSocket events
- Reports/exports

Also test:

```text
User → Management Dashboard ❌
User → Admin APIs ❌
User A → User B API resource ❌
User A → User B file ❌
User A → User B socket channel ❌
```

And:

```text
Admin → Authorized management functionality ✅
User A → Own data ✅
User B → Own data ✅
```

---

# 17. Backward Compatibility

The existing system is already working.

Therefore:

- Do not remove existing features.
- Do not change existing behavior unnecessarily.
- Do not replace working libraries without a strong reason.
- Do not rewrite the whole application.
- Do not introduce duplicate functionality.
- Preserve existing APIs where possible.
- If an API must change, maintain backward compatibility where practical.
- Preserve existing database records.
- Preserve existing UI functionality.

---

# 18. Implementation Process

Follow this sequence:

### Phase 1 — Audit

First inspect the entire existing project.

Identify:

- Frontend architecture
- Backend architecture
- Database
- Authentication
- Existing users
- Existing entities
- API routes
- Existing roles
- Existing dashboards
- Socket/event architecture
- File storage
- Existing permissions

### Phase 2 — Architecture Plan

Before making major changes, determine:

- Which entities are user-owned
- Which entities are global
- Which entities are admin-only
- Required database relationships
- Required middleware
- Required authorization checks
- Required frontend routes
- Required management dashboard structure

### Phase 3 — Authentication & User Model

Implement/extend:

- Administrator-only user creation
- Login
- Logout
- Password management
- User model
- Roles
- Sessions/tokens

### Phase 4 — Multi-Tenant/User Isolation

Update existing entities and APIs to enforce ownership.

### Phase 5 — Management Dashboard

Build the operations/management dashboard.

### Phase 6 — Activity/Audit System

Add user activity and system monitoring.

### Phase 7 — Testing

Perform security and regression testing.

### Phase 8 — Final Review

Verify that:

```text
Existing functionality → still works
User A → only User A data
User B → only User B data
Management → authorized system visibility
Unauthorized access → blocked
```

---

# 19. Important Coding Rules

Do not start coding blindly.

First understand the existing project.

When implementing:

- Follow existing naming conventions.
- Follow existing folder structure.
- Follow existing architecture.
- Reuse existing utilities.
- Reuse existing authentication where possible.
- Keep code modular.
- Avoid unnecessary dependencies.
- Avoid duplicate logic.
- Add comments only where they provide meaningful context.
- Keep security checks centralized where practical.
- Do not put authorization logic only in React/frontend.
- Never trust user IDs coming from the client.
- Validate all incoming data.
- Use parameterized queries/ORM safely.
- Follow least-privilege principles.

---

# 20. Final Acceptance Criteria

The implementation is complete only when all of the following are true:

### Existing System

- [ ] Existing features still work.
- [ ] Existing UI/workflows are preserved.
- [ ] Existing data is preserved.

### Authentication

- [ ] Only the system administrator can create users; public signup and manager creation are rejected.
- [ ] Login works.
- [ ] Logout works.
- [ ] Password recovery works.
- [ ] Protected routes work.

### User Isolation

- [ ] Every user has an identity.
- [ ] User-owned data is linked to the correct user.
- [ ] Backend enforces ownership.
- [ ] Frontend cannot bypass ownership.
- [ ] User A cannot access User B's data.
- [ ] User B cannot access User A's data.

### Management

- [ ] Management dashboard exists.
- [ ] User search works.
- [ ] User details work.
- [ ] Activity monitoring works.
- [ ] System statistics work.
- [ ] Management permissions are enforced.

### Security

- [ ] IDOR protection implemented.
- [ ] API authorization implemented.
- [ ] Socket authorization reviewed.
- [ ] File access authorization reviewed.
- [ ] Sensitive information is protected.
- [ ] Unauthorized access returns appropriate errors.

### Testing

- [ ] User A tested.
- [ ] User B tested.
- [ ] Management tested.
- [ ] Cross-user access tested.
- [ ] Existing functionality regression-tested.

---

## Most Important Instruction

**Do not create a separate new application.**

This is an enhancement of my **existing system**.

Keep everything that already exists and integrate the new architecture into it.

The final result should be:

```text
Existing System
      +
User Authentication
      +
User Management
      +
User-Wise Data Isolation
      +
Role-Based Access Control
      +
Operations/Management Dashboard
      +
Activity/Audit Monitoring
      =
Secure Multi-User Existing System
```

Before making destructive or architectural changes, inspect the existing implementation and choose the least disruptive approach.

If something is unclear, inspect the codebase and existing patterns first rather than inventing a new architecture unnecessarily.


---

# 21. User Creation - System Administrator Only

The latest user instruction overrides any earlier public-signup or management-creation wording in this document.

- Only the system administrator (`PLATFORM_ADMIN`) may create accounts.
- Managers, staff and normal users cannot create users, even by calling the API directly.
- User creation belongs in the existing operations/administration area, using the existing form and table style.
- The administrator chooses the role and workspace scope. Default new accounts to an isolated workspace; sharing must be explicit.
- Never trust role, owner or user IDs supplied by unauthorized callers.
- Record who created the account and when, without logging the password.
- Preserve existing users, data, roles and workspace assignments.
- Provide a final list distinguishing newly added functionality, corrected functionality, existing functionality, verified tests and pending deployment checks.

## Implementation Record

See [MULTI_USER_IMPLEMENTATION.md](MULTI_USER_IMPLEMENTATION.md) for the actual changes and remaining acceptance checks. Checkboxes above are requirements, not claims that production acceptance tests have passed.
