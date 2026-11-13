# Salon Studio

Appointments, billing, clients, stock and reports for **Shruti Pahwa Luxury Salon & Academy**.
It runs as a Mac app or in a browser, and keeps all data in one local file that the salon owns.

## Run it

You need [Node.js 20 or newer](https://nodejs.org).

```bash
npm install
cp .env.example .env      # then put any long random text in SESSION_SECRET
npm run setup             # creates the database with demo data
npm run dev               # open http://localhost:3000
```

Sign in with `admin@salon.com` / `admin123`. The demo data also has `manager@salon.com` / `manager123`
and `reception@salon.com` / `reception123`. Change these passwords before real use (click your name in the menu).

### As a Mac app

```bash
npm run desktop           # builds, then opens the app in its own window
npm run dist:mac          # makes an installer (.dmg) in dist/, for Apple Silicon Macs
```

On first launch the app copies `prisma/dev.db` to `~/Library/Application Support/Salon Studio/salon.db`
and uses that copy from then on. **Back up that file** to keep your records safe.
To ship an installer without demo data, run `npm run setup:fresh` before `npm run dist:mac`. It prints a random owner password once; note it down. To choose your own, run it as `OWNER_PASSWORD=yourpassword npm run setup:fresh`.

### As a Linux or Windows app

```bash
npm run dist:linux        # AppImage and .deb installers in dist/ (x64)
npm run dist:win          # Windows installer (.exe) in dist/ (x64)
```

Linux: run the AppImage (`chmod +x` it first) or install the `.deb` with `sudo apt install ./dist/salon-studio_*.deb`.
Data is kept in `~/.config/Salon Studio/salon.db` on Linux and `%APPDATA%\Salon Studio\salon.db` on Windows.
`dist:win` is best run on Windows (building it from Linux needs Wine).

### Database commands

| Command | What it does |
|---|---|
| `npm run setup` | Creates the database and loads demo data. If it already has data, it is left alone |
| `npm run setup:demo` | Wipes everything and reloads demo data |
| `npm run setup:fresh` | Wipes everything and leaves only the owner login (with a random password, shown once), business details and service categories |

## API

Everything the app does goes through a REST API under `/api`: every change (new client, stock in, bill, payment) and every read.
The screens call it, and so can any other client. Pages load their data from the API's GET endpoints, and saves go to its POST, PUT and DELETE endpoints, so the database is only reached through the API. The code that does the work is in each feature's `service.ts`;
the routes are listed in `src/lib/api-routes.ts`.

**Tests.** `npm run build`, then `npm run test:api`. It starts the app on a temporary database and runs about 100 checks of the API (every endpoint, role limits, sign-out, rate limit, CORS), then cleans up.

**Sessions.** Signing in gives a token that lasts 12 hours. The browser keeps it in local storage and sends it with every API call; it also sets a login cookie so page loads work. When the 12 hours are up (or the browser no longer has the token), the app signs the person out. Pages and the sidebar ask `GET /api/me` who is signed in, so only the API looks users up in the database. Signing out ends that session on the server, so a copied token stops working at once; changing a password or switching a login off signs that person out everywhere. After 5 wrong passwords for an email (or 20 from one address) sign-in is blocked for 15 minutes.

**Other websites.** Browsers only let a website on another domain call the API if its address is listed in `ALLOWED_ORIGINS` in `.env` (comma separated). Those sites sign in with the token, not the cookie. Mobile apps and servers are not affected.

Sign in with `POST /api/auth/login` (`{ "email", "password" }`). It sets the login cookie and returns a `token`;
other clients send it as `Authorization: Bearer <token>`. Replies are `{ "ok": true, "data": … }` or
`{ "ok": false, "error": "…" }` with status 401 (not signed in), 403 (role not allowed), 422 (invalid input),
409 or 400 (duplicate, or a rule was broken).

| Area | Endpoints |
|---|---|
| Clients | `POST /customers`, `PUT /customers/:id`, `DELETE /customers/:id` (archive), `POST /customers/import` `{csv}` |
| Appointments | `POST /appointments`, `PUT /appointments/:id` (reschedule), `POST /appointments/:id/status` |
| Attendance | `POST /attendance/punch-in`, `POST /attendance/punch-out`, `PUT /attendance` |
| Bills | `POST /invoices`, `POST /invoices/:id/payments`, `/cancel`, `/refunds` |
| Stock | `POST /products`, `PUT /products/:id`, `POST /products/:id/archive`, `DELETE /products/:id`, `GET /products/:id/history`, `POST /stock/movements`, `POST /stock/transfers` |
| Services | `POST /services`, `PUT /services/:id`, `POST /services/:id/archive` and `/restore`, `POST /service-categories` |
| Staff | `POST /staff`, `PUT /staff/:id`, `POST /staff/:id/archive` and `/restore` |
| Suppliers | `POST /suppliers`, `PUT /suppliers/:id`, `POST /suppliers/:id/active`, `POST /supplier-bills` (form upload), `PUT` / `DELETE /supplier-bills/:id`, `POST /supplier-payments`, `DELETE /supplier-payments/:id` |
| Expenses | `POST /expenses`, `PUT /expenses/:id`, `DELETE /expenses/:id` |
| Settings | `PUT /settings`, `POST /branches`, `PUT` / `DELETE /branches/:id`, `POST /users`, `PUT` / `DELETE /users/:id`, `POST /me/password` |

### Reading data (GET)

Lists accept `?q=` to search, `?limit=` (up to 500) and `?offset=`, plus the filters shown. Dates are `YYYY-MM-DD`.
`branch` is a branch id. Every read follows the same role rules as the screens.

| Endpoint | Returns |
|---|---|
| `GET /me` | The signed-in user |
| `GET /public/branding` | Salon name and address (no login needed; used on the sign-in page) |
| `GET /alerts` | Counts behind the sidebar alerts |
| `GET /dashboard` | Today's appointments, bills, money collected, new clients, low stock |
| `GET /reports?period=today\|week\|month\|lastmonth\|year` or `?from=&to=`, `&branch=` | Sales, GST, collections, expenses, profit, daily series, top services and products, payment methods, staff performance, branch comparison |
| `GET /reports/export?type=invoices\|expenses&…` | CSV download |
| `GET /customers?q=&branch=&archived=1` | Clients with visits, last visit, billed and due |
| `GET /customers/:id` | One client with appointments, bills and a per-branch visit breakdown |
| `GET /customers/export?q=&branch=&template=1` | CSV download |
| `GET /appointments?date=` or `?from=&to=` or `?view=week&date=`, `&staffId=&branch=&customerId=&status=` | Appointments with services |
| `GET /appointments/:id` | One appointment |
| `GET /attendance?date=` or `?month=YYYY-MM` or `?from=&to=`, `&staffId=` | Punch records |
| `GET /invoices?q=&status=&branch=&customerId=&from=&to=` | Bills, with billed and collected totals |
| `GET /invoices/:id` | One bill with items, payments and refunds |
| `GET /products?q=&branch=&low=1&archived=1`, `GET /products/:id` | Products with stock per branch and stock value |
| `GET /stock/monthly?month=YYYY-MM&branch=` | Per product: opening, received, sold, used, corrections, transfers, closing; plus the month's deliveries |
| `GET /stock/movements?productId=&branch=&type=&from=&to=` | Stock history |
| `GET /services?archived=1`, `GET /services/:id` | Categories with their services; one service |
| `GET /staff?archived=1`, `GET /staff/:id` | Staff with upcoming bookings (pay details only for owners and managers) |
| `GET /suppliers`, `GET /suppliers/:id` | Suppliers with billed and due; one supplier with bills and payments |
| `GET /supplier-bills/:id/file` | The uploaded bill photo or PDF |
| `GET /expenses?from=&to=&branch=&category=`, `GET /expenses/:id`, `GET /expenses/categories` | Expenses with a total; one expense; categories used so far |
| `GET /branches`, `/branches/:id`, `GET /settings`, `GET /users`, `/users/:id` | Business setup (users are for the owner) |

## Live version on Claude

`live/salon-studio.html` is a browser version of the same app, published as a private Claude page:
https://claude.ai/artifact/3zV9pfZXf9B2itec12Hmoe

It has the same screens and billing rules and saves everything in the page's own shared database, so there is
nothing to install. People get access from the page's Share menu: Contributors and Editors can book and bill,
Viewers can only look. Its records are separate from the desktop app's database.

## What it does

- **Today**: the day's schedule, money collected, dues, stock to reorder and a 14-day collections chart.
- **Appointments**: a day planner with one column per stylist, plus a week view. It checks salon hours, each stylist's
  working days and hours, and double bookings. The status moves from Booked to Checked in, In service and Completed, or to Cancelled or No-show.
  A completed appointment turns into a bill with its services already filled in.
- **Billing**: services and products on one bill, a % or ₹ discount, and split payments by Cash, UPI, Card or Bank.
  GST is added after the discount at the rate set in Settings (5% unless you change it) and printed as CGST and SGST.
  Untick **Charge GST** to make a bill without GST. A new client can be added right on the bill screen.
  You can collect dues later and cancel a bill with a reason (optionally refunding what was paid), or refund money on a bill. Bills print or save as PDF from the bill page.
- **Clients**: profiles with hair and nail notes, preferred stylist, visit history, total billed and balance due.
- **Staff Attendance**: punch in and punch out times only. Press Punch in / Punch out to record the current time, or Edit times to
  enter or correct them. A working day with no punch-in is Absent (today, once the shift is over). A month grid shows
  days present, days absent and hours per person. Owners, Managers and Receptionists can use it.
- **Suppliers**: vendor contacts (phone, email, GSTIN, address) and the bills you get from them: upload the bill (PDF or photo) with its amount, record payments against it, and see what is due or overdue. Link each product to a supplier, pick who stock was received from, and see
  deliveries per supplier and in the monthly stock list. Owners and Managers only.
- **Services, Staff, Inventory, Expenses**: the service menu, team hours and pay (a fixed monthly salary or a commission %), stock counted per branch (with transfers between branches), expenses by branch, stock
  that goes down on each sale with a full history, and monthly expenses by category.
- **Reports**: sales before GST, expenses, profit, collections by payment method, top services and products, and
  each stylist's billed revenue and commission. Bills and expenses export as CSV for the accountant.
- **Settings**: business details and GSTIN, the GST rate for bills, opening hours, bill numbering, branches and logins.

### Who can do what

| Role | Access |
|---|---|
| Owner | Everything |
| Manager | Everything except Settings |
| Receptionist | Today, Appointments, Billing, Clients, Inventory; can view Services |
| Stylist | Today, Appointments, and viewing client notes |

Only the Owner or a Manager can cancel or refund a bill. Every save is checked on the server, not just hidden in the menu.

## How it is built

TypeScript, Next.js 14 (App Router, server actions), Prisma with SQLite, Tailwind CSS, and Electron for the Mac app.

```
prisma/schema.prisma   database tables
prisma/seed.ts         demo and fresh-start data
src/lib/               billing maths, scheduling rules, roles, sessions, formatting
src/components/        shared UI (buttons, forms, modal, toast, chart, sidebar)
src/app/(app)/<area>/  one folder per screen: page.tsx reads data, actions.ts saves it
electron/              Mac app shell
```

`npm run check` type-checks the project. Run `npm run build` before shipping.
