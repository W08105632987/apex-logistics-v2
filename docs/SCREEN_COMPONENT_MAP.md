# Apex Logistics V2 — Screen and Component Map

This map records the current implementation boundary. It distinguishes working API-backed workflows from prototype-only or provider-dependent behavior.

| Screen / route | Primary components | State and data source | Status |
|---|---|---|---|
| Home | `HomePage`, `Header`, `Footer` | Curated hero slide data; bundled WebP assets | Responsive; six hero states, expanded commissioned library still required |
| Service catalogue | `GlobalServices` | Local service descriptions and bundled images | Implemented; availability claims intentionally qualified |
| Air, ocean, road, express, warehousing, cold chain, customs | `PublicContentPage` | Local page content and images | Dedicated responsive pages implemented |
| Industries, network, about | `PublicContentPage` | Local content; network copy avoids unverified coverage claims | Implemented |
| Contact | `PublicContentPage` | `POST /api/contact`; staff enquiry lifecycle in API | Implemented; replies are manual, no contact email sent |
| Quote request | `RateCalculator` | Three-step form; `POST /api/quotes` | Implemented; quote is a request, not an instant rate |
| Public tracking | `TrackingView` | `GET /api/tracking/:trackingNumber`; explicitly labeled bundled demo fallback | Implemented; carrier integrations and true geographic map remain provider-dependent |
| Customer portal | `CustomerPortal` | HTTP-only server session and customer-scoped API endpoints | Implemented: shipments, quotes, bookings, addresses, documents, notifications, profile/password, support |
| Staff authentication | `AdminAuthGate`, `authService` | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` | Server-backed; no default credentials |
| Operations overview | `AdminDashboard` | Shipment records and server-backed mutations | Implemented; records are from JSON-file persistence in this checkpoint |
| Shipment management | `AdminDashboard` | `/api/shipments`, `/api/shipments/:id`, `/api/shipments/:id/events` | Implemented with event history and role checks |
| Booking requests | `AdminDashboard`, `CustomerPortal` | `/api/customer/bookings`, `/api/bookings/:id/status` | Implemented; staff confirmation is an internal decision, not a carrier booking |
| Customs queue | `AdminDashboard` | Shipment status and `customsDetails` | Basic clearance/hold workflow implemented; dedicated customs case records, duty assessment workflow and document checklist state remain to be added |
| Driver workspace | `DriverPortal` | Assignment-scoped `/api/driver/stops` and event endpoints | Responsive driver workflow; no GPS, signature capture or native mobile app |
| Fleet and facilities | `AdminDashboard` | `/api/vehicles`, `/api/facilities`, shipment assignment endpoint | Registries, status controls, vehicle capacity check and stop ordering implemented; no maintenance schedules or route optimization |
| Support inbox | `AdminDashboard`, `CustomerPortal` | `/api/customer/support`, `/api/support/:id/status` | Ticket creation and status lifecycle implemented; no agent comments/SLA timers |
| Contact enquiries | `AdminDashboard` | `/api/contact`, `/api/contact/:id/status` | Staff review and status lifecycle implemented |
| Email delivery queue | `AdminDashboard` | `/api/notification-jobs`, optional Resend provider | Configurable opt-in email queue with retries; provider credentials and end-to-end delivery still need deployment validation |
| Analytics | `AdminDashboard` | `/api/analytics` aggregates stored records | Implemented for current records; not a historical warehouse or business-intelligence system |

## Shared implementation principles

- Do not display a price, transit estimate, live location, facility capability, certification, coverage claim or provider status unless it is supplied by a verified source.
- Customer shipment lists, documents, saved addresses, notifications, quotes, bookings and support tickets are scoped server-side to the authenticated account.
- Driver actions are limited to assigned shipments and valid status transitions.
- Shipment document uploads are limited to PDF/JPEG/PNG and 5 MB per file; file-signature checks and account-scoped download checks run on the API.
- The JSON-file store is a local/single-instance adapter. Production requires a managed relational database, migrations, backups and operational monitoring.
