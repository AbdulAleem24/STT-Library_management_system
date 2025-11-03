# Level 0: Introduction & Quick Overview

## 📚 What is This Project?

You've built a **Library Management System** - think of it like the software that runs behind the scenes when you borrow a book from your school or local library!

### Real-World Example
Imagine you walk into a library:
1. You show your library card (Authentication)
2. The librarian looks up your account (Database Query)
3. You ask to borrow a book (API Request)
4. The system checks if the book is available (Business Logic)
5. You get the book and the system records it (Database Update)

**Your project does ALL of this, but through code!**

---

## 🎯 What Does This System Do?

### For Library Members (Regular Users):
- ✅ Register and login with a library card
- ✅ Browse books and materials in the catalog
- ✅ Reserve books that are currently checked out
- ✅ Check out available items
- ✅ Return items they've borrowed
- ✅ Renew items to extend borrowing time
- ✅ View their borrowing history
- ✅ Check fines and fees

### For Library Staff (Admins):
- ✅ Everything members can do, PLUS:
- ✅ Add new books to the catalog
- ✅ Manage member accounts
- ✅ Process payments for fines
- ✅ View all circulation statistics
- ✅ Configure system settings

---

## 🏗️ High-Level Architecture

```
┌─────────────┐
│   Browser   │  ← User interacts here (Postman/Swagger)
└──────┬──────┘
       │ HTTP Request (JSON)
       ▼
┌─────────────┐
│  REST API   │  ← Your Node.js/Express application
│   (Port     │     (Handles requests, validates, applies logic)
│   4000)     │
└──────┬──────┘
       │ SQL Query
       ▼
┌─────────────┐
│ PostgreSQL  │  ← Database (Stores all data)
│  Database   │
└─────────────┘
```

---

## 📖 Key Terminology for Beginners

### 1. **API (Application Programming Interface)**
- Think of it as a "menu" of actions your system can perform
- Example: "Give me all books" or "Check out this book"
- Like ordering food: you ask for a burger, the kitchen makes it, you get it back

### 2. **REST API**
- A specific style of API using HTTP (the same protocol websites use)
- Uses standard methods: GET (read), POST (create), PUT (update), DELETE (delete)

### 3. **Endpoint**
- A specific URL path that performs one action
- Example: `POST /api/auth/login` - logs you in
- Example: `GET /api/biblio` - gets list of books

### 4. **Database**
- Like a super-organized filing cabinet storing all your data
- Tables are like folders, rows are like individual papers

### 5. **ORM (Object-Relational Mapping) - Prisma**
- Instead of writing SQL manually, you write JavaScript
- Prisma translates your JavaScript into SQL automatically
- Safer and easier!

### 6. **JWT (JSON Web Token)**
- A digital "badge" that proves you're logged in
- You get it when you login, then show it with every request
- Like a stamp on your hand at an amusement park

### 7. **Bcrypt**
- Scrambles passwords so they can't be read if stolen
- "password123" becomes something like "$2a$10$abc...xyz"
- One-way: can't be unscrambled, only verified

### 8. **Middleware**
- Code that runs "in the middle" of a request
- Like security checkpoints at an airport
- Examples: Check if user is logged in, validate input data

### 9. **MVC (Model-View-Controller)**
- A way to organize code:
  - **Model**: Database structure (your Prisma schema)
  - **View**: What user sees (in your case, JSON responses)
  - **Controller**: Traffic director between Model and View

### 10. **Swagger**
- Automatic documentation for your API
- Interactive website where you can test endpoints
- Visit: http://localhost:4000/docs

---

## 🗂️ Project Structure Simplified

```
api/
├── prisma/
│   ├── schema.prisma       ← Defines your database structure
│   └── seed.js             ← Creates initial data
│
├── src/
│   ├── server.js           ← Starts the application
│   ├── app.js              ← Configures Express
│   │
│   ├── routes/             ← URL paths (the "menu")
│   ├── controllers/        ← Handle requests (order taker)
│   ├── services/           ← Business logic (kitchen)
│   ├── middleware/         ← Security guards
│   ├── validators/         ← Input checkers
│   └── utils/              ← Helper tools
│
├── tests/                  ← Automated testing
├── .env                    ← Secret configuration (passwords, etc.)
└── package.json            ← List of dependencies
```

---

## 🔄 How a Request Flows Through Your System

Let's trace what happens when someone tries to checkout a book:

```
1. USER SENDS REQUEST
   POST /api/circulation/checkout
   { "borrowernumber": 1, "itemnumber": 42 }
   Authorization: Bearer eyJhbGc...

2. MIDDLEWARE LAYER
   ├─ [auth.js] Check JWT token → Is user logged in? ✓
   ├─ [validate.js] Check input data → Is it valid? ✓
   └─ → Forward to controller

3. CONTROLLER
   [circulationController.js]
   └─ Receives request, calls service

4. SERVICE (Business Logic)
   [circulationService.js]
   ├─ Check if book is available
   ├─ Check if member has too many items
   ├─ Calculate due date
   ├─ Create checkout record in database
   └─ Update item status

5. DATABASE
   [PostgreSQL via Prisma]
   ├─ Insert into 'issues' table
   ├─ Update 'items' table
   └─ Return success

6. RESPONSE FLOWS BACK
   Controller → Middleware → User
   { "success": true, "data": { ... } }
```

