# Library Management System - Complete Beginner's Guide

## 📚 What Is This Project?

You're building a **Library Management System** - like the system a real library uses to manage books, members, checkouts, and fines.

Think of it like this:
- A library has **books** (some books might have multiple copies)
- People become **members** to borrow books
- When someone borrows a book, it's called a **checkout**
- When they return it late, they get **fines**
- If all copies are checked out, people can **place holds** (wait in line)

---

## 🎯 What You've Already Done

### ✅ You Have: The Database Schema

You created the **database design** (schema) in PostgreSQL. This is like creating the blueprint for how all the data will be stored.

**What's in your database:**

1. **Reference Tables** (the rules):
   - `categories` - Types of members (Adult, Child, Staff) with their limits
   - `itemtypes` - Types of materials (Book, DVD, eBook, etc.)

2. **Master Tables** (the main things):
   - `biblio` - Information about books (title, author, ISBN)
   - `items` - Physical copies of books (each with a barcode)
   - `borrowers` - Library members (people who can borrow books)

3. **Transaction Tables** (the actions):
   - `issues` - Active checkouts (who borrowed what, when it's due)
   - `old_issues` - History of past checkouts
   - `reserves` - Hold requests (when someone wants a book that's checked out)
   - `old_reserves` - History of old holds
   - `accountlines` - Fines and payments

4. **System Tables** (behind the scenes):
   - `systempreferences` - Settings (like fine amount per day: $0.25)
   - `action_logs` - Track who changed what

**Smart Features You Built:**
- **15 Triggers** - Automatic actions (like calculating fines when a book is late)
- **4 Views** - Pre-made reports (like "show all overdue books")
- **6 Functions** - Helper tools (like "can this person check out a book?")

---

## 🎓 What You Need to Do Now

### ❌ What You DON'T Have Yet: The API

An **API** (Application Programming Interface) is how other programs talk to your database. Think of it like a waiter in a restaurant:
- The **database** is the kitchen (where food/data is stored)
- The **API** is the waiter (takes orders, brings food)
- The **frontend app** is the customer (makes requests)

**Your assignment is to build the waiter (API) using Node.js.**

---

## 📝 The Assignment Requirements (In Plain English)

You need to build a **REST API** with these features:

### 1. **Authentication (Security)**
- Users must register and login
- Passwords must be encrypted (using bcrypt)
- After login, users get a token (JWT) to prove who they are
- Two types of users:
  - **Admin** - Can manage everything
  - **User** - Can only borrow books and view their account

### 2. **Core CRUD Operations** (Create, Read, Update, Delete)
Build endpoints to:
- Manage books (add, edit, delete, search)
- Manage physical copies (add, update status)
- Manage members (register, update profile)
- Manage categories and item types
- View checkouts, holds, and fines

### 3. **Business Logic Endpoints** (The Important Stuff)
- **Checkout a book** - Verify limits, create checkout record
- **Return a book** - Calculate fines if late, mark available
- **Renew a book** - Extend due date (max 3 times)
- **Place a hold** - Add to waiting list
- **Pay a fine** - Record payment, reduce balance

### 4. **Validation**
- Check all incoming data is correct
- Return clear error messages if something's wrong

### 5. **Error Handling**
- All responses in consistent format
- Proper status codes (200 = success, 400 = bad request, 401 = not logged in, etc.)

### 6. **Documentation**
- Swagger docs showing all endpoints
- README with setup instructions
- `.env.example` for configuration

### 7. **Bonus Features** (Optional)
- Pagination (show 10 items per page)
- Search and filters
- Sorting

---

## 🛠️ Technology Stack (What You'll Use)

Here's what each tool does:

| Tool | What It Does | Why You Need It |
|------|--------------|-----------------|
| **Node.js** | JavaScript runtime (lets you run JS on the server) | Required to build the API |
| **Express.js** | Web framework (handles HTTP requests) | Makes building APIs easy |
| **Prisma** | ORM (Object-Relational Mapping) | Lets you talk to PostgreSQL using JavaScript instead of SQL |
| **PostgreSQL** | Database | Where your data lives (you already have this) |
| **JWT** (jsonwebtoken) | Authentication tokens | Secure way to identify logged-in users |
| **bcrypt** | Password hashing | Encrypts passwords (never store plain passwords!) |
| **express-validator** | Input validation | Checks if data is valid before processing |
| **Swagger** | API documentation | Auto-generates interactive API docs |
| **TypeScript** | Typed JavaScript (optional) | Catches errors before running code |

---

## 📐 Project Structure (How to Organize Your Code)

```
library-api/
├── src/
│   ├── server.ts                 # Start the server
│   ├── app.ts                    # Configure Express app
│   ├── config/
│   │   └── database.ts           # Database connection
│   ├── middlewares/
│   │   ├── auth.ts               # Check if user is logged in
│   │   ├── authorize.ts          # Check user role (Admin/User)
│   │   ├── errorHandler.ts      # Catch and format errors
│   │   └── validator.ts          # Validate request data
│   ├── routes/
│   │   ├── auth.routes.ts        # Register, Login
│   │   ├── biblio.routes.ts      # Book catalog endpoints
│   │   ├── items.routes.ts       # Physical copies endpoints
│   │   ├── borrowers.routes.ts   # Members endpoints
│   │   ├── issues.routes.ts      # Checkout/Return/Renew
│   │   ├── reserves.routes.ts    # Holds endpoints
│   │   ├── accountlines.routes.ts # Fines endpoints
│   │   └── admin.routes.ts       # Admin-only endpoints
│   ├── controllers/
│   │   ├── authController.ts     # Handle auth logic
│   │   ├── biblioController.ts   # Handle book operations
│   │   └── ...                   # One per route
│   ├── services/
│   │   ├── authService.ts        # Business logic for auth
│   │   ├── checkoutService.ts    # Business logic for checkout
│   │   └── ...                   # One per feature
│   ├── utils/
│   │   ├── jwt.ts                # Token generation/validation
│   │   └── response.ts           # Consistent response format
│   └── docs/
│       └── swagger.ts            # Swagger configuration
├── prisma/
│   ├── schema.prisma             # Prisma schema (translate your SQL)
│   ├── migrations/               # Database migrations
│   └── seed.ts                   # Initial data (categories, itemtypes)
├── .env                          # Environment variables (DON'T COMMIT!)
├── .env.example                  # Example env file (commit this)
├── .gitignore                    # Files to ignore in git
├── package.json                  # Dependencies list
├── tsconfig.json                 # TypeScript config
└── README.md                     # Setup instructions
```

---

## 🚀 Step-by-Step Implementation Guide

### Phase 1: Setup (Day 1)

#### Step 1.1: Initialize Project

```bash
# Create project folder
mkdir library-api
cd library-api

# Initialize Node.js project
npm init -y

# Install TypeScript (optional but recommended)
npm install -D typescript @types/node @types/express ts-node nodemon
npx tsc --init
```

#### Step 1.2: Install Dependencies

```bash
# Core dependencies
npm install express prisma @prisma/client dotenv
npm install bcryptjs jsonwebtoken express-validator
npm install swagger-jsdoc swagger-ui-express cors

# TypeScript types (if using TypeScript)
npm install -D @types/bcryptjs @types/jsonwebtoken @types/swagger-jsdoc @types/swagger-ui-express @types/cors
```

#### Step 1.3: Create `.env` File

Create `.env` (this file stays on your computer only):
```
DATABASE_URL="postgresql://username:password@localhost:5432/library_db"
JWT_SECRET="your-super-secret-key-change-this"
JWT_EXPIRES_IN="24h"
PORT=4000
NODE_ENV="development"
```

Create `.env.example` (this goes on GitHub):
```
DATABASE_URL="postgresql://user:password@localhost:5432/library_db"
JWT_SECRET="your-jwt-secret-here"
JWT_EXPIRES_IN="24h"
PORT=4000
NODE_ENV="development"
```

#### Step 1.4: Setup Prisma

```bash
# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma (your database models)
# - .env file (if it doesn't exist)
```

---

### Phase 2: Prisma Schema (Day 1-2)

#### Step 2.1: Translate SQL to Prisma

Open `prisma/schema.prisma` and translate your SQL tables to Prisma models.

**Example for `categories` table:**

SQL (what you have):
```sql
CREATE TABLE categories (
    categorycode VARCHAR(10) PRIMARY KEY,
    description TEXT NOT NULL,
    category_type VARCHAR(1) NOT NULL DEFAULT 'A',
    max_checkout_count INTEGER DEFAULT 5,
    loan_period_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

Prisma (what you need):
```prisma
model Category {
  categorycode       String     @id @db.VarChar(10)
  description        String
  category_type      String     @default("A") @db.VarChar(1)
  max_checkout_count Int        @default(5)
  loan_period_days   Int        @default(14)
  created_at         DateTime   @default(now())
  
  // Relationships
  borrowers          Borrower[]
}
```

**Do this for all 12 tables!** (I can provide the complete schema if needed)

#### Step 2.2: Run Migration

```bash
# Create migration from your schema
npx prisma migrate dev --name initial_setup

# Generate Prisma Client (lets you use the database in code)
npx prisma generate
```

#### Step 2.3: Seed Initial Data

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create categories
  await prisma.category.createMany({
    data: [
      {
        categorycode: 'ADULT',
        description: 'Adult Member',
        category_type: 'A',
        max_checkout_count: 5,
        loan_period_days: 14,
      },
      {
        categorycode: 'CHILD',
        description: 'Child Member',
        category_type: 'C',
        max_checkout_count: 3,
        loan_period_days: 7,
      },
      {
        categorycode: 'STAFF',
        description: 'Library Staff',
        category_type: 'S',
        max_checkout_count: 20,
        loan_period_days: 30,
      },
    ],
  });

  // Create item types
  await prisma.itemType.createMany({
    data: [
      { itemtype: 'BOOK', description: 'Book', rentalcharge: 0, defaultreplacecost: 25 },
      { itemtype: 'DVD', description: 'DVD', rentalcharge: 2, defaultreplacecost: 20 },
      { itemtype: 'EBOOK', description: 'Electronic Book', rentalcharge: 0, defaultreplacecost: 0 },
    ],
  });

  console.log('Seed data inserted!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

Run seed:
```bash
npx prisma db seed
```

---

### Phase 3: Basic Express Server (Day 2)

#### Step 3.1: Create `src/app.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Library Management API is running!' });
});

