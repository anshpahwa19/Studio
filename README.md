# Shruti Pahwa Luxury Salon & Academy – Management SaaS

A complete, production-ready **Hair Salon & Nail Studio Management Web Application** engineered for **Shruti Pahwa Luxury Salon and academy** with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM, NextAuth.js, and Recharts.

---

## 🌟 Application Modules & Features

### 1. Executive Dashboard (`/dashboard`)
- **Key Metrics**: Today's appointments, collected revenue, active customers, new customer acquisitions (30d), pending customer balances, and completed sessions.
- **Visual Analytics**: Interactive 7-day revenue trend area chart and daily appointment status distribution bar chart using Recharts.
- **Operational Feeds**: Upcoming client appointments and live POS transaction stream.
- **Quick Action Launchpad**: 1-click shortcuts to Book Appointment, Create Bill, and Register Client.

### 2. Appointments & Scheduling (`/appointments`)
- **Multi-View Calendar**: Seamlessly switch between **Day**, **Week**, and **Month** views with intuitive date navigation.
- **Smart Booking**: Select existing clients or register new clients inline; multi-service selection with automatic duration calculation (`endTime`).
- **Double-Booking Protection**: Enforces strict backend conflict prevention across stylist rosters and working hours.
- **Lifecycle Management**: Confirmed → Checked In → In Progress → Completed → Cancelled / No Show.
- **POS Integration**: 1-click direct conversion of completed appointments into POS invoices.

### 3. Point of Sale & Billing (`/billing`)
- **Fast Billing Counter**: Search clients, add multiple salon treatments and retail cosmetic products.
- **Discounts & GST**: Configurable tax calculations (GST 18%, 12%, 5%) with percentage or flat rate discounts.
- **Split Payments**: Collect partial or split payments across multiple methods: **UPI**, **Cash**, **Credit/Debit Cards**, and **Bank Transfers**.
- **Automated Stock Deduction**: Automatically deducts retail inventory upon invoice generation with audit transaction logs.
- **Invoice PDF Generation**: Client-side downloadable PDF invoices via `jsPDF` with itemized prices, GST breakdown, and branding.

### 4. Customer Relationship Management (`/customers`)
- **Client Profiles**: Full contact information, lifetime spend calculation, visit counts, and preferred stylists.
- **Styling Records & Notes**:
  - 💇 **Hair Preferences**: Cutting styles, hair coloring formulas, bleach sensitivity, and keratin frequencies.
  - 💅 **Nail Preferences**: Gel polish shades, extension types, shapes (almond/coffin), and nail art notes.
- **360° History**: Complete historical timeline of all past appointments and invoice receipts.

### 5. Services & Pricing Menu (`/services`)
- **Categorized Catalog**: Haircut & Styling, Hair Colouring, Hair Spa & Treatments, Manicure, Pedicure, Nail Extensions, Nail Art, etc.
- **Service Management**: Name, description, duration in minutes, standard price, and applicable GST tax rate.
- **Admin Control**: Create, edit, and archive categories and individual services.

### 6. Staff & Stylist Roster (`/staff`)
- **Stylist Profiles**: Name, contact details, role (Senior Stylist, Nail Technician, etc.), and commission rates (e.g. 25-30%).
- **Skills & Specializations**: Tag individual stylists with supported hair and nail treatments.
- **Availability & Roster**: Operating hours, weekly off schedules, and performance tracking.

### 7. Inventory & Stock Control (`/inventory`)
- **Retail & Consumables**: SKU tracking, barcodes, cost price, customer selling price, and gross margins.
- **Reorder Warnings**: Real-time **Low Stock Alerts** based on configurable threshold levels.
- **Stock Movements**: Log Stock IN (purchases), Stock OUT (internal usage), and Manual Adjustments with full audit history.

### 8. Business Expenses (`/expenses`)
- **Expense Categorization**: Rent, Utilities, Staff Salary, Marketing, Supplies, Equipment, and Maintenance.
- **Daily Financial Records**: Track vendor payees, payment methods, transaction receipts, and notes.

### 9. Financial Reports & Analytics (`/reports`)
- **P&L Reporting**: Daily, Weekly, Monthly, and Annual revenue vs. operational costs for accurate **Net Business Profit** calculation.
- **Performance Reports**: Stylist revenue generation and commission earnings breakdown.
- **Top Services**: Service popularity and sales distribution.
- **Payment Method Share**: UPI vs. Cash vs. Card distribution pie charts.
- **Accounting Export**: 1-click export of complete financial summaries to **CSV**.

