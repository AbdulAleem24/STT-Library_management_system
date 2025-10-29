# 🏗️ Library Management System - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                    ┌──────────────┐         │
│  │   ADMIN      │                    │   MEMBER     │         │
│  │              │                    │              │         │
│  │ • Full Access│                    │ • Own Data   │         │
│  │ • All CRUD   │                    │ • Read-Only  │         │
│  │ • Config     │                    │ • Self-Serve │         │
│  └──────┬───────┘                    └──────┬───────┘         │
│         │                                    │                 │
│         └────────────────┬───────────────────┘                 │
│                          │                                     │
│                          │ HTTP Requests                       │
│                          │ (JWT Token)                         │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Node.js + Express)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              MIDDLEWARE PIPELINE                          │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  1. CORS           → Allow cross-origin                   │ │
│  │  2. Body Parser    → Parse JSON                           │ │
│  │  3. Morgan         → Request logging                      │ │
│  │  4. Helmet         → Security headers                     │ │
│  │  5. Authenticate   → Verify JWT token                     │ │
│  │  6. Authorize      → Check role permissions               │ │
│  │  7. Validate       → express-validator                    │ │
│  │  8. Error Handler  → Consistent error responses           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          │                                     │
│                          ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    ROUTES (8 Modules)                     │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  /api/auth               → Login, Register                │ │
│  │  /api/borrowers          → Patron management              │ │
│  │  /api/biblio             → Catalog management             │ │
│  │  /api/items              → Physical items                 │ │
│  │  /api/circulation        → Checkout/Return/Renew          │ │
│  │  /api/reserves           → Holds/Requests                 │ │
│  │  /api/accounts           → Fines/Payments                 │ │
│  │  /api/system-preferences → Configuration (ADMIN)          │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                        │
│                       ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               CONTROLLERS (Thin Layer)                    │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  • Extract request data                                   │ │
│  │  • Call service methods                                   │ │
│  │  • Return standardized responses                          │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                        │
│                       ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │            SERVICES (Business Logic Layer)                │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  • Validate business rules                                │ │
│  │  • Calculate fines/due dates                              │ │
│  │  • Enforce checkout limits                                │ │
│  │  • Hash passwords (bcrypt)                                │ │
│  │  • Generate JWT tokens                                    │ │
│  │  • Manage transactions                                    │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                        │
│                       ▼                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              PRISMA CLIENT (ORM Layer)                    │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  • Type-safe database queries                             │ │
│  │  • Automatic migrations                                   │ │
│  │  • Relation management                                    │ │
│  │  • Connection pooling                                     │ │
│  └────────────────────┬──────────────────────────────────────┘ │
│                       │                                        │
└───────────────────────┼────────────────────────────────────────┘
                        │
                        │ SQL Queries
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               DATABASE LAYER (PostgreSQL 18.0)                  │
├─────────────────────────────────────────────────────────────────┤
│  Host: localhost:5433                                           │
│  Database: library_management                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    CORE TABLES (13)                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  1. categories          → Patron types                   │   │
│  │  2. itemtypes           → Material types                 │   │
│  │  3. biblio              → Books catalog                  │   │
│  │  4. items               → Physical copies                │   │
│  │  5. borrowers           → Patrons (with role)            │   │
│  │  6. issues              → Active checkouts               │   │
│  │  7. old_issues          → Checkout history               │   │
│  │  8. reserves            → Active holds                   │   │
│  │  9. old_reserves        → Hold history                   │   │
│  │ 10. accountlines        → Fines & payments               │   │
│  │ 11. systempreferences   → Configuration                  │   │
│  │ 12. action_logs         → Audit trail                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  AUTOMATED TRIGGERS (15)                 │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Update timestamps                                     │   │
│  │  • Archive completed checkouts                           │   │
│  │  • Update item status on checkout/return                 │   │
│  │  • Calculate overdue fines automatically                 │   │
│  │  • Enforce renewal limits                                │   │
│  │  • Track renewal counts                                  │   │
│  │  • Check item reservations                               │   │
│  │  • Enforce checkout limits                               │   │
│  │  • Auto-fill due dates                                   │   │
│  │  • Notify next patron in reserve queue                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PERFORMANCE INDEXES (45+)                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Primary keys on all tables                            │   │
│  │  • Foreign key indexes                                   │   │
│  │  • Full-text search indexes (GIN)                        │   │
│  │  • Partial indexes for active records                    │   │
│  │  • Compound indexes for queries                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                UTILITY FUNCTIONS (10+)                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • is_item_available()                                   │   │
│  │  • get_patron_checkout_count()                           │   │
│  │  • calculate_due_date()                                  │   │
│  │  • get_patron_fines()                                    │   │
│  │  • expire_old_holds()                                    │   │
│  │  • can_patron_checkout()                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization Flow