export default app;
```

#### Step 3.2: Create `src/server.ts`

```typescript
import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

#### Step 3.3: Add Scripts to `package.json`

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

#### Step 3.4: Test It!

```bash
npm run dev
```

Visit `http://localhost:4000` - you should see the welcome message!

---

### Phase 4: Authentication (Day 2-3)

#### Step 4.1: Create JWT Utility (`src/utils/jwt.ts`)

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const generateToken = (payload: { id: number; role: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
```

#### Step 4.2: Create Auth Service (`src/services/authService.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export const registerUser = async (data: {
  email: string;
  password: string;
  full_name: string;
  cardnumber: string;
  categorycode: string;
}) => {
  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create borrower
  const borrower = await prisma.borrower.create({
    data: {
      ...data,
      password: hashedPassword,
    },
  });

  // Generate token
  const token = generateToken({ id: borrower.borrowernumber, role: 'USER' });

  return { borrower, token };
};

export const loginUser = async (email: string, password: string) => {
  // Find user
  const borrower = await prisma.borrower.findFirst({ where: { email } });
  
  if (!borrower || !borrower.password) {
    throw new Error('Invalid credentials');
  }

  // Check password
  const isValid = await bcrypt.compare(password, borrower.password);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = generateToken({ id: borrower.borrowernumber, role: 'USER' });

  return { borrower, token };
};
```

#### Step 4.3: Create Auth Controller (`src/controllers/authController.ts`)

```typescript
import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/authService';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { message: error.message },
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { message: error.message },
    });
  }
};
```

#### Step 4.4: Create Auth Routes (`src/routes/auth.routes.ts`)

```typescript
import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { body } from 'express-validator';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty(),
    body('cardnumber').notEmpty(),
    body('categorycode').notEmpty(),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  login
);

