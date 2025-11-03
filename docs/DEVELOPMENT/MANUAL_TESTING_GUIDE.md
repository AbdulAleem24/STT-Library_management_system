# 📋 Manual Testing Guide - Library Management System API

**Version:** 1.0  
**Last Updated:** October 29, 2025  
**Testing Framework:** Manual/Postman/Swagger  
**Target:** Comprehensive Pre-Submission Validation

---

## 📚 Table of Contents

1. [Testing Overview](#testing-overview)
2. [Environment Setup](#environment-setup)
3. [Testing Tools](#testing-tools)
4. [Authentication Testing](#authentication-testing)
5. [Role-Based Access Testing](#role-based-access-testing)
6. [Quick Start Testing Checklist](#quick-start-testing-checklist)

---

## 📖 Testing Overview

### What You Need to Test

This guide covers **comprehensive manual testing** of your Library Management System API to ensure:

✅ **All 45+ API endpoints** work correctly  
✅ **JWT authentication** is properly secured  
✅ **Role-based access** (Admin vs Member) is enforced  
✅ **Input validation** catches invalid data  
✅ **Error handling** returns proper status codes  
✅ **Business logic** (checkout, fines, holds) works as expected  
✅ **Database operations** persist correctly  
✅ **Pagination, sorting, filtering** work properly

### Testing Strategy

We'll follow this approach:
1. **Environment Verification** - Ensure database and API are running
2. **Authentication Flow** - Test registration and login for both roles
3. **CRUD Operations** - Test Create, Read, Update, Delete for each resource
4. **Business Logic** - Test complex workflows (checkout → renew → return → fine)
5. **Negative Testing** - Test invalid inputs and unauthorized access
6. **Edge Cases** - Test limits, boundaries, and error conditions

---

## 🛠️ Environment Setup

### Prerequisites Verification

Before starting tests, verify:

#### 1. PostgreSQL Database Running
```bash
# Open Command Prompt or PowerShell
psql -U postgres -p 5433 -d library_management

# Expected: You should connect to the database
# If not, start PostgreSQL service:
# Services → PostgreSQL 18.0 → Start
```

#### 2. API Server Running
```bash
# Navigate to API folder
cd c:\Users\USER\STT-Library_Management_System\api

# Start the server
npm run dev

# Expected Output:
# 🚀 Library API listening on port 4000
```

**Important URLs:**
- API Base: `http://localhost:4000`
- API Health: `http://localhost:4000/api/health`
- Swagger Docs: `http://localhost:4000/docs`

#### 3. Database Has Seed Data
```bash
# In the api folder
npx prisma db seed

# Expected: Seed data inserted
# - Categories: ADULT, CHILD, STAFF
# - ItemTypes: BOOK, DVD, EBOOK, MAGAZINE, AUDIO
# - System Preferences: Fine rates, loan periods
```

---

## 🔧 Testing Tools

### Option 1: Swagger UI (Recommended for Beginners)

**URL:** http://localhost:4000/docs  
**Login:** Username: `admin`, Password: `admin123`

**Advantages:**
- ✅ Interactive interface
- ✅ Auto-generated from code
- ✅ Built-in authentication
- ✅ See all endpoints at once
- ✅ Try endpoints directly in browser

**How to Use:**
1. Open http://localhost:4000/docs in browser
2. Enter credentials (admin/admin123) when prompted
3. Click on any endpoint to expand
4. Click "Try it out"
5. Fill in parameters
6. Click "Execute"
7. View response below

### Option 2: Postman (Recommended for Detailed Testing)

**Download:** https://www.postman.com/downloads/

**Setup Steps:**
1. Install Postman
2. Create new Collection: "Library Management API"
3. Add environment variables:
   - `base_url`: `http://localhost:4000/api`
   - `token`: (will be set after login)

**Advantages:**
- ✅ Save requests for reuse
- ✅ Automated testing scripts
- ✅ Environment management
- ✅ Collection runner for batch tests
- ✅ Test history

### Option 3: cURL (Command Line)

**Usage:** For quick tests or automation

```bash
# Example: Test health endpoint
curl http://localhost:4000/api/health

# Example: Register user
curl -X POST http://localhost:4000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"cardnumber\":\"TEST001\",\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"Test123!\",\"categorycode\":\"ADULT\",\"role\":\"MEMBER\"}"
```

**Note:** On Windows CMD, use `^` for line continuation. In PowerShell, use backtick `` ` ``.

---

## 🔐 Authentication Testing

### Test Case 1: Admin Registration

**Purpose:** Create an admin account for testing admin features

**Endpoint:** `POST /api/auth/register`

**Test Data:**
```json
{
  "cardnumber": "ADMIN001",
  "fullName": "Library Administrator",
  "email": "admin@library.test",
  "password": "AdminPass123!",
  "categorycode": "STAFF",
  "role": "ADMIN",
  "phone": "555-0100",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701"
  }
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "borrower": {
      "borrowernumber": 1,
      "cardnumber": "ADMIN001",
      "full_name": "Library Administrator",
      "email": "admin@library.test",
      "role": "ADMIN",
      "categorycode": "STAFF",
      "created_at": "2025-10-29T...",
      // password is NOT returned (security)
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Verification Steps:**
1. ✅ Status code is 201
2. ✅ Response includes `token` (JWT)
3. ✅ `role` is "ADMIN"
4. ✅ Password is NOT in response
5. ✅ Copy the token for subsequent tests

**Save This:**
- Admin Token: `<paste token here>`
- Admin ID: `<borrowernumber>`

---

### Test Case 2: Member Registration

**Purpose:** Create a regular member account

**Endpoint:** `POST /api/auth/register`

**Test Data:**
```json
{
  "cardnumber": "MEM001",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "Member123!",
  "categorycode": "ADULT",
  "role": "MEMBER",
  "phone": "555-0200",
  "address": {
    "street": "456 Oak Ave",
    "city": "Springfield",
    "state": "IL",
    "zip": "62702"
  }
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "borrower": {
      "borrowernumber": 2,
      "cardnumber": "MEM001",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "role": "MEMBER",
      "categorycode": "ADULT"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save This:**
- Member Token: `<paste token here>`
- Member ID: `<borrowernumber>`

---

### Test Case 3: Login - Admin

**Purpose:** Verify login with admin credentials

**Endpoint:** `POST /api/auth/login`

**Test Data:**
```json
{
  "email": "admin@library.test",
  "password": "AdminPass123!"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "borrower": {
      "borrowernumber": 1,
      "email": "admin@library.test",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Verification:**
1. ✅ Status 200
2. ✅ Token is returned
3. ✅ Role is ADMIN

---

### Test Case 4: Login - Invalid Credentials

**Purpose:** Verify error handling for wrong password

**Endpoint:** `POST /api/auth/login`

**Test Data:**
```json
{
  "email": "admin@library.test",
  "password": "WrongPassword123!"
}
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```

**Verification:**
1. ✅ Status 401
2. ✅ Error message is clear
3. ✅ No token returned

---

### Test Case 5: Login - Non-Existent User

**Purpose:** Verify error handling for non-existent email

**Endpoint:** `POST /api/auth/login`

**Test Data:**
```json
{
  "email": "nonexistent@example.com",
  "password": "AnyPassword123!"
}
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```

**Security Note:** Error message should be the same as wrong password (don't reveal if email exists)

---

### Test Case 6: Get Current User (Me)

**Purpose:** Verify token authentication

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "borrowernumber": 1,
    "cardnumber": "ADMIN001",
    "full_name": "Library Administrator",
    "email": "admin@library.test",
    "role": "ADMIN",
    "categorycode": "STAFF",
    "category": {
      "categorycode": "STAFF",
      "description": "Library Staff",
      "max_checkout_count": 20,
      "loan_period_days": 30
    }
  }
}
```

**Verification:**
1. ✅ Status 200
2. ✅ Includes category details
3. ✅ Password is NOT returned

---

### Test Case 7: Missing Token

**Purpose:** Verify protected endpoints require authentication

**Endpoint:** `GET /api/auth/me`

**Headers:** (NO Authorization header)

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "No authorization token provided"
  }
}
```

**Verification:**
1. ✅ Status 401
2. ✅ Clear error message
3. ✅ No data leaked

---

### Test Case 8: Invalid Token

**Purpose:** Verify token validation

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer invalid_token_string
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token"
  }
}
```

---

## 🔒 Role-Based Access Testing

### How to Test Role Separation

**Setup:**
1. Register/login as ADMIN (save token)
2. Register/login as MEMBER (save token)
3. Use each token for protected endpoints

### Admin vs Member Access Matrix

| Endpoint | Admin Access | Member Access |
|----------|--------------|---------------|
| **Authentication** |
| POST /api/auth/register | ✅ Yes | ✅ Yes |
| POST /api/auth/login | ✅ Yes | ✅ Yes |
| GET /api/auth/me | ✅ Yes | ✅ Yes |
| **Borrowers** |
| GET /api/borrowers | ✅ Yes | ❌ No (403) |
| POST /api/borrowers | ✅ Yes | ❌ No (403) |
| GET /api/borrowers/:id | ✅ Yes | ⚠️ Own only |
| PUT /api/borrowers/:id | ✅ Yes | ⚠️ Own only |
| DELETE /api/borrowers/:id | ✅ Yes | ❌ No (403) |
| **Catalog (Biblio)** |
| GET /api/biblio | ✅ Yes | ✅ Yes (read) |
| GET /api/biblio/:id | ✅ Yes | ✅ Yes (read) |
| POST /api/biblio | ✅ Yes | ❌ No (403) |
| PUT /api/biblio/:id | ✅ Yes | ❌ No (403) |
| DELETE /api/biblio/:id | ✅ Yes | ❌ No (403) |
| **Items** |
| GET /api/items | ✅ Yes | ✅ Yes (read) |
| GET /api/items/:id | ✅ Yes | ✅ Yes (read) |
| POST /api/items | ✅ Yes | ❌ No (403) |
| PUT /api/items/:id | ✅ Yes | ❌ No (403) |
| DELETE /api/items/:id | ✅ Yes | ❌ No (403) |
| **Circulation** |
| POST /api/circulation/checkout | ✅ Any borrower | ⚠️ Self only |
| POST /api/circulation/return | ✅ Any item | ⚠️ Own only |
| POST /api/circulation/renew | ✅ Any item | ⚠️ Own only |
| GET /api/circulation/issues | ✅ All issues | ⚠️ Own only |
| **Reserves (Holds)** |
| POST /api/reserves | ✅ Any borrower | ⚠️ Self only |
| DELETE /api/reserves/:id | ✅ Any hold | ⚠️ Own only |
| GET /api/reserves | ✅ All holds | ⚠️ Own only |
| **Accounts (Fines)** |
| GET /api/accounts | ✅ All accounts | ⚠️ Own only |
| POST /api/accounts/:id/pay | ✅ Any account | ⚠️ Own only |
| **System Preferences** |
| GET /api/system-preferences | ✅ Yes | ✅ Yes (read) |
| PUT /api/system-preferences/:key | ✅ Yes | ❌ No (403) |

**Legend:**
- ✅ = Full access
- ⚠️ = Limited access (own data only)
- ❌ = No access (returns 403 Forbidden)

---

### Test Case 9: Member Tries Admin Endpoint

**Purpose:** Verify 403 Forbidden for unauthorized access

**Endpoint:** `GET /api/borrowers` (Admin only)

**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions. Admin access required."
  }
}
```

**Verification:**
1. ✅ Status 403 (not 401)
2. ✅ Clear error message
3. ✅ No data leaked

---

### Test Case 10: Member Accesses Own Data

**Purpose:** Verify members can view own profile

**Endpoint:** `GET /api/borrowers/:id` (replace :id with member's borrowernumber)

**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "borrowernumber": 2,
    "cardnumber": "MEM001",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "role": "MEMBER"
  }
}
```

**Verification:**
1. ✅ Status 200
2. ✅ Returns own data
3. ✅ Sensitive fields handled properly

---

### Test Case 11: Member Tries to Access Another Member's Data

**Purpose:** Verify members cannot view other members

**Endpoint:** `GET /api/borrowers/:id` (use different member ID)

**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": {
    "message": "You can only access your own data"
  }
}
```

---

## ✅ Quick Start Testing Checklist

Use this quick checklist to verify basic functionality:

### Phase 1: Environment Check (5 minutes)
- [ ] PostgreSQL database is running (port 5433)
- [ ] API server starts without errors (`npm run dev`)
- [ ] Health endpoint returns 200: `GET http://localhost:4000/api/health`
- [ ] Swagger UI loads: http://localhost:4000/docs
- [ ] Seed data exists in database

### Phase 2: Authentication (10 minutes)
- [ ] Register admin account (role: ADMIN)
- [ ] Register member account (role: MEMBER)
- [ ] Login with admin credentials (receive token)
- [ ] Login with member credentials (receive token)
- [ ] Get current user with admin token
- [ ] Get current user with member token
- [ ] Test invalid password (401 error)
- [ ] Test missing token (401 error)

### Phase 3: Basic CRUD - Catalog (15 minutes)
- [ ] Admin: Create biblio record (POST /api/biblio)
- [ ] Admin: List all biblio records (GET /api/biblio)
- [ ] Admin: Get single biblio (GET /api/biblio/:id)
- [ ] Admin: Update biblio (PUT /api/biblio/:id)
- [ ] Member: Try to create biblio (403 error)
- [ ] Member: View biblio records (200 success)

### Phase 4: Basic CRUD - Items (15 minutes)
- [ ] Admin: Create item for biblio (POST /api/items)
- [ ] Admin: List all items (GET /api/items)
- [ ] Admin: Get single item (GET /api/items/:id)
- [ ] Admin: Update item status (PUT /api/items/:id)
- [ ] Member: Try to create item (403 error)
- [ ] Member: View items (200 success)

### Phase 5: Circulation Flow (20 minutes)
- [ ] Admin: Checkout item to member (POST /api/circulation/checkout)
- [ ] Verify item status changed to "issued"
- [ ] Verify due date calculated correctly
- [ ] Member: View own checkouts (GET /api/circulation/issues)
- [ ] Member: Renew item (POST /api/circulation/renew)
- [ ] Admin: Return item past due date (POST /api/circulation/return)
- [ ] Verify fine created in accounts

### Phase 6: Reserves (Holds) (10 minutes)
- [ ] Member: Place hold on title (POST /api/reserves)
- [ ] Member: View own holds (GET /api/reserves)
- [ ] Member: Try to place duplicate hold (409 error)
- [ ] Admin: View all holds (GET /api/reserves)
- [ ] Member: Cancel hold (DELETE /api/reserves/:id)

### Phase 7: Fines & Payments (10 minutes)
- [ ] Member: View own account lines (GET /api/accounts)
- [ ] Member: Pay own fine (POST /api/accounts/:id/pay)
- [ ] Member: Try to pay another's fine (403 error)
- [ ] Admin: View all accounts (GET /api/accounts)
- [ ] Admin: Process payment for any borrower

### Phase 8: System Configuration (5 minutes)
- [ ] Anyone: View system preferences (GET /api/system-preferences)
- [ ] Admin: Update preference (PUT /api/system-preferences/:key)
- [ ] Member: Try to update preference (403 error)

### Phase 9: Validation Testing (15 minutes)
- [ ] Try to register with invalid email format (400 error)
- [ ] Try to register with weak password (400 error)
- [ ] Try to create biblio without title (400 error)
- [ ] Try to create item with duplicate barcode (400 error)
- [ ] Try to checkout non-existent item (404 error)
- [ ] Try to checkout already-issued item (400 error)

### Phase 10: Pagination & Filtering (10 minutes)
- [ ] List biblio with pagination: `?page=1&limit=10`
- [ ] Search biblio by title: `?search=<title>`
- [ ] Filter items by status: `?status=available`
- [ ] Sort biblio: `?sortBy=title&order=asc`
- [ ] Verify pagination metadata in response

---

## 📊 Testing Status Tracker

Use this table to track your testing progress:

| Category | Total Tests | Passed | Failed | Notes |
|----------|-------------|--------|--------|-------|
| Authentication | 8 | ___ | ___ | |
| Borrower CRUD | 6 | ___ | ___ | |
| Biblio CRUD | 6 | ___ | ___ | |
| Item CRUD | 6 | ___ | ___ | |
| Circulation | 7 | ___ | ___ | |
| Reserves | 6 | ___ | ___ | |
| Accounts | 4 | ___ | ___ | |
| System Prefs | 3 | ___ | ___ | |
| Role-Based Access | 10 | ___ | ___ | |
| Validation | 8 | ___ | ___ | |
| Pagination | 5 | ___ | ___ | |
| **TOTAL** | **69** | ___ | ___ | |

---

## 🎯 Success Criteria

Your API is ready for submission when:

✅ All 69 basic tests pass  
✅ Admin can perform all CRUD operations  
✅ Members can only access own data  
✅ Invalid inputs return proper 400 errors  
✅ Unauthorized access returns 401/403 errors  
✅ Business logic (checkout, fines) works correctly  
✅ Pagination returns correct data  
✅ Database persists changes correctly  
✅ Swagger documentation is accessible  
✅ No server crashes during testing  

---

## 📞 Quick Reference

### Important URLs
- **API Base:** http://localhost:4000/api
- **Health Check:** http://localhost:4000/api/health
- **Swagger Docs:** http://localhost:4000/docs

### Test Accounts Created
- **Admin:** admin@library.test / AdminPass123!
- **Member:** john.doe@example.com / Member123!

### Common Status Codes
- **200:** OK - Request successful
- **201:** Created - Resource created successfully
- **400:** Bad Request - Validation error
- **401:** Unauthorized - Missing or invalid token
- **403:** Forbidden - Insufficient permissions
- **404:** Not Found - Resource doesn't exist
- **409:** Conflict - Duplicate entry
- **500:** Server Error - Something went wrong

---

**Next Steps:**
1. Complete this testing checklist
2. Refer to `API_ENDPOINTS_CHECKLIST.md` for detailed endpoint tests
3. Refer to `USER_FLOWS_DOCUMENTATION.md` for complete user journeys
4. Refer to `BUSINESS_LOGIC_TESTING.md` for complex scenarios

---

**Document Created:** October 29, 2025  
**Status:** ✅ Ready for Use  
**Estimated Testing Time:** 2-3 hours for complete manual testing
