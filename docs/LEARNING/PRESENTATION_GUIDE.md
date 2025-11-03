# 🎤 Library Management API - Complete Presentation Guide

## 📋 Table of Contents

1. [Quick Overview (30 seconds)](#1-quick-overview)
2. [Visual Architecture (Flowcharts)](#2-visual-architecture)
3. [File Structure Explained](#3-file-structure-explained)
4. [Request Flow Examples](#4-request-flow-examples)
5. [Deep Dive: Each Component](#5-deep-dive-each-component)
6. [Extensive Q&A](#6-extensive-qa)

---

## 1. Quick Overview (30 seconds)

### What Is This?

**"I built a REST API for a Library Management System using Node.js, Express, and PostgreSQL."**

### What Does It Do?

- 📚 **Manages library catalog** (books, DVDs, magazines)
- 👤 **Handles member accounts** (registration, login, profiles)
- 🔄 **Processes circulation** (checkout, return, renew)
- 📌 **Manages holds** (reserve items that are checked out)
- 💰 **Calculates fines** (automatic late fees)
- 🔐 **Secure authentication** (JWT tokens, encrypted passwords)

### Tech Stack Summary

```
Frontend: None (API only - can be consumed by any frontend)
Backend: Node.js + Express
Database: PostgreSQL
ORM: Prisma
Auth: JWT + bcrypt
Validation: express-validator
Testing: Jest + Supertest
Documentation: Swagger/OpenAPI
```

---

## 2. Visual Architecture

### 2.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
│  (Web App / Mobile App / Postman / Swagger UI)              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Requests (JSON)
                         │ GET, POST, PUT, DELETE
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS API SERVER                        │
│                    (Port 4000)                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MIDDLEWARE LAYER                                     │  │
│  │  - CORS                                               │  │
│  │  - Helmet (Security Headers)                          │  │
│  │  - JSON Parser                                        │  │
│  │  - Authentication (JWT Verify)                        │  │
│  │  - Authorization (Role Check)                         │  │
│  │  - Validation (Input Check)                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ROUTES                                               │  │
│  │  /api/auth, /api/biblio, /api/circulation, etc.      │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CONTROLLERS                                          │  │
│  │  Handle HTTP request/response                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SERVICES                                             │  │
│  │  Business logic, database operations                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL Queries (via Prisma)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                       │
│  9 Tables: Borrowers, Biblio, Items, Issues, Reserves, etc. │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Project File Structure Flowchart

```
api/
│
├── server.js ──────────────┐ (1) Entry point - starts server
│                            │
├── app.js ─────────────────┤ (2) Express setup - configures app
│                            │
├── prisma.js ──────────────┤ (3) Database client
│                            │
├── .env ───────────────────┤ (4) Environment variables (secrets)
│                            │
├── config/ ────────────────┤ (5) Configuration
│   └── env.js              │     Loads & validates .env
│                            │
├── routes/ ────────────────┤ (6) URL DEFINITIONS
│   ├── index.js            │     Main router (combines all)
│   ├── authRoutes.js       │     /api/auth/*
│   ├── biblioRoutes.js     │     /api/biblio/*
│   └── ...                 │     Other routes
│                            │
├── middleware/ ────────────┤ (7) GATEKEEPERS
│   ├── auth.js             │     Check JWT, verify user
│   ├── validate.js         │     Check input data
│   └── errorHandler.js     │     Handle errors
│                            │
├── validators/ ────────────┤ (8) VALIDATION RULES
│   ├── authValidators.js   │     Rules for auth endpoints
│   ├── biblioValidators.js │     Rules for biblio endpoints
│   └── ...                 │
│                            │
├── controllers/ ───────────┤ (9) REQUEST HANDLERS
│   ├── authController.js   │     Handle auth requests
│   ├── biblioController.js │     Handle biblio requests
│   └── ...                 │
│                            │
├── services/ ──────────────┤ (10) BUSINESS LOGIC
│   ├── authService.js      │      Login, register logic
│   ├── biblioService.js    │      Catalog management
│   ├── circulationService.js│     Checkout, return logic
│   └── ...                 │
│                            │
├── utils/ ─────────────────┤ (11) HELPERS
│   ├── apiError.js         │      Error class
│   ├── apiResponse.js      │      Response formatter
│   ├── pagination.js       │      Pagination helper
│   └── token.js            │      JWT generation
│                            │
├── docs/ ──────────────────┤ (12) API DOCUMENTATION
│   └── swagger.js          │      Swagger config
│                            │
└── tests/ ─────────────────┘ (13) AUTOMATED TESTS
    ├── unit/                     Test individual functions
    ├── integration/              Test complete endpoints
    └── utils/                    Test helpers
```

---

### 2.3 Complete Request Flow (Step by Step)

```
USER ACTION: "Login to my account"
│
│ 1. User sends credentials
│    POST /api/auth/login
│    Body: { email: "john@example.com", password: "Pass123!" }
│
▼
┌─────────────────────────────────────────────────────────────┐
│ SERVER RECEIVES REQUEST                                      │
└─────────────────────────────────────────────────────────────┘
│
│ 2. Express applies middleware
│    ├─ helmet() → Adds security headers
│    ├─ cors() → Allows cross-origin requests
│    ├─ express.json() → Parses JSON body
│    └─ morgan() → Logs request
│
▼
┌─────────────────────────────────────────────────────────────┐
│ ROUTE MATCHING                                               │
│ routes/index.js → /api/auth → authRoutes.js                 │
└─────────────────────────────────────────────────────────────┘
│
│ 3. Route found: POST /api/auth/login
│    Middleware chain: validate(loginValidator) → login controller
│
▼
┌─────────────────────────────────────────────────────────────┐
│ VALIDATION                                                   │
│ validators/authValidators.js + middleware/validate.js       │
└─────────────────────────────────────────────────────────────┘
│
│ 4. Check input
│    ├─ Email format valid? ✓
│    ├─ Password provided? ✓
│    └─ No validation errors? ✓
│
▼
┌─────────────────────────────────────────────────────────────┐
│ CONTROLLER                                                   │
│ controllers/authController.js → login()                     │
└─────────────────────────────────────────────────────────────┘
│
│ 5. Controller extracts data from request
│    const { email, password } = req.body;
│
│ 6. Controller calls service
│    const user = await loginUser({ email, password });
│
▼
┌─────────────────────────────────────────────────────────────┐
│ SERVICE                                                      │
│ services/authService.js → loginUser()                       │
└─────────────────────────────────────────────────────────────┘
│
│ 7. Service performs business logic
│    ├─ Find user in database by email
│    ├─ User found? ✓
│    ├─ Compare password with stored hash (bcrypt)
│    ├─ Password matches? ✓
│    ├─ Update last seen timestamp
│    └─ Return user data (without password)
│
▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE                                                     │
│ Prisma → PostgreSQL                                          │
└─────────────────────────────────────────────────────────────┘
│
│ 8. Execute queries
│    SELECT * FROM borrowers WHERE email = 'john@example.com';
│    UPDATE borrowers SET lastseen = NOW() WHERE id = 1;
│
│ 9. Return results to service
│
▼
┌─────────────────────────────────────────────────────────────┐
│ BACK TO CONTROLLER                                           │
│ controllers/authController.js                                │
└─────────────────────────────────────────────────────────────┘
│
│ 10. Controller generates JWT token
│     const token = generateToken({ id: user.id, role: user.role });
│
│ 11. Controller formats response
│     successResponse(res, { user, token });
│
▼
┌─────────────────────────────────────────────────────────────┐
│ RESPONSE SENT TO CLIENT                                      │
└─────────────────────────────────────────────────────────────┘
│
│ 12. JSON response
│     {
│       "success": true,
│       "message": "Login successful",
│       "data": {
│         "user": { "id": 1, "name": "John Doe", ... },
│         "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
│       }
│     }
│
▼
USER: Receives token, stores it, uses for future requests
```

---

### 2.4 Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                         │
└──────────────────────────────────────────────────────────────┘

REGISTRATION:
┌─────────┐    POST /api/auth/register     ┌─────────┐
│ Client  │───────────────────────────────▶│  API    │
│         │  { email, password, name }     │         │
└─────────┘                                └────┬────┘
                                                │
                                                │ Hash password (bcrypt)
                                                │ Store in database
                                                │ Generate JWT
                                                ▼
┌─────────┐    { user, token }           ┌─────────┐
│ Client  │◀──────────────────────────────│  API    │
│ Stores  │                               │         │
│ Token   │                               └─────────┘
└─────────┘

LOGIN:
┌─────────┐    POST /api/auth/login       ┌─────────┐
│ Client  │───────────────────────────────▶│  API    │
│         │  { email, password }           │         │
└─────────┘                                └────┬────┘
                                                │
                                                │ Find user
                                                │ Verify password (bcrypt)
                                                │ Generate JWT
                                                ▼
┌─────────┐    { user, token }           ┌─────────┐
│ Client  │◀──────────────────────────────│  API    │
│ Stores  │                               │         │
│ Token   │                               └─────────┘
└─────────┘

PROTECTED REQUEST:
┌─────────┐    GET /api/biblio            ┌─────────┐
│ Client  │───────────────────────────────▶│  API    │
│         │  Authorization: Bearer token   │         │
└─────────┘                                └────┬────┘
                                                │
                                        ┌───────▼────────┐
                                        │ Middleware:    │
                                        │ authenticate   │
                                        └───────┬────────┘
                                                │
                                                │ Verify JWT signature
                                                │ Check expiration
                                                │ Load user from DB
                                                │ Attach to req.user
                                                ▼
                                        ┌────────────────┐
                                        │ Controller     │
                                        │ (req.user      │
                                        │  available)    │
                                        └───────┬────────┘
                                                │
                                                ▼
┌─────────┐    { data: [...] }         ┌─────────┐
│ Client  │◀──────────────────────────────│  API    │
└─────────┘                               └─────────┘
```

---

### 2.5 Checkout Flow (Business Logic Example)

```
┌──────────────────────────────────────────────────────────────┐
│              CHECKOUT ITEM FLOW                               │
└──────────────────────────────────────────────────────────────┘

POST /api/circulation/checkout
Body: { borrowernumber: 1, barcode: "BOOK001" }
│
▼
┌─────────────────────────────────────┐
│ 1. AUTHENTICATION                   │
│    ✓ JWT valid?                     │
│    ✓ User logged in?                │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ 2. AUTHORIZATION                    │
│    ✓ Member checking out for self?  │
│    ✓ OR Admin?                      │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ 3. VALIDATION                       │
│    ✓ Borrower ID provided?          │
│    ✓ Barcode OR Item number?        │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ 4. BUSINESS LOGIC CHECKS            │
│                                     │
│    Check #1: Borrower exists? ──────┼───✗──▶ 404 Error
│    ✓ Found in database              │
│                                     │
│    Check #2: Is borrower suspended? │
│    ✓ debarred = null                │
│                                     │
│    Check #3: Membership expired?    │
│    ✓ dateexpiry > today             │
│                                     │
│    Check #4: Item exists? ──────────┼───✗──▶ 404 Error
│    ✓ Found by barcode               │
│                                     │
│    Check #5: Item available? ───────┼───✗──▶ 409 Error
│    ✓ status = 'available'           │
│                                     │
│    Check #6: Item loanable? ────────┼───✗──▶ 403 Error
│    ✓ notforloan = false             │
│                                     │
│    Check #7: Item reserved? ────────┼───✗──▶ 403 Error
│    ✓ No active holds for others     │
│                                     │
│    Check #8: Checkout limit? ───────┼───✗──▶ 403 Error
│    ✓ Current checkouts < max        │
│                                     │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ 5. TRANSACTION (All or Nothing)     │
│                                     │
│    Step A: Calculate due date       │
│    today + loan_period_days         │
│                                     │
│    Step B: Create Issue record      │
│    INSERT INTO issues (...)         │
│                                     │
│    Step C: Update Item status       │
│    UPDATE items                     │
│    SET status = 'checked_out'       │
│                                     │
│    Step D: Mark any holds fulfilled │
│    UPDATE reserves                  │
│    SET found = 'P'                  │
│                                     │
│    ✓ All steps succeed              │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ 6. RESPONSE                         │
│    {                                │
│      "success": true,               │
│      "data": {                      │
│        "issue_id": 42,              │
│        "due_date": "2024-11-24"     │
│      }                              │
│    }                                │
└─────────────────────────────────────┘
```

---

## 3. File Structure Explained (Plain English)

### Why Each File Exists

#### **server.js** - The Ignition Key
```javascript
// "Starts the car"
// Imports app and tells it to listen on port 4000
// Like turning the key to start your server
```
**Purpose**: Entry point that starts the Express server

---

#### **app.js** - The Car Assembly Line
```javascript
// "Assembles all the parts"
// Sets up middleware (security, parsing, logging)
// Connects routes
// Adds error handling
// Like putting together a car before you can drive it
```
**Purpose**: Configures Express application

---

#### **prisma.js** - The Database Key
```javascript
// "Opens the database door"
// Creates a single connection to PostgreSQL
// Used throughout the app to query data
// Like having one key to access the filing cabinet
```
**Purpose**: Database client that all services use

---

#### **config/env.js** - The Settings File
```javascript
// "Loads secret settings"
// Reads .env file
// Provides database URL, JWT secret, etc.
// Like reading your preferences/settings
```
**Purpose**: Centralized configuration management

---

#### **routes/*** - The Menu
```javascript
// "Lists what you can order"
// Defines URL paths (GET /api/biblio, POST /api/auth/login)
// Says which middleware to use
// Says which controller to call
// Like a restaurant menu listing dishes
```
**Purpose**: Maps URLs to handlers

---

#### **middleware/auth.js** - The Security Guard
```javascript
// "Checks your ID at the door"
// Verifies JWT token
// Loads user information
// Checks permissions (admin vs member)
// Like a bouncer at a club
```
**Purpose**: Authentication and authorization

---

#### **middleware/validate.js** - The Quality Inspector
```javascript
// "Checks if your order is valid"
// Runs validation rules
// Checks for errors
// Rejects bad data
// Like a form checker before submission
```
**Purpose**: Input validation middleware

---

#### **middleware/errorHandler.js** - The Cleanup Crew
```javascript
// "Catches mistakes and explains them nicely"
// Catches all errors
// Formats error messages
// Sends proper HTTP status codes
// Like customer service fixing problems
```
**Purpose**: Centralized error handling

---

#### **validators/*** - The Rule Books
```javascript
// "Rules for what data is acceptable"
// Email must be valid format
// Password must be 6+ characters
// ISBN must match pattern
// Like form validation rules
```
**Purpose**: Define validation schemas

---

#### **controllers/*** - The Order Takers
```javascript
// "Takes your order and passes it to the kitchen"
// Receives HTTP request
// Extracts data (body, params, query)
// Calls service
// Sends HTTP response
// Like a waiter taking your order
```
**Purpose**: Handle HTTP request/response

---

#### **services/*** - The Kitchen
```javascript
// "Where the actual work happens"
// Business logic lives here
// Database operations (via Prisma)
// Calculations (due dates, fines)
// Validation of business rules
// Like chefs cooking your meal
```
**Purpose**: Business logic and database operations

---

#### **utils/*** - The Tool Box
```javascript
// "Reusable helper tools"
// apiError.js → Custom error class
// apiResponse.js → Standard response format
// pagination.js → Calculate pages
// token.js → Generate/verify JWT
// Like having a Swiss Army knife
```
**Purpose**: Reusable utility functions

---

#### **docs/swagger.js** - The Instruction Manual
```javascript
// "Automatic API documentation"
// Reads comments in route files
// Generates interactive docs
// Available at /docs endpoint
// Like a user manual
```
**Purpose**: API documentation generation

---

#### **tests/*** - The Quality Assurance Team
```javascript
// "Makes sure everything works"
// unit/ → Test individual functions
// integration/ → Test complete flows
// utils/ → Helper functions for tests
// Like quality control inspectors
```
**Purpose**: Automated testing

---

## 4. Request Flow Examples

### Example 1: Register a New User

**The Simple Version:**
1. User fills out registration form
2. Data sent to API
3. API validates data
4. Password is encrypted
5. User saved to database
6. JWT token generated
7. User receives token

**The Detailed Version:**

```javascript
// 1. CLIENT SENDS REQUEST
POST /api/auth/register
Content-Type: application/json

{
  "cardnumber": "CARD001",
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "categorycode": "ADULT"
}

// 2. EXPRESS RECEIVES (app.js middleware)
// → helmet() adds security headers
// → cors() allows cross-origin
// → express.json() parses JSON
// → morgan() logs request

// 3. ROUTE MATCHING (routes/index.js → routes/authRoutes.js)
router.post('/register', 
  validate(registerValidator),  // ← Validation first
  register                       // ← Then controller
);

// 4. VALIDATION (middleware/validate.js)
// Runs validators/authValidators.js rules:
// ✓ cardnumber: required, 3-50 chars
// ✓ fullName: required, 2-100 chars
// ✓ email: valid email format
// ✓ password: min 6 chars, contains number
// ✓ categorycode: valid category

// 5. CONTROLLER (controllers/authController.js)
export const register = async (req, res, next) => {
  try {
    // Call service
    const user = await registerUser(req.body);
    
    // Generate token
    const token = generateToken({ id: user.borrowernumber, role: user.role });
    
    // Send response
    return successResponse(res, {
      status: 201,
      message: 'Registration successful',
      data: { user, token }
    });
  } catch (error) {
    return next(error);  // Pass to error handler
  }
};

// 6. SERVICE (services/authService.js)
export const registerUser = async ({ cardnumber, fullName, email, password, categorycode }) => {
  // Check if card number exists
  const existing = await prisma.borrower.findUnique({ where: { cardnumber } });
  if (existing) throw new ApiError(409, 'Card number already exists');
  
  // Check if email exists
  if (email) {
    const existingEmail = await prisma.borrower.findUnique({ where: { email } });
    if (existingEmail) throw new ApiError(409, 'Email already registered');
  }
  
  // Verify category exists
  const category = await prisma.category.findUnique({ where: { categorycode } });
  if (!category) throw new ApiError(422, 'Invalid category');
  
  // Hash password (bcrypt with salt rounds = 10)
  const hashed = await bcrypt.hash(password, 10);
  
  // Create borrower
  const borrower = await prisma.borrower.create({
    data: {
      cardnumber,
      full_name: fullName,
      email,
      password: hashed,  // ← Store hashed, not plain text!
      categorycode,
      role: 'MEMBER'
    }
  });
  
  // Remove password from response
  const { password: _, ...safe } = borrower;
  return safe;
};

// 7. RESPONSE SENT
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "borrowernumber": 1,
      "cardnumber": "CARD001",
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "role": "MEMBER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6Ik1FTUJFUiIsImlhdCI6MTYzOTk5OTk5OX0.abc123..."
  }
}
```

---

### Example 2: View Catalog (Protected Route)

**The Simple Version:**
1. User sends token with request
2. API verifies token
3. API fetches books from database
4. Books sent back with pagination info

**The Detailed Version:**

```javascript
// 1. CLIENT SENDS REQUEST WITH TOKEN
GET /api/biblio?page=1&limit=20&search=gatsby
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 2. ROUTE (routes/biblioRoutes.js)
router.get('/', authenticate, index);
//               ^^^^^^^^^^^^  ← Middleware runs first
//                            ^^^^^ Then controller

// 3. AUTHENTICATION MIDDLEWARE (middleware/auth.js)
export const authenticate = async (req, res, next) => {
  // Extract token from header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new ApiError(401, 'Token missing');
  
  // Verify token
  const decoded = jwt.verify(token, config.jwtSecret);
  // decoded = { id: 1, role: 'MEMBER', iat: ..., exp: ... }
  
  // Load user from database
  const user = await prisma.borrower.findUnique({ where: { borrowernumber: decoded.id } });
  if (!user) throw new ApiError(401, 'Invalid token');
  
  // Attach user to request
  req.user = { id: user.borrowernumber, role: user.role, name: user.full_name };
  
  // Continue to controller
  next();
};

// 4. CONTROLLER (controllers/biblioController.js)
export const index = async (req, res, next) => {
  try {
    // Extract query params
    const { page, limit, search, itemtype } = req.query;
    
    // Call service
    const result = await listBiblios({ page, limit, search, itemtype });
    
    // Send response
    return successResponse(res, {
      data: result.data,
      meta: result.meta  // Pagination info
    });
  } catch (error) {
    return next(error);
  }
};

// 5. SERVICE (services/biblioService.js)
export const listBiblios = async ({ page = 1, limit = 20, search, itemtype }) => {
  // Calculate pagination
  const skip = (page - 1) * limit;  // page 1: skip 0, page 2: skip 20
  
  // Build WHERE clause
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { author: { contains: search, mode: 'insensitive' } },
      { isbn: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (itemtype) {
    where.itemtype = itemtype;
  }
  
  // Query database (parallel for efficiency)
  const [total, biblios] = await Promise.all([
    prisma.biblio.count({ where }),
    prisma.biblio.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' }
    })
  ]);
  
  // Calculate metadata
  return {
    data: biblios,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
};

// 6. RESPONSE SENT
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "biblionumber": 1,
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn": "9780743273565",
      "itemtype": "BOOK",
      ...
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

## 5. Deep Dive: Each Component

### 5.1 Authentication Deep Dive

**How JWT Works in Your System:**

```javascript
// REGISTRATION/LOGIN: Generate Token
const payload = { 
  id: 1,           // User ID
  role: 'MEMBER'   // User role
};

const token = jwt.sign(
  payload,                     // Data to encode
  'your-secret-key',          // Secret (from .env)
  { expiresIn: '1d' }         // Valid for 24 hours
);

// Token structure:
// eyJhbGci...    HEADER (algorithm, type)
//   .
// eyJpZCI...     PAYLOAD (id, role, iat, exp)
//   .
// SflKxw...      SIGNATURE (proves not tampered)

// PROTECTED REQUESTS: Verify Token
const decoded = jwt.verify(token, 'your-secret-key');
// If valid: { id: 1, role: 'MEMBER', iat: 1639999999, exp: 1640086399 }
// If invalid/expired: Throws error
```

**Why This Approach?**
- ✅ Stateless (server doesn't store sessions)
- ✅ Scalable (works across multiple servers)
- ✅ Secure (can't forge without secret key)
- ✅ Self-contained (all data in token)

---

**How Bcrypt Works:**

```javascript
// REGISTRATION: Hash Password
const password = "MyPassword123!";
const hashed = await bcrypt.hash(password, 10);
// Result: "$2a$10$abc...xyz" (60 characters)

// Store ONLY the hash in database, never plain password

// LOGIN: Verify Password
const isValid = await bcrypt.compare("MyPassword123!", hashed);
// Returns: true (if match) or false (if doesn't match)

// Bcrypt is one-way:
// password → hash ✓ (easy)
// hash → password ✗ (impossible)
```

**Why Bcrypt?**
- ✅ One-way (can't reverse)
- ✅ Salted (same password = different hashes for different users)
- ✅ Slow (makes brute force attacks impractical)
- ✅ Configurable (cost factor can increase over time)

---

### 5.2 Database Operations Deep Dive

**Prisma Basics:**

```javascript
// CREATE
const user = await prisma.borrower.create({
  data: {
    cardnumber: 'CARD001',
    full_name: 'John Doe',
    email: 'john@example.com',
    password: hashedPassword,
    categorycode: 'ADULT'
  }
});

// READ (one)
const user = await prisma.borrower.findUnique({
  where: { borrowernumber: 1 }
});

// READ (many with filters)
const books = await prisma.biblio.findMany({
  where: {
    title: { contains: 'Harry', mode: 'insensitive' },
    itemtype: 'BOOK'
  },
  skip: 0,
  take: 20,
  orderBy: { created_at: 'desc' }
});

// UPDATE
const updated = await prisma.borrower.update({
  where: { borrowernumber: 1 },
  data: { email: 'newemail@example.com' }
});

// DELETE
await prisma.biblio.delete({
  where: { biblionumber: 1 }
});

// TRANSACTION (all or nothing)
await prisma.$transaction(async (tx) => {
  // Step 1: Create checkout
  const issue = await tx.issue.create({ ... });
  
  // Step 2: Update item
  await tx.item.update({ ... });
  
  // Both succeed or both fail
});
```

**Why Prisma?**
- ✅ Type-safe (catches errors at compile time)
- ✅ Auto-completion (editor suggests fields)
- ✅ Prevents SQL injection (parameterized queries)
- ✅ Migration system (tracks database changes)
- ✅ Readable queries (JavaScript, not SQL strings)

---

### 5.3 Business Logic Example: Checkout

**All Validation Checks:**

```javascript
export const checkoutItem = async ({ borrowernumber, itemnumber }, actor) => {
  return prisma.$transaction(async (tx) => {
    
    // CHECK 1: Borrower exists
    const borrower = await tx.borrower.findUnique({
      where: { borrowernumber },
      include: { category: true }
    });
    if (!borrower) {
      throw new ApiError(404, 'Borrower not found');
    }
    
    // CHECK 2: Not suspended
    if (borrower.debarred && borrower.debarred >= new Date()) {
      throw new ApiError(403, 'Borrower is suspended');
    }
    
    // CHECK 3: Membership not expired
    if (borrower.dateexpiry && borrower.dateexpiry < new Date()) {
      throw new ApiError(403, 'Membership expired');
    }
    
    // CHECK 4: Item exists
    const item = await tx.item.findUnique({ where: { itemnumber } });
    if (!item) {
      throw new ApiError(404, 'Item not found');
    }
    
    // CHECK 5: Item can be loaned
    if (item.notforloan) {
      throw new ApiError(403, 'Item cannot be loaned');
    }
    
    // CHECK 6: Item is available
    if (item.status !== 'available') {
      throw new ApiError(409, `Item is ${item.status}`);
    }
    
    // CHECK 7: No conflicting holds
    const hold = await tx.reserve.findFirst({
      where: {
        itemnumber,
        borrowernumber: { not: borrowernumber },
        cancellationdate: null
      }
    });
    if (hold) {
      throw new ApiError(403, 'Item reserved for another member');
    }
    
    // CHECK 8: Not over checkout limit
    const currentCount = await tx.issue.count({
      where: { borrowernumber, returndate: null }
    });
    if (currentCount >= borrower.category.max_checkout_count) {
      throw new ApiError(403, 'Checkout limit reached');
    }
    
    // ALL CHECKS PASSED - PROCEED WITH CHECKOUT
    
    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + borrower.category.loan_period_days);
    
    // Create checkout record
    const issue = await tx.issue.create({
      data: {
        borrowernumber,
        itemnumber,
        date_due: dueDate
      }
    });
    
    // Update item
    await tx.item.update({
      where: { itemnumber },
      data: {
        status: 'checked_out',
        onloan: dueDate,
        issues: { increment: 1 }
      }
    });
    
    return issue;
  });
};
```

**Why So Many Checks?**
- Ensures business rules are enforced
- Prevents invalid states in database
- Provides clear error messages
- Maintains data integrity

---

### 5.4 Error Handling Deep Dive

**How Errors Flow:**

```javascript
// SOMEWHERE IN YOUR CODE: Error occurs
throw new ApiError(404, 'Book not found');

// ↓

// CONTROLLER: Catches error
export const show = async (req, res, next) => {
  try {
    const book = await getBiblio(req.params.id);
    return successResponse(res, { data: book });
  } catch (error) {
    return next(error);  // ← Passes to error handler
  }
};

// ↓

// ERROR HANDLER MIDDLEWARE: Formats error
export const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.status || 500;
  let message = err.message || 'Internal server error';
  
  // Handle Prisma errors
  if (err.code === 'P2002') {  // Unique constraint
    statusCode = 409;
    message = 'Record already exists';
  } else if (err.code === 'P2025') {  // Record not found
    statusCode = 404;
    message = 'Record not found';
  }
  
  // Send response
  return res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message,
      ...(err.errors && { errors: err.errors })
    }
  });
};

// ↓

// CLIENT RECEIVES:
HTTP/1.1 404 Not Found
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Book not found"
  }
}
```

**Standard Error Responses:**

| Status Code | Meaning | Example |
|------------|---------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Not admin, can't perform action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, item already checked out |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Unexpected server error |

---

## 6. Extensive Q&A

### General Architecture

**Q: Why separate routes, controllers, and services?**

**A:** Separation of concerns - each layer has one job:
- **Routes**: Define URLs and middleware chain
- **Controllers**: Handle HTTP (request/response)
- **Services**: Handle business logic and database

This makes code:
- Easier to test (can test services without HTTP)
- Easier to maintain (change one without affecting others)
- Reusable (services can be called from anywhere)

---

**Q: What's the difference between middleware and controllers?**

**A:**
- **Middleware**: Runs BEFORE controller, modifies request, can block request
  - Example: Check if user is logged in
- **Controllers**: Final destination, handles the actual request
  - Example: Fetch books and return them

Think of middleware as checkpoints on a road, controller is the destination.

---

**Q: Why use Prisma instead of raw SQL?**

**A:**
- **Safety**: Prevents SQL injection automatically
- **Type safety**: Catches errors before running
- **Auto-completion**: Editor knows your database schema
- **Migrations**: Tracks database changes
- **Cleaner code**: `prisma.user.findMany()` vs long SQL strings

---

**Q: What happens if two people checkout the same book at the same time?**

**A:** Database transaction with locks prevents this:
```javascript
await prisma.$transaction(async (tx) => {
  // Database locks the item row
  const item = await tx.item.findUnique({ where: { itemnumber } });
  
  // Only first request gets here, second waits
  if (item.status !== 'available') {
    throw new Error('Already checked out');
  }
  
  await tx.item.update({ ... });
});
```

First person succeeds, second gets "already checked out" error.

---

### Authentication & Security

**Q: Why not store passwords in plain text?**

**A:** If database is hacked:
- **Plain text**: Attacker has all passwords immediately
- **Hashed**: Attacker has useless gibberish

Bcrypt is one-way - can't convert hash back to password.

---

**Q: Can someone fake a JWT token?**

**A:** No, because of the signature:
- Token has 3 parts: header.payload.signature
- Signature = encrypt(header + payload, secret_key)
- Attacker doesn't know secret_key
- If they change payload, signature becomes invalid
- Server rejects invalid signature

---

**Q: What if JWT is stolen?**

**A:** Token can be used until it expires (24 hours):
- **Mitigation**: Short expiration time
- **Mitigation**: HTTPS (encrypt transmission)
- **Mitigation**: HttpOnly cookies (can't be accessed by JavaScript)
- **Detection**: Check unusual login locations/patterns

---

**Q: Why do we verify the user still exists even with valid JWT?**

**A:** User might have been:
- Deleted
- Suspended (debarred)
- Role changed

Always verify critical state from database.

---

### Database & Business Logic

**Q: What's a transaction and why use it?**

**A:** Transaction = group of database operations that must ALL succeed or ALL fail.

Example: Checkout
- Create issue record
- Update item status

If power goes out after step 1, database rolls back both. Data stays consistent.

---

**Q: How are overdue fines calculated?**

**A:**
```javascript
// On return
const now = new Date();
const dueDate = issue.date_due;
const daysLate = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));

if (daysLate > 0) {
  const finePerDay = 0.25; // From system preferences
  const totalFine = daysLate * finePerDay;
  
  // Create fine record
  await prisma.accountLine.create({
    data: {
      borrowernumber: issue.borrowernumber,
      amount: totalFine,
      amountoutstanding: totalFine,
      description: `${daysLate} days overdue`
    }
  });
}
```

---

**Q: What prevents unlimited renewals?**

**A:** System preferences + database check:
```javascript
const maxRenewals = await getSystemPreference('max_renewals', 3);

if (issue.renewals_count >= maxRenewals) {
  throw new Error('Maximum renewals reached');
}
```

---

**Q: How does the hold queue work?**

**A:** Priority field:
- First person to place hold: priority = 1
- Second person: priority = 2
- When item returned: lowest priority (1) gets it
- When person #1 picks up, everyone moves up

```javascript
// Find next person in line
const nextReserve = await prisma.reserve.findFirst({
  where: { biblionumber, cancellationdate: null },
  orderBy: { priority: 'asc' }  // Lowest first
});
```

---

### Testing

**Q: What's the difference between unit and integration tests?**

**A:**
- **Unit test**: Test one function in isolation
  - Example: Test token generation
  - Fast, no database
- **Integration test**: Test complete endpoint
  - Example: Test login endpoint
  - Slower, uses database

---

**Q: Why reset database before each test?**

**A:** Tests must be **isolated** and **repeatable**:
- Test 1 creates user "john@test.com"
- Without reset, Test 2 sees that user
- Test 2 might fail because of Test 1

Reset ensures clean state every time.

---

**Q: How do I test protected endpoints?**

**A:**
```javascript
// Create user with token
const { token } = await createMemberWithToken();

// Use token in request
const response = await request(app)
  .get('/api/biblio')
  .set('Authorization', `Bearer ${token}`);

expect(response.status).toBe(200);
```

---

### Performance & Scalability

**Q: How does pagination improve performance?**

**A:** Instead of sending 10,000 records:
```javascript
// Bad: All records
const all = await prisma.biblio.findMany();  // Slow, huge response

// Good: One page
const page = await prisma.biblio.findMany({
  skip: 0,
  take: 20  // Only 20 records
});
```

Faster query, smaller response, better UX.

---

**Q: Why use Promise.all() for count and data queries?**

**A:** Run in parallel instead of sequential:
```javascript
// Sequential: ~200ms
const total = await prisma.biblio.count();  // 100ms
const data = await prisma.biblio.findMany();  // 100ms

// Parallel: ~100ms
const [total, data] = await Promise.all([
  prisma.biblio.count(),      // Both run
  prisma.biblio.findMany()    // at same time
]);
```

---

**Q: How would this scale to millions of users?**

**A:** Would add:
- **Caching**: Redis for frequently accessed data
- **Database indexing**: Faster queries
- **Load balancing**: Multiple API servers
- **Database replicas**: Read from replicas, write to master
- **CDN**: Static assets served globally
- **Queue system**: Background jobs for slow operations

---

### Deployment & Production

**Q: How do I deploy this?**

**A:** Steps:
1. Choose hosting (Heroku, AWS, DigitalOcean, etc.)
2. Set up PostgreSQL database
3. Set environment variables (.env)
4. Run migrations: `npx prisma migrate deploy`
5. Start server: `npm start`
6. Use process manager (PM2) to keep alive

---

**Q: What's different in production?**

**A:**
- Use HTTPS (not HTTP)
- Use strong JWT secret
- Enable rate limiting
- Add monitoring (error tracking)
- Use production database (not localhost)
- Set NODE_ENV=production
- Use logging service (not console.log)

---

**Q: How do I handle secrets in production?**

**A:**
- Never commit .env to git ✅
- Use environment variables
- On Heroku: `heroku config:set JWT_SECRET=...`
- On AWS: Use Parameter Store
- On Docker: Use secrets management

---

### Common Issues

**Q: "Cannot find module '@prisma/client'"**

**A:** Run:
```cmd
npm install
npx prisma generate
```

---

**Q: "Database connection failed"**

**A:** Check:
1. PostgreSQL is running
2. DATABASE_URL in .env is correct
3. Database exists: `CREATE DATABASE library_management;`
4. Credentials are correct

---

**Q: "JWT malformed"**

**A:** Token format must be:
```
Authorization: Bearer eyJhbGci...
                    ^^^ Space after Bearer
```

---

**Q: "Port 4000 already in use"**

**A:**
```cmd
# Windows
netstat -ano | findstr :4000
taskkill /PID [process_id] /F

# Or change port in .env
PORT=5000
```

---

**Q: "Tests failing after migration"**

**A:**
```cmd
cd api
npx prisma migrate reset --force
npm test
```

---

## 🎯 Presentation Tips

### For a 5-Minute Presentation:
1. Show architecture diagram (30 sec)
2. Explain request flow with checkout example (2 min)
3. Live demo: Register → Login → View books (2 min)
4. Show code: One controller + service (30 sec)

### For a 15-Minute Presentation:
1. System overview + tech stack (2 min)
2. Architecture diagrams (3 min)
3. File structure explanation (3 min)
4. Live demo with Swagger (4 min)
5. Code walkthrough (2 min)
6. Q&A (1 min)

### For a 30-Minute Presentation:
1. Problem statement (2 min)
2. Architecture deep dive (8 min)
3. Authentication flow (5 min)
4. Business logic examples (8 min)
5. Testing approach (3 min)
6. Live demo (2 min)
7. Q&A (2 min)

---

## 🎓 Key Takeaways for Your Audience

1. **It's a REST API** - Backend service that other apps can use
2. **JWT for authentication** - Stateless, scalable, secure
3. **MVC architecture** - Organized, maintainable, testable
4. **Prisma ORM** - Type-safe database access
5. **Business rules enforced** - Not just CRUD, real library logic
6. **Comprehensive testing** - Unit + integration tests
7. **Production-ready** - Security, validation, documentation

---

**You're now ready to present your project confidently!** 🚀

Use the flowcharts for quick overview, then dive into specifics based on audience questions!
