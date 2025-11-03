# Level 3: API Architecture Deep Dive

## 🏗️ Understanding Your API Structure

Your API follows a **service-based MVC (Model-View-Controller) architecture**. Let's break down exactly what this means and how it works!

---

## 📐 The MVC Pattern Simplified

### Traditional MVC
```
┌──────────┐     ┌────────────┐     ┌───────┐
│  Model   │◀────│ Controller │────▶│ View  │
│(Database)│     │  (Logic)   │     │ (UI)  │
└──────────┘     └────────────┘     └───────┘
```

### Your API's MVC
```
┌────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│   Routes   │───▶│ Controllers│───▶│ Services │───▶│ Database │
│ (URL paths)│    │ (Handlers) │    │ (Logic)  │    │ (Prisma) │
└────────────┘    └────────────┘    └──────────┘    └──────────┘
      ▲                                                     │
      │                                                     ▼
      │           ┌────────────┐                   ┌───────────┐
      └───────────│ JSON View  │◀──────────────────│  Results  │
                  │ (Response) │                   │           │
                  └────────────┘                   └───────────┘
```

---

## 🗂️ Project Structure Explained

```
api/src/
│
├── app.js              ← Express application setup
├── server.js           ← Entry point (starts the server)
├── prisma.js           ← Database client
│
├── config/
│   └── env.js          ← Environment variables
│
├── routes/             ← URL DEFINITIONS (The Menu)
│   ├── index.js        ← Main router
│   ├── authRoutes.js
│   ├── biblioRoutes.js
│   └── ...
│
├── middleware/         ← GATEKEEPERS
│   ├── auth.js         ← Authentication & authorization
│   ├── validate.js     ← Input validation
│   └── errorHandler.js ← Error handling
│
├── validators/         ← VALIDATION RULES
│   ├── authValidators.js
│   ├── biblioValidators.js
│   └── ...
│
├── controllers/        ← REQUEST HANDLERS (Order Takers)
│   ├── authController.js
│   ├── biblioController.js
│   └── ...
│
├── services/           ← BUSINESS LOGIC (The Kitchen)
│   ├── authService.js
│   ├── biblioService.js
│   └── ...
│
├── utils/              ← HELPERS
│   ├── apiError.js     ← Error objects
│   ├── apiResponse.js  ← Response formatting
│   ├── pagination.js   ← Pagination helpers
│   └── token.js        ← JWT utilities
│
└── docs/
    └── swagger.js      ← API documentation config
```

---

## 🔄 Request Flow: Complete Journey

Let's trace what happens when you request: `GET /api/biblio?search=gatsby&page=1`

### **Step 1: Request Arrives at Server**

```javascript
// app.js - Express setup
import express from 'express';
const app = express();

// Middleware applied to ALL requests
app.use(helmet());          // Security headers
app.use(cors());            // Cross-origin requests
app.use(express.json());    // Parse JSON bodies
app.use(morgan('dev'));     // Log requests

// Mount all API routes under /api
app.use('/api', routes);

export default app;
```

```javascript
// server.js - Start the server
import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**What Happens:**
1. Request hits Express server on port 4000
2. Helmet adds security headers
3. CORS allows cross-origin access
4. JSON parser reads the body
5. Morgan logs the request
6. Routes under `/api` are checked

---

### **Step 2: Route Matching**

```javascript
// routes/index.js - Main router
import express from 'express';
import authRoutes from './authRoutes.js';
import biblioRoutes from './biblioRoutes.js';
import borrowerRoutes from './borrowerRoutes.js';
import circulationRoutes from './circulationRoutes.js';
// ... more routes

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/biblio', biblioRoutes);           // ← Our request goes here!
router.use('/borrowers', borrowerRoutes);
router.use('/circulation', circulationRoutes);
// ... more routes

export default router;
```

**What Happens:**
- Request: `GET /api/biblio?search=gatsby`
- Matches: `/api` (from app.js) + `/biblio` (from index.js)
- Forwards to: `biblioRoutes.js`

---

### **Step 3: Specific Route Handler**

```javascript
// routes/biblioRoutes.js
import express from 'express';
import { index, show, store, update, destroy } from '../controllers/biblioController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBiblioValidator, updateBiblioValidator } from '../validators/biblioValidators.js';