export default router;
```

#### Step 4.5: Add to `app.ts`

```typescript
import authRoutes from './routes/auth.routes';

// ... existing code ...

app.use('/api/auth', authRoutes);
```

#### Step 4.6: Test Authentication

**Register:**
```bash
POST http://localhost:4000/api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "cardnumber": "LIB001",
  "categorycode": "ADULT"
}
```

**Login:**
```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

---

### Phase 5: Protected Routes (Day 3)

#### Step 5.1: Create Auth Middleware (`src/middlewares/auth.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      });
    }

    const decoded = verifyToken(token) as { id: number; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid token' },
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' },
      });
    }
    next();
  };
};
```

---

### Phase 6: CRUD Endpoints (Day 3-5)

#### Example: Books (Biblio) Endpoints

**Service (`src/services/biblioService.ts`):**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllBooks = async (page = 1, limit = 10, search?: string) => {
  const skip = (page - 1) * limit;
  
  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { isbn: { contains: search } },
        ],
      }
    : {};

  const [books, total] = await Promise.all([
    prisma.biblio.findMany({
      where,
      skip,
      take: limit,
      include: { items: true },
    }),
    prisma.biblio.count({ where }),
  ]);

  return {
    books,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBookById = async (id: number) => {
  return prisma.biblio.findUnique({
    where: { biblionumber: id },
    include: { items: true },
  });
};

export const createBook = async (data: any) => {
  return prisma.biblio.create({ data });
};

export const updateBook = async (id: number, data: any) => {
  return prisma.biblio.update({
    where: { biblionumber: id },
    data,
  });
};

export const deleteBook = async (id: number) => {
  return prisma.biblio.delete({
    where: { biblionumber: id },
  });
};
```