```
┌──────────────┐
│   CLIENT     │
│ (User Login) │
└──────┬───────┘
       │
       │ POST /api/auth/login
       │ { email, password }
       ▼
┌─────────────────────────────────┐
│   AUTH CONTROLLER               │
│  • Receive credentials          │
└──────┬──────────────────────────┘
       │
       │ Call authService.login()
       ▼
┌─────────────────────────────────┐
│   AUTH SERVICE                  │
│  1. Find user by email          │
│  2. Compare password (bcrypt)   │ ◄─── bcrypt.compare()
│  3. Generate JWT token          │ ◄─── jwt.sign()
│  4. Return token + user data    │
└──────┬──────────────────────────┘
       │
       │ Return { token, user }
       ▼
┌─────────────────────────────────┐
│   CLIENT                        │
│  • Store token in localStorage  │
│  • Include in future requests   │
└──────┬──────────────────────────┘
       │
       │ GET /api/borrowers
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────────────────┐
│   AUTHENTICATE MIDDLEWARE       │
│  1. Extract token from header   │
│  2. Verify token (jwt.verify)   │
│  3. Load user from database     │
│  4. Attach user to req.user     │
└──────┬──────────────────────────┘
       │
       │ req.user = { id, role, ... }
       ▼
┌─────────────────────────────────┐
│   AUTHORIZE MIDDLEWARE          │
│  1. Check req.user.role         │
│  2. Compare with allowed roles  │
│  3. Allow or deny access        │
└──────┬──────────────────────────┘
       │
       │ Role matches → Continue
       ▼
┌─────────────────────────────────┐
│   CONTROLLER                    │
│  • Process request              │
│  • Return response              │
└─────────────────────────────────┘
```

---

## Data Flow Example: Checkout Process

```
1. ADMIN initiates checkout
   │
   ├─→ POST /api/circulation/checkout
   │   { borrowernumber: 1, itemnumber: 100 }
   │
   ▼
2. Request passes through middleware
   │
   ├─→ authenticate()  → Verify JWT
   ├─→ authorize('ADMIN')  → Check role
   ├─→ validate()  → Check input
   │
   ▼
3. Controller receives validated request
   │
   ├─→ circulationController.checkout()
   │
   ▼
4. Service executes business logic
   │
   ├─→ Check: Is item available?
   ├─→ Check: Can patron checkout? (limits, fines, debarred)
   ├─→ Check: Is item reserved for someone else?
   ├─→ Calculate due date
   │
   ▼
5. Create checkout record
   │
   ├─→ INSERT INTO issues (...)
   │
   ▼
6. DATABASE TRIGGERS automatically execute
   │
   ├─→ update_item_on_checkout() → Set item.onloan, status='checked_out'
   ├─→ check_item_not_reserved() → Mark hold as fulfilled if exists
   ├─→ enforce_checkout_limit() → Prevent exceeding limit
   ├─→ auto_fill_due_date() → Calculate due date if not provided
   │
   ▼
7. Return success response
   │
   ├─→ { success: true, data: { issue_id, due_date, ... } }
   │
   ▼
8. CLIENT receives response
   │
   └─→ Show success message
       Update UI
```

---

## Role Permission Matrix

