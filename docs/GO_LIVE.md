# Go-live steps

1. **Replace placeholders**: `src/config/company.ts` (address, phone, emails, hours).
2. **Server**: a small Linux VPS (or any host that runs Node 20+) with a MySQL 8 / MariaDB 10.6+ database.
3. **Database**: create an empty database and a user limited to it. Set `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DB`.
4. **`.env`**: copy `.env.example` to `.env`. Set `SESSION_SECRET` (random 48+ bytes), `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (14+ chars), `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`. Never commit `.env`.
5. **Install, build, migrate**: `npm ci && npm run build && npm run db:migrate`.
6. **Run**: `node server.mjs` under a process manager (systemd or pm2) so it restarts. One process serves the website and `/api`.
7. **HTTPS**: put Caddy or nginx in front, proxying to the Node port, with a Let's Encrypt certificate. Login cookies are `secure` in production and will not work over plain HTTP.
8. **Email (optional)**: verify your sending domain with Resend (SPF/DKIM DNS records), then set `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`. Send yourself a test notification.
9. **Backups**: schedule `mysqldump` of the database and a copy of the data folder (uploaded documents). Do one restore test on a spare database.
10. **Smoke test**: log in as admin, create a shipment, track it publicly, create a customer and a driver, and check each sees only their own data.