**Controller (`src/controllers/biblioController.ts`):**
```typescript
import { Request, Response } from 'express';
import * as biblioService from '../services/biblioService';

export const getBooks = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const result = await biblioService.getAllBooks(
      Number(page),
      Number(limit),
      search as string
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getBook = async (req: Request, res: Response) => {
  try {
    const book = await biblioService.getBookById(Number(req.params.id));
    if (!book) {
      return res.status(404).json({ success: false, error: { message: 'Book not found' } });
    }
    res.json({ success: true, data: book });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ... similar for create, update, delete
```

**Routes (`src/routes/biblio.routes.ts`):**
```typescript
import { Router } from 'express';
import * as biblioController from '../controllers/biblioController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.get('/', biblioController.getBooks);
router.get('/:id', biblioController.getBook);
router.post('/', authenticate, authorize('ADMIN'), biblioController.createBook);
router.put('/:id', authenticate, authorize('ADMIN'), biblioController.updateBook);
router.delete('/:id', authenticate, authorize('ADMIN'), biblioController.deleteBook);

export default router;
```

**Repeat this pattern for:**
- items
- borrowers
- categories
- itemtypes
- reserves
- accountlines

---

### Phase 7: Business Logic Endpoints (Day 5-6)

#### Example: Checkout Endpoint

