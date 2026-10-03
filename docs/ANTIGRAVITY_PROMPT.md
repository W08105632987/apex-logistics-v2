You are preparing the Apex Logistics website for deployment. The project is in the `website/` folder (React + TypeScript + Vite frontend, Node/Express API in `server.mjs`, MySQL/MariaDB support in `db/`). Read `README.md`, `docs/GO_LIVE.md` and `docs/IMPLEMENTATION_STATUS.md` first.

Do the following in order, and report the result of each step.

1. Use Node 20 or newer. Run `npm ci` (fall back to `npm install` if the lockfile fails). Fix any dependency errors.
2. Run `npm run lint` and `npm run build`. Both must pass. Fix any errors without removing features.
3. Run `npm test`. All 10 API tests must pass in JSON mode. If a local MySQL or MariaDB is available, create an empty throwaway database, set `DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/DBNAME`, run `npm run db:migrate`, and run `npm test` again. Never point tests at a production database.
4. Create `.env` from `.env.example`. Generate a real `SESSION_SECRET` (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Leave `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`, `DATABASE_URL`, `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` for me to fill; do not invent values or commit `.env`.
5. Start the production server (`NODE_ENV=production node server.mjs` after `npm run build`) and verify with curl: `/` returns 200 HTML, a deep link such as `/track/TEST` returns the app, `/api/health` returns 200, and `/api/shipments` returns 401 when not signed in.
6. Open the site in a browser (or headless browser) and visit every route: home, track, calculator, services, the six service pages, industries and all six industry pages, network, about, contact, customer, driver, admin. Report console errors, broken images and broken links, and fix them.
7. Check mobile (375px), tablet (768px) and desktop (1280px) layouts for overflow, cropped images and unreadable text, and fix problems.
8. Create deployment files: a `Dockerfile` (multi-stage: build the frontend, then run `node server.mjs` as a non-root user), a `.dockerignore`, a `docker-compose.yml` with the app plus a MySQL service and a volume for the data folder, and a sample Caddyfile or nginx config that proxies to the app with HTTPS and sets `TRUST_PROXY_HOPS=1`. Do not put real secrets in any file.
9. Add a `docs/ROLLBACK.md` explaining how to restore the previous release and restore the database from a `mysqldump` backup.
10. Do NOT change business content: company details in `src/config/company.ts` are placeholders that I will fill in, and no coverage numbers, certifications or service guarantees may be added.
11. Finish with a short report listing what passed, what you changed, and anything I must do myself (database credentials, admin account, domain and HTTPS, email provider key, real company details).
