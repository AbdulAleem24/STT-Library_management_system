# Library Management System – Comprehensive Test Plan

## 1. Goals & Scope
- Validate every exposed API route, service function, and Prisma data model.
- Confirm authentication, authorization, circulation, catalog, account, and configuration flows.
- Exercise database constraints, cascade behaviours, and default values defined in `prisma/schema.prisma`.
- Provide reusable test cases that can be automated and reported in CI.

## 2. Feature → Schema Coverage Matrix
| Feature Area | API Surface | Prisma Models | Key Constraints & Notes | Coverage Status |
|--------------|-------------|----------------|-------------------------|-----------------|
| Authentication & Profile | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | `Borrower`, `Role` enum | Unique `email`, `cardnumber`, password hash, JWT claims | ✓ Implemented in `authService`; requires hashing and token validation tests |
| Borrower Management | CRUD on `/borrowers` | `Borrower`, `Category` | FK `categorycode` → `Category`; optional address JSON; unique user fields | ✓ Controllers + validators exist; ensure pagination filters and soft constraints |
| Category Management | (No explicit route yet) | `Category` | PK `categorycode`, defaults on loan limits | ◻ Requires seed verification; consider admin endpoints |
| Bibliographic Records | `/biblio` routes | `Biblio`, optional `ItemType` FK | `isbn` unique; cascade items on delete | ✓ Basic CRUD present |
| Item Inventory | `/items` routes | `Item`, `Biblio`, `ItemType` | Unique barcode; cascade to account lines/reserves | ✓ CRUD present; confirm status transitions |
| Circulation (Issues) | `/circulation` routes | `Issue`, `Item`, `Borrower` | Unique `itemnumber`; due dates; renewals count | ✓ Needs due-date calc & conflict tests |
| Reservations | `/reserves` routes | `Reserve`, `Borrower`, `Biblio`, `Item` | Priority queue, optional `itemnumber`, cascade deletes | ✓ Validate queue ordering and cancellation |
| Account Lines & Fines | `/accounts` routes | `AccountLine`, `Borrower`, `Issue`, `Item` | Monetary precision, manager relation | ✓ Ensure outstanding balances update |
| System Preferences | `/system-preferences` routes | `SystemPreference` | PK `variable`, optional `value/type` | ✓ CRUD present |
| Health & Docs | `GET /health`, Swagger docs | n/a | Should reflect service status | ✓ Needs uptime check test |

*Status legend: ✓ code present; ◻ potential gap or requires additional implementation.*

## 3. Test Environment & Data Management
- **Environment variables:** provide `.env.test` with isolated `DATABASE_URL` pointing to a disposable PostgreSQL schema.
- **Database migrations:** execute `npx prisma migrate deploy` before integration/E2E test suites.
- **Seed data:** extend `prisma/seed.js` to support deterministic test fixtures (categories, item types, baseline users). Use transaction rollbacks per test when possible.
- **Authentication:** generate JWT secrets for tests via env or helper utility.
- **File naming:** place automated tests under `api/tests/**` grouped by layer (`unit`, `integration`, `e2e`).

## 4. Planned Test Suites
| Suite | Focus | Tooling | Trigger |
|-------|-------|---------|---------|
| Unit | Services, utils (`token`, `pagination`, validation helpers) | Jest, sinon (or built-in mocks) | `npm run test:unit` |
| Integration | Express routes + Prisma test DB | Supertest + Jest + Prisma test client | `npm run test:integration` |
| Contract | Swagger schema drift | `swagger-parser` or `jest-openapi` | `npm run test:contract` |
| Database | Constraint, migration, seed validation | `prisma` client + Jest | `npm run test:db` |
| Security | AuthZ, rate-limits, password hashing | OWASP ZAP baseline, dependency audit | `npm run test:security` |
| Performance (targeted) | Checkout/reservation throughput | Artillery or k6 | `npm run test:perf` (optional) |

## 5. Detailed API Test Cases
### 5.1 Authentication & Profile
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| AUTH-01 | Register new member | `Category` with `categorycode="A"` exists | POST `/auth/register` with valid payload | 201, response includes `user.borrowernumber`, JWT, hashed password in DB |
| AUTH-02 | Duplicate email rejected | Existing borrower with same email | POST `/auth/register` with duplicate email | 400/409, validation error message, no new borrower |
| AUTH-03 | Login success | Borrower exists with hashed password | POST `/auth/login` with correct credentials | 200, returns JWT and borrower profile |
| AUTH-04 | Login fails bad password | Borrower exists | POST `/auth/login` wrong password | 401, message `Invalid credentials` |
| AUTH-05 | Profile fetch authorized | Valid JWT | GET `/auth/me` with `Authorization: Bearer` | 200, returns borrower data sans password |
| AUTH-06 | Profile fails no token | None | GET `/auth/me` without header | 401, consistent error body |