**Service (`src/services/checkoutService.ts`):**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const checkoutItem = async (borrowernumber: number, itemnumber: number) => {
  // Use Prisma transaction for safety
  return await prisma.$transaction(async (tx) => {
    // 1. Check if borrower can checkout
    const borrower = await tx.borrower.findUnique({
      where: { borrowernumber },
      include: { category: true, issues: true },
    });

    if (!borrower) throw new Error('Borrower not found');
    if (borrower.debarred && new Date(borrower.debarred) > new Date()) {
      throw new Error(`Borrower is restricted until ${borrower.debarred}`);
    }
    if (borrower.issues.length >= borrower.category.max_checkout_count) {
      throw new Error('Checkout limit reached');
    }

    // 2. Check if item is available
    const item = await tx.item.findUnique({
      where: { itemnumber },
      include: { reserves: true },
    });

    if (!item) throw new Error('Item not found');
    if (item.status !== 'available') throw new Error('Item not available');
    if (item.notforloan) throw new Error('Item not for loan');

    // 3. Check if reserved for someone else
    const activeReserve = item.reserves.find(
      (r) => !r.cancellationdate && r.borrowernumber !== borrowernumber
    );
    if (activeReserve) throw new Error('Item reserved for another patron');

    // 4. Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + borrower.category.loan_period_days);

    // 5. Create checkout
    const issue = await tx.issue.create({
      data: {
        borrowernumber,
        itemnumber,
        date_due: dueDate,
      },
    });

    // 6. Update item status (or let DB trigger handle it)
    await tx.item.update({
      where: { itemnumber },
      data: {
        status: 'checked_out',
        onloan: dueDate,
        issues: { increment: 1 },
      },
    });

    return issue;
  });
};
```

**Do similar for:**
- `returnItem`
- `renewItem`
- `placeHold`
- `payFine`

---

### Phase 8: Documentation (Day 7)

#### Step 8.1: Add Swagger

Create `src/docs/swagger.ts`:
```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Management API',
      version: '1.0.0',
      description: 'REST API for Library Management System',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
```

Add to `app.ts`:
```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

Visit `http://localhost:4000/api/docs` to see interactive API docs!

#### Step 8.2: Write README.md

