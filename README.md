# Stock Management System

A multi-branch inventory and sales management system built with **Next.js 16**, **Prisma**, **PostgreSQL**, and **better-auth**. Supports role-based access for Super Admins, Main Admins, and Sales staff.

---

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Framework    | Next.js 16.2 (App Router)                   |
| Language     | TypeScript                                  |
| Database     | PostgreSQL 16 (via Docker)                  |
| ORM          | Prisma 6.19                                 |
| Auth         | better-auth (email/password)                |
| Styling      | Tailwind CSS v4                             |
| Charts       | Recharts                                    |
| Validation   | Zod                                         |
| Icons        | lucide-react                                |
| Notifications| react-hot-toast                             |
| Export       | xlsx (Excel)                                |

---

## Roles & Permissions

| Role          | Capabilities                                                                 |
| ------------- | ---------------------------------------------------------------------------- |
| SUPER_ADMIN   | Full system access — users, branches, stock, transfers, activity, reports    |
| MAIN_ADMIN    | Branch-level stock management, transfers, sales history, reports             |
| SALES         | Point-of-sale checkout, sales history (own records only), returns            |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── activity/       – Activity log feed
│   │   ├── auth/           – better-auth route handler
│   │   ├── branches/       – Branch CRUD
│   │   ├── brands/         – Brand CRUD
│   │   ├── categories/     – Category CRUD
│   │   ├── reports/
│   │   │   ├── sales/      – Sales analytics (daily, by branch/category/product)
│   │   │   └── stock/      – Stock valuation & low-stock alerts
│   │   ├── sales/
│   │   │   ├── return/     – Process sale returns (restock)
│   │   │   └── route.ts    – List & create sales
│   │   ├── stock/
│   │   │   ├── import/     – Bulk stock import (up to 500 items)
│   │   │   ├── search/     – Stock search (barcode, name, brand, category)
│   │   │   └── route.ts    – List & create stock items
│   │   ├── transfer/       – Inter-branch stock transfers
│   │   └── users/          – User management (SUPER_ADMIN only)
│   ├── login/              – Login page
│   ├── sales/
│   │   ├── history/        – Sales staff order history
│   │   └── page.tsx        – Point-of-Sale terminal
│   ├── main-admin/         – Dashboard, stock, transfers, reports
│   ├── super-admin/        – Dashboard, users, branches, activity, reports
│   └── layout.tsx          – Root layout (dark/light theme, providers)
├── components/
│   ├── Providers.tsx       – Theme initializer & toast provider
│   ├── Sidebar.tsx         – Role-aware navigation sidebar
│   ├── ThemeToggle.tsx     – Dark/light mode toggle
│   ├── ui/                 – Button, DataTable, Input, Modal
│   ├── sales/              – SalesHistoryManager
│   ├── stock/              – BranchStockManager
│   └── transfer/           – StockTransferManager
└── lib/
    ├── auth.ts             – better-auth server configuration
    ├── auth-client.ts      – better-auth browser client (useSession, signIn, etc.)
    ├── prisma.ts           – Singleton Prisma client
    ├── activity.ts         – Activity logging utility
    └── utils.ts            – cn() classname merge helper
```

---

## Database Schema

- **User** – accounts with role (`SUPER_ADMIN`, `MAIN_ADMIN`, `SALES`) and optional branch assignment
- **Branch** – physical store locations
- **Category** / **Brand** – product taxonomy
- **Product** – product with cost & selling price, linked to brand, category, and branch
- **ProductVariant** – size/color variant with stock quantity and 3-digit barcode
- **Sale** – transaction record per variant
- **SaleReturn** – refund/return entries that increment stock back
- **StockTransfer** – movement of stock between branches
- **ActivityLog** – audit trail for all write operations
- **Session** / **Account** / **Verification** – better-auth tables

---

## Getting Started

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Configure environment

A `.env` file is already present with defaults for local development.

### 3. Install & migrate

```bash
npm install
npx prisma migrate dev
```

### 4. Seed sample data

```bash
npx tsx prisma/seed.ts
```

Seeded accounts (password: `password123`):

| Email             | Role         |
| ----------------- | ------------ |
| admin@stk.com     | SUPER_ADMIN  |
| manager@stk.com   | MAIN_ADMIN   |
| sales1@stk.com    | SALES        |

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script                | Description                  |
| --------------------- | ---------------------------- |
| `npm run dev`         | Start Next.js dev server     |
| `npm run build`       | Production build             |
| `npm run start`       | Start production server      |
| `npm run lint`        | Run ESLint                   |
| `npx prisma migrate`  | Run database migrations      |
| `npx prisma generate` | Regenerate Prisma client     |
| `npx tsx prisma/seed` | Seed the database            |

---

## Key Features

- **Point of Sale** – searchable product lookup, cart management, cash/transfer payment
- **Multi-branch stock** – products & variants scoped to branches
- **Stock transfers** – move inventory between branches with automatic variant matching
- **Bulk import** – import/update stock via JSON API (up to 500 items)
- **Sale returns** – process refunds with automatic stock restocking
- **Reports & analytics** – daily sales, revenue/profit breakdowns by branch, category, payment method, top products
- **Activity log** – full audit trail for stock, sales, transfers, brands, categories
- **Dark/light theme** – persisted user preference
