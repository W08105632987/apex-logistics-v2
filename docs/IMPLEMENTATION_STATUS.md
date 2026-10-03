# Apex Logistics V2 — Implementation Status

**Status: active redesign / not production-ready.** This checklist tracks the redesign blueprint without marking untested or unconfigured capabilities as complete.

## Public website

- [x] Responsive shared header/footer and primary navigation
- [x] Root-level UI error boundary with a recoverable reload state
- [x] Homepage with hero states, tracking entry point, service overview, and quote CTA
- [x] Dedicated service, industries, network, about, and contact content routes
- [x] Quote and contact forms submit to the backend
- [x] Six compressed WebP hero/service assets
- [ ] Expand to 10–15 distinct, reviewed hero image compositions
- [ ] Review and verify all six industry content sections against approved company facts
- [ ] Confirm network/coverage copy, company address, phone, email, certifications, and service claims with the business owner
- [ ] Browser-based responsive, keyboard, screen-reader, and visual QA

## Shipment tracking

- [x] Server-backed lookup and invalid-number / service-unavailable states
- [x] Public API response limits customer data and internal event fields
- [x] Public event timeline derives from stored event records
- [x] Prototype sample records are labelled as samples
- [ ] Persisted recent searches and reference-number lookup
- [ ] Reliable geographic map using a configured mapping provider and verified coordinates
- [ ] End-to-end test of valid, invalid, private-event, and exception scenarios
- [ ] Implement and verify a consent-safe public email subscription flow if required

## Customer portal

- [x] Server-side sign-in and session restoration
- [x] Account-scoped shipment and quote lists
- [x] Quote-to-booking requests and staff status lifecycle
- [x] Saved addresses, profile/password controls, support tickets
- [x] In-app notifications and customer-owned read state/preferences
- [x] Customer document listing/download with shipment ownership checks
- [ ] Test cross-account isolation with multiple real test accounts
- [ ] Test document access for customer-visible and staff-only files
- [ ] Complete full browser QA for empty, loading, validation, failure, and success states

## Operations and driver workflows

- [x] Role-protected staff authentication and user administration
- [x] Shipment create/update/delete and auditable event history
- [x] Quote, booking, support, and enquiry workspaces
- [x] Vehicle/facility registries and assignment/dispatch sequencing foundations
- [x] Driver assignment-scoped stop list and status-appropriate milestone actions
- [x] Delivery completion requires recipient name and relationship; records a timestamped, audited typed acknowledgement
- [x] Customs queue foundation and status updates
- [x] Record-derived operations analytics and audit log endpoint
- [ ] Verify every role against a least-privilege access matrix
- [ ] Add handwritten/electronic signature capture, photo evidence and failed-delivery reason codes (current proof is a typed recipient acknowledgement only)
- [ ] Add dispatch route optimization and capacity/conflict tests across multi-stop routes
- [ ] Complete dedicated customs case/document lifecycle and operational exception resolution
- [ ] Test concurrency and multi-user update conflicts

## Backend, data, and security

- [x] Password hashes use Node scrypt; sessions use signed HTTP-only cookies
- [x] Strong session-secret requirement and optional first-admin bootstrap
- [x] Role checks, bounded login/public rate-limit maps, request-size limits, security headers
- [x] Session invalidation on password reset/account activation changes
- [x] Guard against deactivating the last active administrator
- [x] Private operational events do not update the public timeline or notifications
- [x] Public tracking event projection omits internal actor/facility identifiers
- [x] Atomic JSON persistence plus recovery from a previous snapshot
- [x] MySQL/MariaDB persistence adapter with migrations and transactional writes (tested against MariaDB 10.11); JSON-document tables, not yet a fully normalised schema
- [ ] Configure managed backups, off-site retention, and a tested restore procedure
- [ ] Add production-grade distributed rate limiting and monitoring
- [ ] Review CSRF/origin policy, TLS, cookie settings, secrets rotation, logging, and retention for deployment
- [ ] Complete security testing and authorization tests before handling real customer data

## Notifications and integrations

- [x] In-app notification queue and preferences
- [x] Optional Resend-backed email queue with retries and operations visibility
- [ ] Configure verified sender/provider credentials in a staging environment and test delivery/bounces/retries
- [ ] Add email templates, deduplication/idempotency, unsubscribe and consent controls
- [ ] Configure push notifications only if product requirements call for them
- [ ] Integrate and test real carrier, mapping, and document-service providers before describing them as live

## Verification and release

- [x] `node --check server.mjs`
- [x] `npm run verify` — dependency-free static checks
- [x] `npm install` completes successfully
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] API integration tests (`npm test`, 8 passing, JSON and MySQL)
- [ ] End-to-end browser tests, and accessibility/performance audits pass
- [ ] Staging acceptance, backup/restore drill, security review, and deployment configuration complete

## Current environment limitation

Dependency installation timed out in the editing environment. As a result, TypeScript compilation, Vite production build, live API integration tests, and browser QA remain **unverified**. Passing static checks does not imply those tests have passed.


## Update: proof of delivery, customs cases, industry pages

- [x] Six dedicated industry pages (#industry-healthcare, -ecommerce, -manufacturing, -retail, -technology, -automotive), linked from the Industries page. Content makes no statistics or certification claims.
- [x] Proof of delivery: handwritten signature pad and optional photo in the driver portal; PNG/JPEG validated by content on the server; read only through `GET /api/shipments/:id/proof` for staff and the owning customer; never in public tracking or the staff list. Exception reason codes added.
- [x] Customs cases (`/api/customs/cases`): document checklist, duty/fee state, review -> assessment -> cleared/held, history and audit log; editable by admin and customs roles, read-only for operations. UI is in the dashboard Customs tab.
- [x] 10 API tests pass on both the JSON store and MySQL (MariaDB 10.11).
- [x] Real geographic map (Leaflet + OpenStreetMap tiles, no key). Shown on the tracking page only when origin and destination have usable coordinates; otherwise the stylized route visual is used. Not yet checked in a real browser. OSM's public tile servers suit light use; set VITE_MAP_TILE_URL for heavier traffic.
- [ ] Browser end-to-end and accessibility audits; live email test with a real key.
- Known limits: signature/photo are small by design (request limit); media is stored in the database record, so move it to object storage for high volume.

## Update: industry photography

- [x] Six industry photographs (healthcare, e-commerce, manufacturing, retail, technology, automotive) are used on the Industries page, the six industry pages and the homepage Industries section (`src/assets/images/industry-*.webp`).
- [ ] No photo exists yet for the Global Network page, which still uses the labelled illustration. Add `global-network.webp` and swap it in `PublicContentPage.tsx` when available.
- [ ] Hero images remain three distinct photos by design.
