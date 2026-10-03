# Apex Logistics V2

A React, TypeScript and Vite logistics web application, with an Express API foundation.

## Requirements

- Node.js 20 or newer
- npm

## Install and run the public application

```bash
npm install
npm run dev
```

The Vite application is served at `http://localhost:3000`.

## Run the API

Copy `.env.example` to `.env`, then generate a unique `SESSION_SECRET` with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Optionally set `ADMIN_EMAIL`, `ADMIN_NAME` and a unique `ADMIN_PASSWORD` of at least 14 characters to create the first staff administrator. Leave these account fields blank if you are not ready to provision the account. There are no hard-coded default credentials. Do not commit `.env` or production secrets.

```bash
npm run server
```

The API listens on port `4000` by default. Check `GET /api/health` to verify it is running. For optional customer email updates, configure `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` with a sender address/domain verified by Resend; then customers can opt in under Notification preferences. The operations Delivery queue reports provider acceptance, retry attempts and errors. Contact-form replies are still handled manually from the Enquiries workspace.

### API foundations included

- Server-side password hashing with Node's scrypt and signed, HTTP-only session cookies
- Role-checked endpoints for administrators, operations, customs, customer, and driver accounts
- Public tracking responses that omit private shipment/customer fields
- Customer portal authentication and account-scoped shipment lists (matched to the authenticated customer email)
- Quote-to-booking requests scoped to the customer account, with staff review queue
- In-app shipment notifications generated from staff-recorded milestones, with customer-owned read state
- PDF/JPEG/PNG document upload with a 5 MB limit, file-signature checks, separate private file storage, and customer/staff permission checks on download
- Customer support tickets, shipment-reference ownership checks, and staff status lifecycle
- Customer self-service display-name and password updates with session invalidation
- Assignment-scoped driver portal with status-appropriate milestone actions and exception reporting
- Vehicle and facility registries with status controls, driver/vehicle assignment and dispatch stop ordering
- Private customer saved pickup/delivery addresses with create/list/delete operations
- Public contact submissions saved for authorized staff review, with an audited enquiry lifecycle
- Shipment event records and audit entries for privileged changes
- Validated quote requests without invented prices or service guarantees
- Login attempt throttling, JSON request limits and basic security headers
- Atomic JSON-file persistence for a single API instance, with a previous-snapshot recovery path
- Public event projection that excludes staff/facility identifiers; private events do not alter the public shipment timeline
- Session invalidation when accounts are deactivated or passwords are reset; protection against deactivating the last active administrator

### API endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/health` | Public health check |
| POST | `/api/auth/login` | Public, rate limited |
| POST | `/api/auth/logout` | Public session-cookie clearing |
| GET | `/api/auth/me` | Authenticated |
| GET | `/api/tracking/:trackingNumber` | Public, reduced shipment fields |
| GET | `/api/customer/shipments` | Customer account only; matched by sender/receiver email |
| GET | `/api/customer/quotes` | Customer account only; matched by quote email |
| GET, POST | `/api/customer/addresses` | Customer account only |
| DELETE | `/api/customer/addresses/:id` | Owning customer only |
| GET, POST | `/api/customer/bookings` | Customer account only; quote ownership verified |
| GET, POST | `/api/customer/support` | Customer account only; optional shipment ownership verified |
| GET | `/api/customer/notifications` | Customer account only |
| GET, PATCH | `/api/customer/notification-preferences` | Customer account only; email preference requires configured provider |
| GET | `/api/notification-jobs` | Admin, operations; sanitized delivery queue |
| POST | `/api/notification-jobs/:id/retry` | Admin, operations; provider configuration required |
| PATCH | `/api/customer/notifications/:id/read` | Owning customer only |
| GET | `/api/customer/documents` | Customer account only; linked shipments only |
| GET | `/api/customer/documents/:id/download` | Customer account only; shipment ownership checked |
| PATCH | `/api/customer/profile` | Customer account only |
| PATCH | `/api/customer/password` | Customer account only; current password required |
| POST | `/api/quotes` | Public quote request |
| POST | `/api/contact` | Public contact request |
| GET | `/api/contact` | Admin, operations |
| PATCH | `/api/contact/:id/status` | Admin, operations; audited |
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |
| PATCH | `/api/users/:id/password` | Admin |
| PATCH | `/api/users/:id/status` | Admin |
| GET | `/api/shipments` | Admin, operations, customs |
| GET | `/api/drivers` | Admin, operations; active driver accounts only |
| GET, POST | `/api/vehicles` | Admin, operations |
| PATCH | `/api/vehicles/:id/status` | Admin, operations; audited |
| DELETE | `/api/vehicles/:id` | Admin; clears affected assignments |
| GET | `/api/facilities` | Admin, operations, customs |
| POST | `/api/facilities` | Admin, operations |
| PATCH | `/api/facilities/:id/status` | Admin, operations; audited |
| PATCH | `/api/shipments/:id/assignment` | Admin, operations; assignment audited |
| GET | `/api/driver/stops` | Assigned driver only |
| POST | `/api/driver/stops/:id/events` | Assigned driver only; status transition checked |
| POST | `/api/shipments` | Admin, operations |
| POST | `/api/shipments/:id/documents` | Admin, operations; PDF/JPEG/PNG, 5 MB maximum |
| GET | `/api/shipments/:id/documents` | Admin, operations, customs |
| GET | `/api/shipments/:id/documents/:documentId/download` | Admin, operations, customs |
| PATCH | `/api/shipments/:id` | Admin, operations |
| DELETE | `/api/shipments/:id` | Admin |
| POST | `/api/shipments/:id/events` | Admin, operations, customs |
| GET | `/api/quotes` | Admin, operations |
| GET | `/api/bookings` | Admin, operations |
| PATCH | `/api/bookings/:id/status` | Admin, operations; audited |
| GET | `/api/support` | Admin, operations |
| PATCH | `/api/support/:id/status` | Admin, operations; audited |
| GET | `/api/analytics` | Admin, operations; computed from stored records |
| GET | `/api/audit-logs` | Admin |