const router = express.Router();

router
  .route('/')
  // GET /api/biblio - List all biblio records
  .get(authenticate, index)                    // ← Our route!
  
  // POST /api/biblio - Create new biblio (Admin only)
  .post(
    authenticate, 
    authorize('ADMIN'), 
    validate(createBiblioValidator), 
    store
  );

router
  .route('/:id')
  // GET /api/biblio/:id - Get single biblio
  .get(authenticate, show)
  
  // PUT /api/biblio/:id - Update biblio (Admin only)
  .put(
    authenticate, 
    authorize('ADMIN'), 
    validate(updateBiblioValidator), 
    update
  )
  
  // DELETE /api/biblio/:id - Delete biblio (Admin only)
  .delete(authenticate, authorize('ADMIN'), destroy);

export default router;
```

**What Happens:**
- Request matches: `.get(authenticate, index)`
- Middleware chain: `authenticate` → `index`
- Before calling `index` controller, must pass `authenticate` middleware

---

### **Step 4: Authentication Middleware**

```javascript
// middleware/auth.js
export const authenticate = async (req, _res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token missing');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Fetch user from database
    const borrower = await prisma.borrower.findUnique({
      where: { borrowernumber: decoded.id },
      select: {
        borrowernumber: true,
        full_name: true,
        email: true,
        role: true,
        categorycode: true
      }
    });

    if (!borrower) {
      throw new ApiError(401, 'Invalid token subject');
    }

    // Attach user to request
    req.user = {
      id: borrower.borrowernumber,
      name: borrower.full_name,
      email: borrower.email,
      role: borrower.role,
      categorycode: borrower.categorycode
    };

    // Continue to next middleware/controller
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
};
```

**What Happens:**
1. Check Authorization header exists ✓
2. Extract JWT token ✓
3. Verify signature and expiration ✓
4. Fetch user from database ✓
5. Attach user info to `req.user` ✓
6. Call `next()` to continue to controller

---

### **Step 5: Controller (Request Handler)**

```javascript
// controllers/biblioController.js
import { listBiblios } from '../services/biblioService.js';
import { successResponse } from '../utils/apiResponse.js';

export const index = async (req, res, next) => {
  try {
    // Extract query parameters
    const { page, limit, search, itemtype } = req.query;
    
    // Call service layer
    const result = await listBiblios({ page, limit, search, itemtype });
    
    // Send success response
    return successResponse(res, {
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    // Pass error to error handler middleware
    return next(error);
  }
};
```

**What Happens:**
1. Extract query params: `{ search: "gatsby", page: "1" }`
2. Delegate to service: `listBiblios()`
3. Format response: `successResponse()`
4. Return JSON to client

**Why so thin?** Controllers should be lightweight - just handle HTTP stuff (request/response). Business logic goes in services!

---

### **Step 6: Service Layer (Business Logic)**

```javascript
// services/biblioService.js
import prisma from '../prisma.js';
import { ApiError } from '../utils/apiError.js';
import { buildPagination, buildMeta } from '../utils/pagination.js';

export const listBiblios = async ({ page = 1, limit = 20, search, itemtype }) => {
  // Step 1: Calculate pagination
  const { skip } = buildPagination({ page, limit });
  // page=1, limit=20 → skip=0, take=20
  // page=2, limit=20 → skip=20, take=20

  // Step 2: Build WHERE clause
  const where = {
    AND: [
      search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { author: { contains: search, mode: 'insensitive' } },
              { isbn: { contains: search, mode: 'insensitive' } }
            ]
          }
        : undefined,
      itemtype ? { itemtype } : undefined
    ].filter(Boolean)  // Remove undefined values
  };

  if (!where.AND.length) delete where.AND;

  // Step 3: Query database (in parallel for efficiency)
  const [total, biblios] = await Promise.all([
    // Count total matching records
    prisma.biblio.count({ where: where.AND ? where : undefined }),
    
    // Fetch page of records
    prisma.biblio.findMany({
      where: where.AND ? where : undefined,
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' }
    })
  ]);

  // Step 4: Build pagination metadata
  return {
    data: biblios,
    meta: buildMeta({ total, page: Number(page), limit: Number(limit) })
  };
};
```

**What Happens:**
1. **Pagination Math**: Calculate skip/take
2. **Query Building**: Construct Prisma WHERE clause
3. **Database Query**: Fetch data with Prisma
4. **Metadata**: Calculate pagination info
5. **Return**: Data + metadata

**Generated SQL (approximately):**
```sql
-- Count query
SELECT COUNT(*) FROM biblio
WHERE title ILIKE '%gatsby%' 
   OR author ILIKE '%gatsby%' 
   OR isbn ILIKE '%gatsby%';