### 5.2 Borrower Management
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| BOR-01 | List borrowers paginated | ≥15 borrowers seeded | GET `/borrowers?page=2&limit=5` | 200, `data` length 5, `meta.totalPages` correct |
| BOR-02 | Search by name | Borrowers with similar names | GET `/borrowers?search=smith` | 200, results filtered, case-insensitive |
| BOR-03 | Create borrower | Category exists | POST `/borrowers` with required fields | 201, stored borrower with default role `MEMBER` |
| BOR-04 | Validation failure | Missing required fields | POST `/borrowers` empty payload | 422, validator errors array |
| BOR-05 | Update borrower role | Admin token | PUT `/borrowers/:id` to change `role` | 200, DB reflects new role |
| BOR-06 | Delete borrower cascade | Borrower has no open issues | DELETE `/borrowers/:id` | 200, borrower removed, related reserves removed via cascade |
| BOR-07 | Delete blocked active issue | Borrower with `issues` row | DELETE `/borrowers/:id` | 409, prevents delete while issue exists |

### 5.3 Bibliographic Records
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| BIB-01 | Create bibliographic record | Item type available | POST `/biblio` valid payload | 201, `biblionumber` auto increments |
| BIB-02 | Duplicate ISBN rejected | Record exists with same ISBN | POST `/biblio` same ISBN | 409, unique constraint error surfaced |
| BIB-03 | Update metadata | Record exists | PUT `/biblio/:id` change fields | 200, updated fields, `updated_at` refreshed |
| BIB-04 | List with filters | Title substrings | GET `/biblio?search=history` | 200, filtered results |
| BIB-05 | Delete cascades items | Record has items | DELETE `/biblio/:id` | 200, all linked `items` removed via cascade |

### 5.4 Item Inventory
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| ITEM-01 | Create item | `Biblio` exists | POST `/items` with barcode | 201, barcode stored unique |
| ITEM-02 | Duplicate barcode blocked | Item exists | POST `/items` same barcode | 409, error message |
| ITEM-03 | Update status to checked out | Issue created | PATCH `/items/:id/status` (or PUT) | 200, `status`=`checked_out`, `status_date` set |
| ITEM-04 | Prevent checkout when notforloan | Item with `notforloan=true` | Attempt circulation checkout | 400, business error |
| ITEM-05 | Track issues counter | Item has two issues history | After checkout, check item record | `issues` incremented |
| ITEM-06 | Delete restricted by account line | Item linked to unpaid fine | DELETE `/items/:id` | 409, business rule block |

### 5.5 Circulation (Issues)
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| CIRC-01 | Checkout success | Borrower active, item available | POST `/circulation/checkout` | 201, `Issue` row created, item status updated |
| CIRC-02 | Exceed max loans | Borrower already at `max_checkout_count` | Checkout another item | 400, error referencing category limit |
| CIRC-03 | Due date default | Category loan period 14 days | Checkout item | `date_due` = issue date + 14 |
| CIRC-04 | Renewal success | Issue exists, under renewal cap | POST `/circulation/:id/renew` | 200, `renewals_count++`, `date_due` extended |
| CIRC-05 | Renewal blocked overdue | Item overdue beyond limit | Attempt renew | 403, message `Cannot renew overdue item` |
| CIRC-06 | Return clears issue | Issue active | POST `/circulation/:id/return` | 200, `returndate` set, item status `available` |
| CIRC-07 | Return with fine | Item overdue | POST return | Account line created, amount matches policy |

### 5.6 Reservations
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| RES-01 | Place hold | Borrower, biblio exist | POST `/reserves` | 201, priority assigned |
| RES-02 | Priority ordering | ≥3 holds on same biblio | GET `/reserves?biblio=:id` | 200, sorted by priority |
| RES-03 | Cancel hold | Reservation exists | DELETE `/reserves/:id` | 200, removed, queue reorders |
| RES-04 | Auto-cancel on expiration | Reservation expired | Scheduled job or cron simulation | Reservation flagged `cancellationdate` |
| RES-05 | Pickup fulfillment | Item available, hold waiting | POST `/reserves/:id/fulfill` | 200, creates issue, reserve marked collected |

### 5.7 Account Lines & Payments
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| ACC-01 | List outstanding fines | Borrower owes fines | GET `/accounts?borrowernumber=` | 200, totals in response |
| ACC-02 | Record manual payment | Fine exists | POST `/accounts/payments` | 201, `amountoutstanding` reduced |
| ACC-03 | Prevent overpayment | Payment > outstanding | POST payment | 400, validation message |
| ACC-04 | Manager approval | Manager borrower exists | POST fine with `manager_id` | 201, relation stored |
| ACC-05 | Cascade on borrower delete | Borrower removed | Delete borrower after settling | Account lines cascade or reassign |