### 10. Studio Settings & User Access (`/settings`)
- **Business Profile**: Salon name, address, GSTIN, phone, and contact details.
- **Tax Configuration**: Manage flexible GST percentages and set system defaults.
- **Operating Hours & Sequence**: Configure opening/closing times, slot duration, and invoice sequential numbering.
- **User Management**: Role-based access control (Owner, Manager, Receptionist, Stylist).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database & ORM** | SQLite / PostgreSQL via Prisma ORM |
| **Authentication** | NextAuth.js (Credentials Provider with bcryptjs) |
| **Styling** | Tailwind CSS (Sophisticated Light Theme) |
| **Icons** | Lucide React |
| **Visualizations** | Recharts (Responsive Area, Bar, and Pie Charts) |
| **PDF Generation** | jsPDF |
| **Notifications** | React Hot Toast |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="salon-management-secret-change-in-production-2024"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Realistic Seed Data
Initialize the database tables and seed with realistic salon data (services, staff, clients, and inventory):
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Start
```bash
npm run build
npm start
```

---

## 🔑 Default Login Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Owner / Admin** | `admin@salon.com` | `admin123` | Full administrative & financial access |
| **Salon Manager** | `manager@salon.com` | `manager123` | Operations, staff, roster & reporting |
| **Receptionist** | `reception@salon.com` | `reception123` | Appointments, clients, and POS billing |

*Tip: Quick 1-click credential buttons are available directly on the login screen for instant testing.*

---

## 📡 REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | `GET`, `POST` | NextAuth credential authentication handler |
| `/api/dashboard` | `GET` | Aggregated metrics, revenue chart data & live feeds |
| `/api/appointments` | `GET`, `POST` | List appointments with filters; schedule with conflict check |
| `/api/appointments/[id]` | `GET`, `PUT`, `DELETE` | View details, reschedule/update status, cancel |
| `/api/billing` | `GET`, `POST` | List invoices; generate POS invoice & deduct stock |
| `/api/billing/[id]` | `GET`, `PUT` | View full invoice with items & payments |
| `/api/billing/[id]/payment` | `POST` | Record payment balance collection |
| `/api/customers` | `GET`, `POST` | Client directory with search and pagination |
| `/api/customers/[id]` | `GET`, `PUT`, `DELETE` | Full 360° client history, preferences & spending |
| `/api/services` | `GET`, `POST` | List categorized services; add new service |
| `/api/services/[id]` | `GET`, `PUT`, `DELETE` | Service detail, pricing update, and archiving |
| `/api/services/categories` | `GET`, `POST` | Service categories management |
| `/api/staff` | `GET`, `POST` | Stylist roster and availability |
| `/api/staff/[id]` | `GET`, `PUT`, `DELETE` | Staff profile, commission & appointment logs |
| `/api/inventory` | `GET`, `POST` | Retail stock levels and low-stock filter |
| `/api/inventory/[id]` | `GET`, `PUT`, `DELETE` | Product specifications and history |
| `/api/inventory/[id]/stock` | `POST` | Stock IN, Stock OUT, and audit adjustments |
| `/api/expenses` | `GET`, `POST` | Salon operational expense logs |
| `/api/expenses/[id]` | `GET`, `PUT`, `DELETE` | Individual expense records |
| `/api/expenses/categories` | `GET`, `POST` | Expense categories |
| `/api/reports` | `GET` | Financial analytics, net profit & commissions |
| `/api/settings` | `GET`, `PUT` | Salon business profile, GSTIN & timings |
| `/api/settings/tax` | `GET`, `POST` | GST tax rates configuration |
| `/api/settings/users` | `GET`, `POST` | User account administration |

---

## 🧪 Automated Testing
Run the comprehensive integration test suite to verify all business rules:
```bash
npx tsx src/test-workflows.ts
```
Tests verified:
- Password hashing and authentication validation.
- Double-booking prevention during concurrent slot scheduling.
- Automatic inventory deduction during multi-item POS sales.
- Customer lifetime spend recalculation.
- Expense tracking and net profit calculation.