-- Data query
SELECT * FROM biblio
WHERE title ILIKE '%gatsby%' 
   OR author ILIKE '%gatsby%' 
   OR isbn ILIKE '%gatsby%'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

---

### **Step 7: Response Formatting**

```javascript
// utils/apiResponse.js
export const successResponse = (res, { status = 200, message, data, meta } = {}) => {
  const response = {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
    ...(meta && { meta })
  };
  return res.status(status).json(response);
};
```

**What Happens:**
Converts service response into standard format:
```json
{
  "success": true,
  "data": [
    {
      "biblionumber": 1,
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn": "9780743273565",
      ...
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### **Step 8: Response Sent to Client**

```
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
...

{
  "success": true,
  "data": [...],
  "meta": {...}
}
```

---

## 🎯 Separation of Concerns

### Why Split into Routes, Controllers, and Services?

**BAD: Everything in one file**
```javascript
// ❌ All logic in route file - messy!
router.get('/biblio', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, secret);
  const user = await prisma.borrower.findUnique({ where: { id: decoded.id } });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const biblios = await prisma.biblio.findMany({
    skip,
    take: limit,
    where: req.query.search ? { title: { contains: req.query.search } } : undefined
  });
  
  const total = await prisma.biblio.count();
  
  res.json({
    success: true,
    data: biblios,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});
```

**GOOD: Separated concerns**
```javascript
// ✅ Clean separation

// routes/biblioRoutes.js - URL definitions
router.get('/', authenticate, index);

// controllers/biblioController.js - HTTP handling
export const index = async (req, res, next) => {
  try {
    const result = await listBiblios(req.query);
    return successResponse(res, { data: result.data, meta: result.meta });
  } catch (error) {
    return next(error);
  }
};

// services/biblioService.js - Business logic
export const listBiblios = async ({ page, limit, search }) => {
  // Complex querying logic
  return { data, meta };
};
```

### Benefits:

1. **Testability**: Can test services without HTTP
2. **Reusability**: Services can be called from anywhere
3. **Maintainability**: Easy to find and fix issues
4. **Scalability**: Can swap implementations
5. **Readability**: Each file has one responsibility

---

## 🔧 Middleware Deep Dive

Middleware functions run **in order** before your controller.

### Request Pipeline

```
Request
   │
   ├─ helmet()              ← Add security headers
   ├─ cors()                ← Handle CORS
   ├─ express.json()        ← Parse JSON body
   ├─ morgan()              ← Log request
   │
   ├─ authenticate          ← Verify JWT
   ├─ authorize('ADMIN')    ← Check role
   ├─ validate(schema)      ← Validate input
   │
   └─ Controller            ← Your handler
        │
        └─ errorHandler     ← Catch errors
```

### 1. Authentication Middleware

```javascript
// middleware/auth.js
export const authenticate = async (req, _res, next) => {
  // Adds req.user if valid token
  // Throws error if invalid/missing
  next();
};
```

**Usage:**
```javascript
// Public route - no auth
router.post('/register', register);

// Protected route - must be logged in
router.get('/profile', authenticate, getProfile);
```

### 2. Authorization Middleware

```javascript
// middleware/auth.js
export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
};
```

**Usage:**
```javascript
// Only admins can create books
router.post('/', authenticate, authorize('ADMIN'), createBiblio);

