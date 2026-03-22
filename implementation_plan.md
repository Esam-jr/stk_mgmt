# Stock Management System – Implementation Plan

A multi-branch stock management system supporting **Super Admin**, **Main Admin**, and **Sales** roles. Built with **Next.js 14 (App Router)**, **Prisma ORM**, **PostgreSQL** (Docker), and **better-auth** for authentication.

---

## Proposed Changes

### Project Scaffold & Configuration

#### [NEW] Project root – `c:\Users\hp\Desktop\My projects\stk_mgmt`

- Scaffold via `npx create-next-app@latest` with TypeScript, App Router, Tailwind CSS, and ESLint.
- Install dependencies:
  - `prisma`, `@prisma/client`
  - `better-auth`
  - `@prisma/adapter-pg`, `pg`
  - `zod` (schema validation)
  - `recharts` (charts for reports)
  - `react-hot-toast` (notifications)

#### [NEW] `docker-compose.yml`

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: stk_user
      POSTGRES_PASSWORD: stk_pass
      POSTGRES_DB: stk_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

#### [NEW] `.env`

```
DATABASE_URL="postgresql://stk_user:stk_pass@localhost:5432/stk_db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

---

### Database Layer (Prisma)

#### [NEW] `prisma/schema.prisma`

Models:

| Model | Key Fields |
|---|---|
| `User` | id, firstName, lastName, email, password (hashed), role (SUPER_ADMIN \| MAIN_ADMIN \| SALES), branchId? |
| `Branch` | id, name, location, createdAt |
| `Stock` | id, category, brand, size, quantity, barcode (auto-UUID), priceIn, sellingPrice, branchId |
| `Sale` | id, stockId, quantity, paymentMethod (CASH \| TRANSFER), soldBy (userId), branchId, createdAt |
| `StockTransfer` | id, stockId, fromBranchId, toBranchId, quantity, transferredBy (userId), createdAt |

#### [NEW] `prisma/seed.ts`

- Seeds one Super Admin user, two branches, and sample stock items.

---

### Authentication & Authorization

#### [NEW] `src/lib/auth.ts` – better-auth server instance

- Email + password authentication via `emailAndPassword` plugin.
- Prisma adapter connected to PostgreSQL.
- Role stored as a custom field on the session user.

#### [NEW] `src/app/api/auth/[...all]/route.ts`

- Mounts better-auth handler via `toNextJsHandler(auth)` (GET + POST).

#### [NEW] `src/lib/auth-client.ts` – better-auth browser client

- `createAuthClient()` used throughout UI components.

#### [NEW] `src/middleware.ts`

- Reads better-auth session cookie and protects routes by role:
  - `/super-admin/**` → SUPER_ADMIN only
  - `/main-admin/**` → MAIN_ADMIN only
  - `/sales/**` → SALES only
- Unauthenticated → redirect to `/login`

#### [NEW] `src/app/login/page.tsx`

- Sign-in form (email, password).

---

### Super Admin Module (`/super-admin`)

#### [NEW] `src/app/super-admin/layout.tsx`
Sidebar nav: Users | Branches | Stock Transfer | Reports

#### [NEW] `src/app/super-admin/users/page.tsx`
- Table of all users with Create / Edit / Delete actions.
- Create form: firstName, lastName, email, password, role, branchId.

#### [NEW] `src/app/super-admin/branches/page.tsx`
- Table of branches with Create / Edit / Delete.

#### [NEW] `src/app/super-admin/transfer/page.tsx`
- Select stock item, source branch, destination branch, quantity → transfer.

#### [NEW] `src/app/super-admin/reports/page.tsx`
- Sales over time chart (recharts), stock-level summary per branch.

---

### Main Admin Module (`/main-admin`)

> Main Admins see **all branches** and can manage each one independently — no branch restriction.

#### [NEW] `src/app/main-admin/layout.tsx`
Sidebar nav: Stock | Transfer | Reports

#### [NEW] `src/app/main-admin/stock/page.tsx`
- Full CRUD for stock items (category, brand, size, quantity, priceIn, sellingPrice).
- Branch selector at top — all branches visible.
- Barcode auto-generated (UUID, guaranteed unique per stock item).

#### [NEW] `src/app/main-admin/transfer/page.tsx`
- Same transfer UI as Super Admin.

#### [NEW] `src/app/main-admin/reports/page.tsx`
- Stock records for the admin's branch only.

---

### Sales Module (`/sales`)

#### [NEW] `src/app/sales/page.tsx`
- Search bar to look up stock (by name / barcode).
- Results card shows: brand, size, available quantity, price.
- Payment method dropdown (Cash / Transfer).
- **Sale** button → deducts quantity and creates a Sale record.
- If quantity = 0 → shows "❌ Out of Stock" feedback toast.

---

### API Routes (`/src/app/api`)

| Route | Method | Purpose |
|---|---|---|
| `/api/users` | GET, POST | List / create users |
| `/api/users/[id]` | PUT, DELETE | Edit / delete user |
| `/api/branches` | GET, POST | List / create branches |
| `/api/branches/[id]` | PUT, DELETE | Edit / delete branch |
| `/api/stock` | GET, POST | List / create stock |
| `/api/stock/[id]` | PUT, DELETE | Edit / delete stock |
| `/api/stock/search` | GET | Search stock by query |
| `/api/sales` | GET, POST | List / create sale |
| `/api/transfer` | GET, POST | List / create transfer |
| `/api/reports/sales` | GET | Aggregated sales data |
| `/api/reports/stock` | GET | Stock levels per branch |

---

## User Review Required

> [!NOTE]
> **Barcode**: Auto-generated as a unique UUID per stock item. Can be changed to EAN-13 or another format later.

> [!NOTE]
> **Main Admin branch access**: Sees and manages **all** branches independently.

> [!NOTE]
> **Sales branch scoping**: Sales users are linked to one branch and can only sell from that branch.

> [!WARNING]
> **Docker requirement**: PostgreSQL will run in Docker. Make sure Docker Desktop is installed and running on your machine before starting.

---

## Verification Plan

### Automated
- `npx prisma migrate dev` – confirms schema migrates without errors.
- `npx prisma db seed` – confirms seed completes successfully.
- `npm run build` – confirms no TypeScript / build errors.

### Manual (Browser Walkthrough per Role)

1. **Start services**: `docker compose up -d` then `npm run dev`
2. **Super Admin**
   - Log in with seeded super admin credentials.
   - Create a new branch, a new Main Admin user, and a Sales user.
   - Navigate to Stock Transfer and move stock between branches.
   - View Reports dashboard.
3. **Main Admin**
   - Log in with Main Admin credentials.
   - Add a new stock item, edit it, and delete it.
   - View stock reports.
4. **Sales**
   - Log in with Sales credentials.
   - Search for an in-stock item → select payment method → click Sale → verify quantity decremented.
   - Search for an out-of-stock item → verify feedback message.