| Feature | Endpoint | ADMIN | MEMBER |
|---------|----------|-------|--------|
| **Authentication** |
| Register | POST /api/auth/register | ✅ | ✅ |
| Login | POST /api/auth/login | ✅ | ✅ |
| **Borrowers** |
| View All | GET /api/borrowers | ✅ | ❌ |
| View One | GET /api/borrowers/:id | ✅ | ❌ |
| View Own | GET /api/borrowers/me | ✅ | ✅ |
| Create | POST /api/borrowers | ✅ | ❌ |
| Update Any | PUT /api/borrowers/:id | ✅ | ❌ |
| Update Own | PUT /api/borrowers/me | ✅ | ✅ |
| Delete | DELETE /api/borrowers/:id | ✅ | ❌ |
| **Catalog** |
| Browse | GET /api/biblio | ✅ | ✅ |
| View Book | GET /api/biblio/:id | ✅ | ✅ |
| Add Book | POST /api/biblio | ✅ | ❌ |
| Edit Book | PUT /api/biblio/:id | ✅ | ❌ |
| Delete Book | DELETE /api/biblio/:id | ✅ | ❌ |
| **Items** |
| View All | GET /api/items | ✅ | ✅ |
| View One | GET /api/items/:id | ✅ | ✅ |
| Add Item | POST /api/items | ✅ | ❌ |
| Edit Item | PUT /api/items/:id | ✅ | ❌ |
| Delete Item | DELETE /api/items/:id | ✅ | ❌ |
| **Circulation** |
| View All Checkouts | GET /api/circulation | ✅ | ❌ |
| View Own Checkouts | GET /api/circulation/my-checkouts | ✅ | ✅ |
| Checkout Item | POST /api/circulation/checkout | ✅ | ❌ |
| Return Item | POST /api/circulation/return | ✅ | ❌ |
| Renew Item | POST /api/circulation/renew | ✅ | ✅ |
| View Overdue | GET /api/circulation/overdue | ✅ | ❌ |
| **Reserves** |
| View All Holds | GET /api/reserves | ✅ | ❌ |
| View Own Holds | GET /api/reserves/my-holds | ✅ | ✅ |
| Place Hold | POST /api/reserves | ✅ | ✅ |
| Cancel Hold | DELETE /api/reserves/:id | ✅ | ✅ (own) |
| **Accounts** |
| View All Fines | GET /api/accounts | ✅ | ❌ |
| View Own Fines | GET /api/accounts/my-fines | ✅ | ✅ |
| Create Fine | POST /api/accounts/fine | ✅ | ❌ |
| Process Payment | POST /api/accounts/payment | ✅ | ❌ |
| Forgive Fine | POST /api/accounts/forgive | ✅ | ❌ |
| **System** |
| View Preferences | GET /api/system-preferences | ✅ | ❌ |
| Update Preferences | PUT /api/system-preferences/:key | ✅ | ❌ |

**Legend:**
- ✅ = Full Access
- ✅ (own) = Own data only
- ❌ = No Access (403 Forbidden)

---

## Technology Stack Summary

### Backend
```
Runtime:      Node.js v22.17.0
Framework:    Express.js v4.19.2
ORM:          Prisma v6.18.0
Database:     PostgreSQL 18.0
Auth:         JWT (jsonwebtoken v9.0.2)
Security:     bcryptjs v2.4.3, helmet v7.1.0
Validation:   express-validator v7.0.1
Docs:         Swagger (swagger-ui-express v5.0.1)
Testing:      Jest v29.7.0 + Supertest v7.0.0
```

### Database Features
```
Tables:       13 core tables
Indexes:      45+ performance indexes
Triggers:     15 automated business logic
Functions:    10+ utility functions
Views:        4 reporting views
Normalization: 4NF (Fourth Normal Form)
```

### Security Features
```
Authentication:  JWT with configurable expiration
Password Hash:   bcrypt with 10 rounds (configurable)
Authorization:   Role-based (ADMIN/MEMBER)
CORS:           Enabled for cross-origin
Helmet:         Security headers
Validation:     All POST/PUT routes
Rate Limiting:  Can be added (express-rate-limit)
```

### API Features
```
Endpoints:    45+ RESTful APIs
Pagination:   ?page=1&limit=20 (max 100)
Sorting:      ?sortBy=field&order=asc|desc
Filtering:    Multiple query parameters
Search:       Full-text and fuzzy search
Responses:    Consistent JSON structure
Errors:       Proper HTTP status codes
```

---

## File Structure Overview