---

## 🎓 What Technologies Are You Using?

| Technology | Purpose | Analogy |
|------------|---------|----------|
| **Node.js** | JavaScript runtime | The engine that runs your code |
| **Express** | Web framework | The road system for requests |
| **Prisma** | ORM | Translator between JS and SQL |
| **PostgreSQL** | Database | The actual filing cabinet |
| **JWT** | Authentication | Digital ID badge |
| **Bcrypt** | Password hashing | Password scrambler |
| **Express-validator** | Input validation | Bouncer checking IDs |
| **Swagger** | API documentation | Instruction manual |
| **Jest** | Testing framework | Quality control inspector |

---

## ✅ What Requirements Have You Met?

Let's map your project to the assignment requirements:

### ✓ Authentication
- JWT-based: `src/middleware/auth.js`
- Bcrypt password hashing: `src/services/authService.js`

### ✓ Roles
- ADMIN and MEMBER roles defined in: `prisma/schema.prisma`
- Role-based access control in: `src/middleware/auth.js` (authorize function)

### ✓ Validation
- Express-validator used in ALL routes
- Check: `src/validators/` folder

### ✓ Error Handling
- Consistent response structure: `src/utils/apiResponse.js`
- Proper HTTP status codes: `src/utils/apiError.js`
- Centralized error handler: `src/middleware/errorHandler.js`

### ✓ Environment Variables
- `.env` file with DB connection, JWT secret
- `.env.example` provided for reference

### ✓ Database
- PostgreSQL chosen
- Connection: Port 5433, database: library_management

### ✓ ORM
- Prisma used throughout
- Schema: `prisma/schema.prisma`

### ✓ Structure
- Service-based modular structure (MVC pattern)
- Clean separation: routes → controllers → services

### ✓ Documentation
- Swagger at `/docs`
- This README and multiple detailed docs

### ✓ Bonus Features
- ✅ Pagination implemented
- ✅ Sorting implemented
- ✅ Search filters implemented

---

## 🚀 Quick Start Commands

### 1. Install Everything
```cmd
cd api
npm install
```

### 2. Setup Database
```cmd
npx prisma migrate dev --name init
npx prisma db seed
```

### 3. Start the Server
```cmd
npm run dev
```

### 4. Test the API
- Open browser: http://localhost:4000/docs
- Or use Postman/Insomnia

---

## ❓ Common Questions & Answers

### Q1: What is the difference between authentication and authorization?
**A:** 
- **Authentication**: Proving who you are (login with password)
- **Authorization**: Checking what you're allowed to do (admin vs member)

### Q2: Why do we use an ORM like Prisma?
**A:** 
- Safer (prevents SQL injection attacks)
- Easier (write JavaScript instead of SQL)
- Type-safe (catches errors before running)
- Auto-completion in your editor

### Q3: What is middleware and why do we need it?
**A:**
Middleware are functions that run BEFORE your main code. They're like security checkpoints:
- Check if user is logged in
- Validate input data
- Log requests
- Handle errors

### Q4: What does "RESTful" mean?
**A:** Following REST principles:
- Use HTTP methods correctly (GET, POST, PUT, DELETE)
- Use meaningful URLs (`/api/books` not `/api/getBooks`)
- Stateless (each request is independent)
- Return standard response formats (JSON)

### Q5: Why separate controllers and services?
**A:**
- **Controller**: Handles HTTP stuff (request/response)
- **Service**: Handles business logic (database operations)
- Makes code reusable and testable

### Q6: What's the difference between .env and .env.example?
**A:**
- `.env` - Contains actual secrets (passwords) - NEVER commit to git
- `.env.example` - Template with fake values - Safe to share

### Q7: How do I know if my API is working?
**A:**
1. Server starts without errors
2. Can access http://localhost:4000
3. Can login via `/api/auth/login`
4. Get a token back
5. Can use that token for other requests

### Q8: What is Swagger and why is it important?
**A:**
- Auto-generated documentation
- Interactive testing interface
- Shows all endpoints, parameters, responses
- Makes it easy for others to understand your API

---

## 🎯 Next Steps

Now that you understand the basics, proceed to:
- **Level 1**: Database Schema Explained (understand your data structure)
- **Level 2**: Authentication & Security (how JWT and bcrypt work)
- **Level 3**: API Architecture Deep Dive (how code is organized)
- **Level 4**: Business Logic & Features (circulation, fines, etc.)
- **Level 5**: Testing Strategy (how to ensure quality)
- **Submission Guide**: How to submit your project

---

## 💡 Key Takeaways

1. You've built a REAL production-ready API
2. It follows industry best practices
3. It meets ALL assignment requirements
4. It's well-structured and maintainable
5. It includes testing and documentation
6. You should be proud of this work!

**Remember**: Everyone starts as a beginner. The fact that you're reading this and trying to understand shows you're on the right path! 🌟

---

**Ready to dive deeper? Move on to Level 1: Database Schema Explained!**