// Both admins and members can view
router.get('/', authenticate, index);
```

### 3. Validation Middleware

```javascript
// middleware/validate.js
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validation rules
    for (let validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const messages = errors.array().map(err => err.msg);
      return next(new ApiError(422, 'Validation failed', messages));
    }

    next();
  };
};
```

**Usage:**
```javascript
// validators/biblioValidators.js
import { body } from 'express-validator';

export const createBiblioValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 255 }),
  
  body('author')
    .optional()
    .trim()
    .isLength({ max: 255 }),
  
  body('isbn')
    .optional()
    .trim()
    .matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/)
    .withMessage('Invalid ISBN format'),
  
  body('itemtype')
    .notEmpty().withMessage('Item type is required')
];

// routes/biblioRoutes.js
router.post('/', 
  authenticate, 
  authorize('ADMIN'), 
  validate(createBiblioValidator),  // ← Validates before controller
  store
);
```

### 4. Error Handler Middleware

```javascript
// middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  // Default to 500 internal server error
  let statusCode = err.status || 500;
  let message = err.message || 'Internal server error';

  // Log error (in production, send to logging service)
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Record already exists';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // Send error response
  return res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message,
      ...(err.errors && { errors: err.errors })
    }
  });
};
```

**Usage:** Must be LAST middleware in app.js
```javascript
// app.js
app.use('/api', routes);

// Catch-all for 404
app.use('*', (req) => {
  throw new ApiError(404, `Route ${req.originalUrl} not found`);
});

// Error handler (must be last)
app.use(errorHandler);
```

---

## 🗄️ Database Layer (Prisma)

### Prisma Client

```javascript
// prisma.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

**What it does:**
- Creates single database connection
- Logs queries in development
- Type-safe database access

### Common Prisma Operations

**1. Find Many (with filters)**
```javascript
const biblios = await prisma.biblio.findMany({
  where: {
    title: { contains: 'harry', mode: 'insensitive' },
    itemtype: 'BOOK'
  },
  skip: 0,
  take: 20,
  orderBy: { created_at: 'desc' },
  include: { items: true }  // Include related items
});
```

**2. Find Unique (by ID)**
```javascript
const biblio = await prisma.biblio.findUnique({
  where: { biblionumber: 1 },
  include: { items: true, itemType: true }
});
```

**3. Create**
```javascript
const biblio = await prisma.biblio.create({
  data: {
    title: 'New Book',
    author: 'New Author',
    itemtype: 'BOOK'
  }
});
```

**4. Update**
```javascript
const updated = await prisma.biblio.update({
  where: { biblionumber: 1 },
  data: { title: 'Updated Title' }
});
```

**5. Delete**
```javascript
await prisma.biblio.delete({
  where: { biblionumber: 1 }
});
```

**6. Count**
```javascript
const count = await prisma.biblio.count({
  where: { itemtype: 'BOOK' }
});
```

**7. Transactions**
```javascript
await prisma.$transaction(async (tx) => {
  // Create issue
  const issue = await tx.issue.create({ data: {...} });
  
  // Update item
  await tx.item.update({
    where: { itemnumber: 101 },
    data: { status: 'checked_out' }
  });
  
  // Both succeed or both fail
});
```

---

## 🔍 Utility Functions

### 1. Pagination Helper

```javascript
// utils/pagination.js
export const buildPagination = ({ page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    skip,
    take: limitNum
  };
};

export const buildMeta = ({ total, page, limit }) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};
```

**Usage:**
```javascript
const { skip, take } = buildPagination({ page: 2, limit: 20 });
// Returns: { skip: 20, take: 20 }

const meta = buildMeta({ total: 47, page: 2, limit: 20 });
// Returns: { page: 2, limit: 20, total: 47, totalPages: 3, hasNextPage: true, hasPrevPage: true }
```

### 2. API Error Class

```javascript
// utils/apiError.js
export class ApiError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**Usage:**
```javascript
// In service
if (!biblio) {
  throw new ApiError(404, 'Bibliographic record not found');
}