(I'll create a separate production README in the next step)

---

## 📊 Complete API Endpoint List

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Books (Biblio)
- `GET /api/biblio` - List all books (with search, pagination)
- `GET /api/biblio/:id` - Get book details
- `POST /api/biblio` - Create book (Admin only)
- `PUT /api/biblio/:id` - Update book (Admin only)
- `DELETE /api/biblio/:id` - Delete book (Admin only)

### Physical Copies (Items)
- `GET /api/items` - List all items
- `GET /api/items/:id` - Get item details
- `GET /api/items/barcode/:barcode` - Find by barcode
- `POST /api/items` - Add new copy (Admin only)
- `PUT /api/items/:id` - Update item (Admin only)
- `DELETE /api/items/:id` - Delete item (Admin only)

### Members (Borrowers)
- `GET /api/borrowers` - List members (Admin only)
- `GET /api/borrowers/:id` - Get member details
- `GET /api/borrowers/me` - Get current user profile
- `PUT /api/borrowers/:id` - Update member
- `DELETE /api/borrowers/:id` - Delete member (Admin only)

### Checkouts & Returns
- `POST /api/issues/checkout` - Checkout item
- `POST /api/issues/return` - Return item
- `POST /api/issues/renew` - Renew checkout
- `GET /api/issues` - List active checkouts
- `GET /api/issues/my` - My active checkouts
- `GET /api/issues/history` - Checkout history

### Holds (Reserves)
- `POST /api/reserves` - Place hold
- `DELETE /api/reserves/:id` - Cancel hold
- `GET /api/reserves` - List holds
- `GET /api/reserves/my` - My holds

### Fines (Accountlines)
- `GET /api/accountlines` - List fines/payments
- `GET /api/accountlines/my` - My fines
- `POST /api/accountlines/pay` - Pay fine

### Admin Only
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/itemtypes` - List item types
- `POST /api/itemtypes` - Create item type
- `GET /api/systempreferences` - List settings
- `PUT /api/systempreferences/:key` - Update setting
- `GET /api/action-logs` - View audit logs

---

## 🧪 Testing Your API

### Using Postman

1. Install Postman
2. Create a collection
3. Add requests for each endpoint
4. Test flow:
   - Register → Login (save token)
   - Add token to Authorization header for protected routes
   - Test checkout → return → pay fine flow

### Using cURL

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "cardnumber": "LIB001",
    "categorycode": "ADULT"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get books (with token)
curl http://localhost:4000/api/biblio \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🚢 Deployment

### Option 1: Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create library-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

### Option 2: Railway / Render

Similar process - connect GitHub repo and set environment variables.

---

## 📚 Resources to Learn More

1. **Node.js & Express:**
   - [Express.js Official Docs](https://expressjs.com/)
   - [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

2. **Prisma:**
   - [Prisma Docs](https://www.prisma.io/docs/)
   - [Prisma Quickstart](https://www.prisma.io/docs/getting-started/quickstart)

3. **Authentication:**
   - [JWT Introduction](https://jwt.io/introduction)
   - [Bcrypt Guide](https://www.npmjs.com/package/bcryptjs)

4. **API Design:**
   - [REST API Tutorial](https://restfulapi.net/)
   - [HTTP Status Codes](https://httpstatuses.com/)

---

## ❓ Common Questions

**Q: Do I use TypeScript or JavaScript?**  
A: TypeScript is recommended (better error checking) but JavaScript works fine too. Choose based on your comfort level.

**Q: What if the database triggers don't work in Prisma?**  
A: You can either:
1. Keep the triggers in PostgreSQL (run the original SQL file)
2. Implement the logic in your service layer using Prisma transactions

**Q: How do I handle the database views?**  
A: Use raw SQL queries:
```typescript
const overdueItems = await prisma.$queryRaw`SELECT * FROM overdue_items`;
```

**Q: What about the utility functions?**  
A: Call them using Prisma:
```typescript
const canCheckout = await prisma.$queryRaw`SELECT can_patron_checkout(${patronId})`;
```

---

## 🎯 Success Checklist

Before submitting, verify:

- [ ] All 12 tables accessible via API
- [ ] Register & Login working
- [ ] JWT authentication on protected routes
- [ ] Admin vs User roles enforced
- [ ] Checkout flow working (with validations)
- [ ] Return flow working (creates fines if late)
- [ ] Hold placement working
- [ ] Fine payment working
- [ ] Swagger docs accessible at `/api/docs`
- [ ] README.md with setup instructions
- [ ] `.env.example` file included
- [ ] Code pushed to Bitbucket
- [ ] Migrations folder included
- [ ] Seed script working

---

## 💡 Tips for Success

1. **Start small** - Get auth working first, then add one feature at a time
2. **Test often** - Test each endpoint as you build it
3. **Use Prisma Studio** - Visual database browser: `npx prisma studio`
4. **Read error messages** - They usually tell you exactly what's wrong
5. **Use version control** - Commit after each working feature
6. **Ask for help** - If stuck for more than 30 minutes, ask someone

---

## 🎓 What You'll Learn

By completing this project, you'll understand:
- How databases connect to APIs
- RESTful API design principles
- Authentication & authorization
- ORM usage (Prisma)
- Input validation & error handling
- API documentation
- Transaction management
- Security best practices (password hashing, JWT)

---

## 🆘 Need Help?

If you're stuck:
1. Check the error message carefully
2. Search the error on Google/Stack Overflow
3. Review Prisma docs
4. Check your `.env` file (correct DATABASE_URL?)
5. Verify database is running: `psql library_db`
6. Ask me for specific help!

---

**Good luck! You've got this! 🚀**

Remember: Every expert was once a beginner. Take it one step at a time, and you'll have a fully working API before you know it!