### 5.8 System Preferences
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| PREF-01 | List preferences | Entries exist | GET `/system-preferences` | 200, array of variables |
| PREF-02 | Update preference | Variable exists | PUT `/system-preferences/:id` | 200, `updated_at` refreshed |
| PREF-03 | Create new preference | Unique key | POST new preference | 201, accessible via GET |
| PREF-04 | Prevent duplicate key | Variable exists | POST same variable | 409, constraint violation |

### 5.9 Health & Observability
| ID | Scenario | Preconditions | Steps | Expected Results |
|----|----------|---------------|-------|------------------|
| HLTH-01 | Health endpoint | Server running | GET `/health` | 200, `{ success: true }` |
| HLTH-02 | Swagger schema accessible | Server running | GET `/docs` (or configured path) | 200, UI loads |
| HLTH-03 | Logging emits request | API call performed | Inspect logger output | Request logged with status, duration |

## 6. Database Schema Validation Cases
| ID | Check | Method |
|----|-------|--------|
| DB-01 | Unique borrower identifiers (`cardnumber`, `email`, `userid`) enforced | Attempt inserts violating uniqueness; expect Prisma error |
| DB-02 | `Borrower.categorycode` FK integrity | Delete referenced category; expect Prisma/DB error or cascade policy |
| DB-03 | Cascade delete `Biblio -> Item` | Delete `biblio` with items; assert items removed |
| DB-04 | Cascade `Item -> Reserve` optional relation | Delete item; check dependent reserves state |
| DB-05 | `Issue.itemnumber` unique (one active loan) | Attempt second issue for same item; expect constraint fail |
| DB-06 | Decimal precision on monetary fields | Insert high-precision values; ensure rounding to (10,2) |
| DB-07 | Default timestamps populated | Insert records without timestamps; verify `created_at`, `updated_at` auto-filled |
| DB-08 | Role enum validation | Attempt invalid role string; expect Prisma validation |
| DB-09 | JSON address schema | Write malformed JSON; ensure stored as JSON and accessible |

## 7. Automation Strategy
### 7.1 Tooling Setup
1. Install dev dependencies:
   ```bash
   npm install --save-dev jest @swc/jest supertest sinon cross-env prisma-test-utils
   ```
2. Configure `jest.config.cjs` with separate projects (`unit`, `integration`).
3. Add `globalSetup`/`globalTeardown` scripts to create and drop a test schema using Prisma migrations.
4. Provide utility to generate JWT tokens and seed baseline data before each test suite.

### 7.2 NPM Scripts (add to `package.json`)
```json
"scripts": {
  "test": "npm run test:unit && npm run test:integration",
  "test:unit": "cross-env NODE_ENV=test jest --runInBand --selectProjects unit",
  "test:integration": "cross-env NODE_ENV=test jest --runInBand --selectProjects integration",
  "test:watch": "cross-env NODE_ENV=test jest --watch",
  "test:coverage": "cross-env NODE_ENV=test jest --coverage",
  "test:db": "node scripts/test-db-constraints.js"
}
```

### 7.3 Continuous Integration
- **GitHub Actions:** create `.github/workflows/test.yml` with jobs: install, cache npm, set up PostgreSQL service, run migrations, run test suites, upload coverage artifact.
- **Branch protection:** require `test` job success before merge.
- **Reporting:** integrate Jest coverage summary and `prisma migrate diff` output into PR comments via `actions/github-script`.

### 7.4 Scheduled Quality Gates
- Nightly cron job executes `test:coverage`, `npm audit --production`, and optional smoke tests against staging.
- Weekly load test (Artillery) to detect performance regressions in circulation and reserve flows.

## 8. Manual Regression Checklist
- Confirm swagger documentation matches implemented endpoints (compare `docs/swagger.js`).
- Verify environment fallback values (e.g., token secret) are configured for prod/test.
- Ensure error handler returns consistent JSON shape for assertions.
- Review seed data for admin accounts required by admin-only tests.

## 9. Residual Risks & Follow-ups
- Category and item type management endpoints appear absent; consider adding admin routes or direct DB seeding tests.
- Background jobs (expiration, holds fulfillment) require either cron simulation or dedicated worker tests once implemented.
- Performance baselines pending real-world circulation volume metrics.
- Security testing should include dependency scanning and JWT tampering tests.

## 10. Next Steps
1. Implement Jest + Supertest harness following section 7 and scaffold first unit tests for `authService` and `token` utils.
2. Extend `prisma/seed.js` with deterministic fixtures and optional reset function for tests.
3. Add GitHub Actions workflow to automate executions and surface pass/fail status per suite.
4. Gradually convert tables above into executable test specs, beginning with highest-risk areas (auth, circulation, fines).