## Important implementation notes

The API uses a JSON-file store as an initial persistent adapter so it can run without an external database service. Each commit preserves the previous JSON snapshot, and startup attempts recovery from that snapshot if the primary file is unreadable; this is a recovery aid, not a substitute for off-site, tested backups. This is suitable for local development and a single-instance prototype, not a horizontally scaled production deployment. Before production, replace this adapter with a managed relational database, add migrations and backup/restore procedures, and validate deployment-specific controls (TLS, origin policy, monitoring, secret rotation and session revocation). Outbound email is opt-in and uses the Resend API when `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` are configured; delivery attempts are queued and retried with backoff. Without these settings, email preference controls remain disabled and in-app notifications still work. Live maps and third-party carrier integrations must not be represented as live until credentials and provider integrations are configured and tested.

The current React prototype still includes bundled sample shipment records for explicitly labeled demo tracking and simulated staff email previews plus optional Resend-backed customer email delivery. Staff shipment creation, updates and deletion, quote requests, contact enquiries, staff authentication and account management use the API. Customer shipment and quote lists are account-scoped by email. Multi-step quote requests, quote-to-booking conversion and staff booking lifecycle, customer profile/password updates and saved addresses, support-ticket creation and status updates, shipment document upload/download with account authorization, in-app shipment notifications and preferences, driver assignment/milestone actions, customs queue decisions, vehicle/facility records and record-derived analytics now use the API. Push delivery and retry, multi-stop route optimization, dedicated customs case records, true geographic maps/carrier integrations, and production database integration still require implementation before this can be treated as a complete production platform.

## Current redesign checkpoint

Implemented in this checkpoint: refreshed responsive public shell and homepage carousel; root-level UI error boundary; dedicated service, industries, network, about and contact pages; a backend-submitted multi-step quote flow; contact request persistence; server-backed staff login and account administration; shipment CRUD and event records; public tracking against server records; customer sign-in with account-scoped shipments and quotes; quote-to-booking requests; support ticket creation and staff status lifecycle; customer display-name/password self-service and saved addresses; driver role and assignment-scoped mobile workflow; customs queue and clearance decisions; staff enquiry inbox; vehicle/facility registries and dispatch stop ordering; shipment document upload and account-scoped download; in-app milestone notifications, read state and customer preferences; live record-derived operations analytics; simulated staff email previews plus optional Resend-backed customer email delivery; reduced and compressed hero/service images.

Still outstanding against the V2 blueprint: expand the homepage hero to 10–15 genuinely distinct commissioned image compositions (this checkpoint has six hero states); configure and end-to-end test Resend delivery in the deployment, add push notifications, multi-stop route optimization, dedicated customs case records, reliable geographic map/carrier integrations, a relational database with migrations/backups, and end-to-end/browser/accessibility/security/performance QA. These are not represented as completed features.

**Verification note:** the editing environment could not install npm dependencies (installation timed out), so a complete TypeScript/build/browser run was not possible here. The API file passes Node's syntax check and source image imports were checked for missing paths. Run `npm install`, `npm run verify`, `npm run lint` and `npm run build` in an environment with package registry access before treating this checkpoint as verified. `npm run verify` performs dependency-free static checks and does not replace a TypeScript build, API integration tests, or browser QA.


## Database (MySQL / MariaDB)

Set `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE` in `.env`, then:

```bash
npm run db:migrate          # creates tables (tracked in schema_migrations)
npm run db:import-json      # optional: import an existing ./data/apex-data.json
npm run server
```

Without `DATABASE_URL` the API uses the local JSON file (development only). Writes are transactional and only changed rows are saved. Each record is stored as JSON in its own table (`apex_shipments`, `apex_users`, ...); a fully normalised schema is a later refinement. Uploaded documents are still stored on the server's disk under the data directory, so back up that folder as well, or move them to object storage before running more than one server. Back up the database with `mysqldump DATABASE > backup.sql` on a schedule and test a restore.

Run `npm test` for the API integration tests (they use a temporary data folder, or `DATABASE_URL` if set; point that at a throwaway database).

## Placeholders to replace before launch

- `src/config/company.ts`: company address, phone, email, support email and hours.
- `.env`: `SESSION_SECRET`, first admin, `DATABASE_URL`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`.