// In validation
throw new ApiError(422, 'Validation failed', ['Title is required', 'ISBN is invalid']);
```

### 3. API Response Formatter

```javascript
// utils/apiResponse.js
export const successResponse = (res, { status = 200, message, data, meta } = {}) => {
  const response = {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
    ...(meta && { meta })
  };
  return res.status(status).json(response);
};
```

**Usage:**
```javascript
// Simple success
return successResponse(res, { data: biblio });

// With message
return successResponse(res, { 
  status: 201, 
  message: 'Record created', 
  data: biblio 
});

// With pagination
return successResponse(res, { 
  data: biblios, 
  meta: paginationMeta 
});
```

---

## 📚 Complete CRUD Example: Biblio Module

Let's see how all pieces work together for the Biblio (catalog) module:

### 1. Route Definition

```javascript
// routes/biblioRoutes.js
router.get('/', authenticate, index);                                    // List
router.get('/:id', authenticate, show);                                  // Get one
router.post('/', authenticate, authorize('ADMIN'), validate(...), store); // Create
router.put('/:id', authenticate, authorize('ADMIN'), validate(...), update); // Update
router.delete('/:id', authenticate, authorize('ADMIN'), destroy);         // Delete
```

### 2. Controller

```javascript
// controllers/biblioController.js
export const index = async (req, res, next) => {
  try {
    const result = await listBiblios(req.query);
    return successResponse(res, { data: result.data, meta: result.meta });
  } catch (error) {
    return next(error);
  }
};

export const show = async (req, res, next) => {
  try {
    const record = await getBiblio(Number(req.params.id));
    return successResponse(res, { data: record });
  } catch (error) {
    return next(error);
  }
};

export const store = async (req, res, next) => {
  try {
    const record = await createBiblio(req.body);
    return successResponse(res, { status: 201, message: 'Record created', data: record });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const record = await updateBiblio(Number(req.params.id), req.body);
    return successResponse(res, { message: 'Record updated', data: record });
  } catch (error) {
    return next(error);
  }
};

export const destroy = async (req, res, next) => {
  try {
    await deleteBiblio(Number(req.params.id));
    return successResponse(res, { message: 'Record deleted' });
  } catch (error) {
    return next(error);
  }
};
```

### 3. Service

```javascript
// services/biblioService.js
export const listBiblios = async ({ page, limit, search, itemtype }) => {
  const { skip, take } = buildPagination({ page, limit });
  
  const where = buildWhereClause({ search, itemtype });
  
  const [total, biblios] = await Promise.all([
    prisma.biblio.count({ where }),
    prisma.biblio.findMany({ where, skip, take, orderBy: { created_at: 'desc' } })
  ]);
  
  return {
    data: biblios,
    meta: buildMeta({ total, page, limit })
  };
};

export const getBiblio = async (id) => {
  const biblio = await prisma.biblio.findUnique({
    where: { biblionumber: id },
    include: { items: true }
  });
  
  if (!biblio) {
    throw new ApiError(404, 'Record not found');
  }
  
  return biblio;
};

export const createBiblio = async (payload) => {
  return prisma.biblio.create({ data: payload });
};

export const updateBiblio = async (id, payload) => {
  try {
    return await prisma.biblio.update({
      where: { biblionumber: id },
      data: { ...payload, updated_at: new Date() }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Record not found');
    }
    throw error;
  }
};

export const deleteBiblio = async (id) => {
  try {
    await prisma.biblio.delete({ where: { biblionumber: id } });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Record not found');
    }
    throw error;
  }
};
```

---

## 🎯 Design Patterns Used

### 1. Dependency Injection
```javascript
// Bad: Tight coupling
export const getUser = async (id) => {
  const prisma = new PrismaClient();  // Creates new connection every time!
  return prisma.user.findUnique({ where: { id } });
};

// Good: Inject dependency
import prisma from '../prisma.js';  // Shared instance