```
STT-Library_Management_System/
│
├── api/                               # Backend API
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema (ORM)
│   │   ├── seed.js                   # Initial data
│   │   └── migrations/               # Database versions
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js                # Environment variables
│   │   │
│   │   ├── controllers/              # Route handlers (8 files)
│   │   │   ├── authController.js
│   │   │   ├── borrowerController.js
│   │   │   ├── biblioController.js
│   │   │   ├── itemController.js
│   │   │   ├── circulationController.js
│   │   │   ├── reserveController.js
│   │   │   ├── accountController.js
│   │   │   └── systemPreferenceController.js
│   │   │
│   │   ├── services/                 # Business logic (8 files)
│   │   │   ├── authService.js
│   │   │   ├── borrowerService.js
│   │   │   ├── biblioService.js
│   │   │   ├── itemService.js
│   │   │   ├── circulationService.js
│   │   │   ├── reserveService.js
│   │   │   ├── accountService.js
│   │   │   └── systemPreferenceService.js
│   │   │
│   │   ├── routes/                   # API endpoints (9 files)
│   │   │   ├── index.js
│   │   │   ├── authRoutes.js
│   │   │   ├── borrowerRoutes.js
│   │   │   ├── biblioRoutes.js
│   │   │   ├── itemRoutes.js
│   │   │   ├── circulationRoutes.js
│   │   │   ├── reserveRoutes.js
│   │   │   ├── accountRoutes.js
│   │   │   └── systemPreferenceRoutes.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification
│   │   │   ├── validate.js           # Validation middleware
│   │   │   └── errorHandler.js       # Error handling
│   │   │
│   │   ├── validators/               # Input validation (8 files)
│   │   │   ├── authValidators.js
│   │   │   ├── borrowerValidators.js
│   │   │   └── ... (6 more)
│   │   │
│   │   ├── utils/
│   │   │   ├── apiError.js           # Custom error class
│   │   │   ├── apiResponse.js        # Response formatting
│   │   │   ├── pagination.js         # Pagination helpers
│   │   │   └── token.js              # JWT helpers
│   │   │
│   │   ├── docs/
│   │   │   └── swagger.js            # Swagger configuration
│   │   │
│   │   ├── app.js                    # Express app setup
│   │   ├── server.js                 # Entry point
│   │   └── prisma.js                 # Prisma client
│   │
│   ├── tests/                        # Test suites
│   │   ├── integration/              # API tests
│   │   └── unit/                     # Unit tests
│   │
│   ├── .env.example                  # Environment template
│   ├── package.json                  # Dependencies
│   └── README.md                     # Setup guide
│
├── docs/                             # Documentation
│   ├── 01-System-Overview.md
│   ├── 02-Tables-Detailed.md
│   ├── ... (12 documentation files)
│   └── API_Project_Report.md
│
├── library_management_schema_streamlined.sql  # SQL schema
├── PROJECT_ASSESSMENT_REPORT.md      # This report (detailed)
├── SUBMISSION_CHECKLIST.md           # Quick checklist
├── ARCHITECTURE_OVERVIEW.md          # This file
├── HOW_TO_RUN.md                     # Running guide
└── README.md                         # Main readme
```

---

## Performance Considerations

### Database Optimizations
- ✅ Strategic indexes on frequently queried columns
- ✅ Partial indexes for active records only
- ✅ GIN indexes for full-text search
- ✅ Connection pooling via Prisma
- ✅ Query optimization with EXPLAIN ANALYZE
- ✅ Normalized schema reduces redundancy

### API Optimizations
- ✅ Pagination prevents large result sets
- ✅ Selective field loading (Prisma select)
- ✅ Efficient query patterns
- ✅ Response caching (can be added)
- ✅ Compression middleware (can be added)

### Security Hardening
- ✅ Password hashing with salt rounds
- ✅ JWT token expiration
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (Helmet)
- ✅ CORS configuration
- ✅ Environment variable protection

---

## Scalability Roadmap

### Phase 1: Current (Complete) ✅
- Single PostgreSQL instance
- Stateless API server
- JWT authentication
- Role-based access control

### Phase 2: Enhanced (Future)
- Redis caching layer
- Rate limiting per user
- Background job processing (node-cron)
- Email/SMS notifications
- Audit log retention policy
- Database backups automation

### Phase 3: Production (Future)
- Load balancer (multiple API instances)
- Database replication (read replicas)
- Monitoring (Prometheus + Grafana)
- Logging aggregation (ELK stack)
- CI/CD pipeline
- Docker containerization

---

**Document Created:** October 29, 2025  
**System Version:** 1.0.0  
**Status:** Production Ready ✅
