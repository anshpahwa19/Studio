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
To ship an installer without demo data, run `npm run setup:fresh` before `npm run dist:mac`.

### Database commands

| Command | What it does |
|---|---|
| `npm run setup` | Creates the database and loads demo data. If it already has data, it is left alone |
| `npm run setup:demo` | Wipes everything and reloads demo data |
| `npm run setup:fresh` | Wipes everything and leaves only the owner login, business details and service categories |

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