export const getUser = async (id) => {
  return prisma.user.findUnique({ where: { id } });
};
```

### 2. Error-First Callbacks (via try/catch)
```javascript
export const index = async (req, res, next) => {
  try {
    // Happy path
    const result = await listBiblios(req.query);
    return successResponse(res, { data: result.data });
  } catch (error) {
    // Error path
    return next(error);
  }
};
```

### 3. Factory Pattern
```javascript
// utils/apiError.js
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Usage: Factory for creating errors
throw new ApiError(404, 'Not found');
throw new ApiError(422, 'Validation failed', ['Title required']);
```

### 4. Middleware Chain (Chain of Responsibility)
```javascript
router.post('/', 
  authenticate,         // Step 1: Verify auth
  authorize('ADMIN'),   // Step 2: Check permission
  validate(schema),     // Step 3: Validate input
  controller            // Step 4: Handle request
);
```

### 5. Singleton Pattern
```javascript
// prisma.js - Single database connection
const prisma = new PrismaClient();  // Created once
export default prisma;               // Reused everywhere
```

---

## ❓ Q&A: Architecture Questions

### Q1: Why not put validation in the service layer?
**A:** 
- **HTTP concerns** (parsing request) belong in middleware/controller
- **Business logic** (database operations) belongs in service
- Services can be reused from different contexts (CLI, background jobs, etc.)
- Clear separation of concerns

### Q2: When should I create a new service function?
**A:** Create a new function when:
- It performs a distinct database operation
- It implements specific business logic
- It needs to be reused
- It makes code more readable

### Q3: Why use async/await instead of .then()?
**A:**
```javascript
// .then() - callback style (harder to read)
prisma.biblio.findMany()
  .then(biblios => {
    return prisma.item.findMany();
  })
  .then(items => {
    return respond(items);
  })
  .catch(error => handleError(error));

// async/await - cleaner
try {
  const biblios = await prisma.biblio.findMany();
  const items = await prisma.item.findMany();
  return respond(items);
} catch (error) {
  handleError(error);
}
```

### Q4: What's the difference between req.params, req.query, req.body?
**A:**
```javascript
// URL: GET /api/biblio/5?search=gatsby&page=2
// Body: { "title": "New Book" }

req.params   // { id: '5' }  - from URL path /:id
req.query    // { search: 'gatsby', page: '2' }  - from query string ?search=gatsby
req.body     // { title: 'New Book' }  - from JSON body
```

### Q5: Why return next(error) instead of throw error?
**A:**
- `next(error)` passes to error handling middleware
- `throw error` would crash the server if not caught
- Express catches errors in async functions, but better to be explicit

### Q6: How do I add a new endpoint?
**A:**
1. Add route in `routes/` folder
2. Create controller function in `controllers/`
3. Create service function in `services/`
4. Add validators if needed
5. Add to Swagger docs

### Q7: What's the difference between authentication and middleware authorize?
**A:**
- `authenticate`: Verifies JWT, loads user
- `authorize(roles)`: Checks if user.role is in allowed roles
- Always use authenticate BEFORE authorize

### Q8: Should I always use transactions?
**A:** Use transactions when:
- Multiple related database operations
- All must succeed or all must fail
- Example: Checkout (create issue + update item)

Don't use for single operations.

### Q9: How do I handle file uploads?
**A:** Your current system doesn't handle files, but would add:
```javascript
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

router.post('/upload', authenticate, upload.single('file'), uploadController);
```

### Q10: How do I add pagination to a new endpoint?
**A:**
```javascript
// Service
const { skip, take } = buildPagination({ page, limit });
const [total, data] = await Promise.all([
  prisma.model.count({ where }),
  prisma.model.findMany({ where, skip, take })
]);
return { data, meta: buildMeta({ total, page, limit }) };

// Controller
const result = await myService({ page: req.query.page, limit: req.query.limit });
return successResponse(res, { data: result.data, meta: result.meta });
```

---

## 🎓 Key Takeaways

1. **Routes** define URL paths and middleware chain
2. **Controllers** handle HTTP requests/responses
3. **Services** contain business logic and database operations
4. **Middleware** are gatekeepers (auth, validation, errors)
5. **Utilities** provide reusable helper functions
6. **Separation of concerns** makes code maintainable
7. **Consistent patterns** across all modules
8. **Error handling** is centralized
9. **Prisma** provides type-safe database access
10. **Your architecture is production-ready!**

---

**Next: Level 4 - Business Logic & Features** (How circulation, fines, and holds work)
