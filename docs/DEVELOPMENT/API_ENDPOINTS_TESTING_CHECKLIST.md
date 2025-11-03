# 🔍 API Endpoints Testing Checklist - Library Management System

**Version:** 1.0  
**Total Endpoints:** 45+  
**Date:** October 29, 2025  
**Purpose:** Comprehensive endpoint-by-endpoint testing guide

---

## 📚 Table of Contents

1. [Authentication Endpoints (3)](#1-authentication-endpoints)
2. [Borrower Management (5)](#2-borrower-management-endpoints)
3. [Bibliographic Catalog (5)](#3-bibliographic-catalog-endpoints)
4. [Physical Items (6)](#4-physical-items-endpoints)
5. [Circulation Operations (7)](#5-circulation-operations-endpoints)
6. [Reserves/Holds (5)](#6-reserves-holds-endpoints)
7. [Account Lines/Fines (4)](#7-account-lines-fines-endpoints)
8. [System Preferences (3)](#8-system-preferences-endpoints)
9. [Health & Utility (2)](#9-health--utility-endpoints)

---

## Testing Legend

**Status Codes:**
- ✅ **200** - OK (Success)
- ✅ **201** - Created (Resource created)
- ⚠️ **400** - Bad Request (Validation error)
- ⚠️ **401** - Unauthorized (No/invalid token)
- ⚠️ **403** - Forbidden (Insufficient permissions)
- ⚠️ **404** - Not Found (Resource doesn't exist)
- ⚠️ **409** - Conflict (Duplicate entry)
- ❌ **500** - Server Error (Something went wrong)

**Access Levels:**
- 🌐 **Public** - No authentication required
- 🔓 **Authenticated** - Valid token required
- 👤 **Member** - Member role with own data only
- 👑 **Admin** - Admin role required

---

## 1. Authentication Endpoints

### 1.1 POST /api/auth/register
**Purpose:** Register new user account  
**Access:** 🌐 Public  
**Authentication:** None

#### Test Case 1: Valid Admin Registration
**Request Body:**
```json
{
  "cardnumber": "ADM001",
  "fullName": "Admin User",
  "email": "admin@test.com",
  "password": "Admin@123",
  "categorycode": "STAFF",
  "role": "ADMIN",
  "phone": "555-1234",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701"
  }
}
```

**Expected:** ✅ **201 Created**
```json
{
  "success": true,
  "data": {
    "borrower": {
      "borrowernumber": 1,
      "cardnumber": "ADM001",
      "full_name": "Admin User",
      "email": "admin@test.com",
      "role": "ADMIN",
      "categorycode": "STAFF"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Verify:**
- [ ] Status code is 201
- [ ] Token is present
- [ ] Password is NOT in response
- [ ] Role is "ADMIN"
- [ ] Created_at timestamp is present

---

#### Test Case 2: Valid Member Registration
**Request Body:**
```json
{
  "cardnumber": "MEM001",
  "fullName": "Regular Member",
  "email": "member@test.com",
  "password": "Member@123",
  "categorycode": "ADULT",
  "role": "MEMBER"
}
```

**Expected:** ✅ **201 Created**
**Verify:**
- [ ] Role is "MEMBER"
- [ ] Token generated
- [ ] Default category assigned

---

#### Test Case 3: Duplicate Email
**Request Body:**
```json
{
  "cardnumber": "MEM002",
  "fullName": "Another User",
  "email": "admin@test.com",  // Already used
  "password": "Test@123",
  "categorycode": "ADULT",
  "role": "MEMBER"
}
```

**Expected:** ⚠️ **409 Conflict**
```json
{
  "success": false,
  "error": {
    "message": "Email already exists"
  }
}
```

---

#### Test Case 4: Invalid Email Format
**Request Body:**
```json
{
  "email": "invalid-email",  // Missing @
  "password": "Test@123",
  "fullName": "Test",
  "cardnumber": "TEST001",
  "categorycode": "ADULT"
}
```

**Expected:** ⚠️ **400 Bad Request**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

---

#### Test Case 5: Missing Required Fields
**Request Body:**
```json
{
  "email": "test@test.com"
  // Missing: password, fullName, cardnumber, categorycode
}
```

**Expected:** ⚠️ **400 Bad Request**

---

#### Test Case 6: Weak Password
**Request Body:**
```json
{
  "email": "test@test.com",
  "password": "123",  // Too short
  "fullName": "Test User",
  "cardnumber": "TEST001",
  "categorycode": "ADULT"
}
```

**Expected:** ⚠️ **400 Bad Request**

---

### 1.2 POST /api/auth/login
**Purpose:** Login with credentials  
**Access:** 🌐 Public

#### Test Case 7: Valid Login
**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "Admin@123"
}
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "borrower": {
      "borrowernumber": 1,
      "email": "admin@test.com",
      "role": "ADMIN",
      "full_name": "Admin User"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Verify:**
- [ ] Token is different from registration token
- [ ] Token contains user ID and role (decode at jwt.io)
- [ ] No password in response

---

#### Test Case 8: Invalid Password
**Request Body:**
```json
{
  "email": "admin@test.com",
  "password": "WrongPassword"
}
```

**Expected:** ⚠️ **401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```

---

#### Test Case 9: Non-Existent User
**Request Body:**
```json
{
  "email": "nonexistent@test.com",
  "password": "AnyPassword"
}
```

**Expected:** ⚠️ **401 Unauthorized**
**Note:** Same error as wrong password (security best practice)

---

### 1.3 GET /api/auth/me
**Purpose:** Get current user profile  
**Access:** 🔓 Authenticated

#### Test Case 10: Valid Token
**Headers:**
```
Authorization: Bearer <valid_admin_token>
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "borrowernumber": 1,
    "cardnumber": "ADM001",
    "full_name": "Admin User",
    "email": "admin@test.com",
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

**Verify:**
- [ ] Includes category details
- [ ] No password field
- [ ] All profile fields present

---

#### Test Case 11: Missing Token
**Headers:** (No Authorization header)

**Expected:** ⚠️ **401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "message": "No authorization token provided"
  }
}
```

---

#### Test Case 12: Invalid Token
**Headers:**
```
Authorization: Bearer invalid_token_here
```

**Expected:** ⚠️ **401 Unauthorized**

---

## 2. Borrower Management Endpoints

### 2.1 GET /api/borrowers
**Purpose:** List all borrowers (paginated)  
**Access:** 👑 Admin Only

#### Test Case 13: Admin - List All Borrowers
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:** (Optional)
```
?page=1&limit=20&search=john&sortBy=full_name&order=asc
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "borrowers": [
      {
        "borrowernumber": 1,
        "cardnumber": "ADM001",
        "full_name": "Admin User",
        "email": "admin@test.com",
        "role": "ADMIN",
        "categorycode": "STAFF",
        "created_at": "2025-10-29T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

**Verify:**
- [ ] Pagination metadata present
- [ ] Results sorted correctly
- [ ] Search filtering works
- [ ] No password fields in response

---

#### Test Case 14: Member - Try to List All (Forbidden)
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ⚠️ **403 Forbidden**
```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions. Admin access required."
  }
}
```

---

#### Test Case 15: No Token - Unauthorized
**Headers:** (No Authorization)

**Expected:** ⚠️ **401 Unauthorized**

---

### 2.2 POST /api/borrowers
**Purpose:** Create new borrower  
**Access:** 👑 Admin Only

#### Test Case 16: Admin - Create Borrower
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "cardnumber": "BRW001",
  "fullName": "Jane Smith",
  "email": "jane@test.com",
  "password": "Jane@123",
  "categorycode": "ADULT",
  "role": "MEMBER",
  "phone": "555-5678",
  "dateofbirth": "1990-05-15",
  "address": {
    "street": "789 Oak St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62703"
  }
}
```

**Expected:** ✅ **201 Created**

**Verify:**
- [ ] Borrowernumber auto-generated
- [ ] Password is hashed (not visible)
- [ ] Created_at timestamp present
- [ ] Category relationship established

---

#### Test Case 17: Duplicate Cardnumber
**Request Body:**
```json
{
  "cardnumber": "ADM001",  // Already exists
  "fullName": "Test",
  "email": "test@test.com",
  "password": "Test@123",
  "categorycode": "ADULT"
}
```

**Expected:** ⚠️ **409 Conflict**

---

#### Test Case 18: Invalid Category Code
**Request Body:**
```json
{
  "categorycode": "INVALID",  // Doesn't exist
  "cardnumber": "TEST002",
  "fullName": "Test",
  "email": "test@test.com",
  "password": "Test@123"
}
```

**Expected:** ⚠️ **400 Bad Request**

---

### 2.3 GET /api/borrowers/:id
**Purpose:** Get borrower by ID  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 19: Admin - View Any Borrower
**URL:** `/api/borrowers/2`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ✅ **200 OK**

---

#### Test Case 20: Member - View Own Profile
**URL:** `/api/borrowers/<member_id>`  
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK**

---

#### Test Case 21: Member - Try to View Another Member
**URL:** `/api/borrowers/1` (admin's ID)  
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ⚠️ **403 Forbidden**

---

#### Test Case 22: Non-Existent Borrower
**URL:** `/api/borrowers/99999`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ⚠️ **404 Not Found**

---

### 2.4 PUT /api/borrowers/:id
**Purpose:** Update borrower information  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 23: Admin - Update Any Borrower
**URL:** `/api/borrowers/2`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "phone": "555-9999",
  "address": {
    "street": "New Address",
    "city": "New City",
    "state": "IL",
    "zip": "62704"
  }
}
```

**Expected:** ✅ **200 OK**

**Verify:**
- [ ] Only provided fields updated
- [ ] Updated_at timestamp changed
- [ ] Other fields unchanged

---

#### Test Case 24: Member - Update Own Profile
**URL:** `/api/borrowers/<member_id>`  
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK**

---

#### Test Case 25: Member - Try to Change Role
**URL:** `/api/borrowers/<member_id>`  
**Headers:**
```
Authorization: Bearer <member_token>
```

**Request Body:**
```json
{
  "role": "ADMIN"  // Attempt privilege escalation
}
```

**Expected:** ⚠️ **403 Forbidden** OR role change ignored

---

### 2.5 DELETE /api/borrowers/:id
**Purpose:** Delete borrower (soft delete)  
**Access:** 👑 Admin Only

#### Test Case 26: Admin - Delete Borrower
**URL:** `/api/borrowers/3`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ✅ **200 OK** OR **204 No Content**

**Verify:**
- [ ] Borrower not in list anymore
- [ ] OR has deleted flag set to true

---

#### Test Case 27: Member - Try to Delete
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ⚠️ **403 Forbidden**

---

## 3. Bibliographic Catalog Endpoints

### 3.1 GET /api/biblio
**Purpose:** List all bibliographic records  
**Access:** 🔓 Authenticated (All can read)

#### Test Case 28: List All Biblio Records
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?page=1&limit=20&search=potter&sortBy=title&order=asc
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "biblio": [
      {
        "biblionumber": 1,
        "title": "Harry Potter and the Philosopher's Stone",
        "author": "J.K. Rowling",
        "isbn": "9780439708180",
        "publisher": "Scholastic",
        "publicationyear": 1998,
        "itemtype": "BOOK",
        "items": [
          {
            "itemnumber": 1,
            "barcode": "ITEM001",
            "status": "available"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Verify:**
- [ ] Includes related items
- [ ] Pagination works
- [ ] Search filters by title/author/ISBN
- [ ] Sorting works

---

#### Test Case 29: Member Can View Catalog
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK**

---

### 3.2 GET /api/biblio/:id
**Purpose:** Get single biblio record  
**Access:** 🔓 Authenticated

#### Test Case 30: Get Biblio by ID
**URL:** `/api/biblio/1`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "biblionumber": 1,
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "isbn": "9780439708180",
    "items": [
      {
        "itemnumber": 1,
        "barcode": "ITEM001",
        "status": "available",
        "location": "MAIN"
      }
    ]
  }
}
```

**Verify:**
- [ ] All fields present
- [ ] Related items included
- [ ] ItemType details included

---

#### Test Case 31: Non-Existent Biblio
**URL:** `/api/biblio/99999`

**Expected:** ⚠️ **404 Not Found**

---

### 3.3 POST /api/biblio
**Purpose:** Create new biblio record  
**Access:** 👑 Admin Only

#### Test Case 32: Admin - Create Biblio
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "title": "The Hobbit",
  "subtitle": "There and Back Again",
  "author": "J.R.R. Tolkien",
  "isbn": "9780547928227",
  "publisher": "Houghton Mifflin Harcourt",
  "publicationyear": 1937,
  "itemtype": "BOOK",
  "abstract": "A fantasy adventure novel",
  "notes": "Classic fantasy literature"
}
```

**Expected:** ✅ **201 Created**

**Verify:**
- [ ] Biblionumber auto-generated
- [ ] Created_at timestamp present
- [ ] All fields saved correctly

---

#### Test Case 33: Missing Required Fields
**Request Body:**
```json
{
  "author": "Test Author"
  // Missing: title (required)
}
```

**Expected:** ⚠️ **400 Bad Request**

---

#### Test Case 34: Duplicate ISBN
**Request Body:**
```json
{
  "title": "Another Book",
  "author": "Test",
  "isbn": "9780439708180"  // Already exists
}
```

**Expected:** ⚠️ **409 Conflict**

---

#### Test Case 35: Member - Try to Create (Forbidden)
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ⚠️ **403 Forbidden**

---

### 3.4 PUT /api/biblio/:id
**Purpose:** Update biblio record  
**Access:** 👑 Admin Only

#### Test Case 36: Admin - Update Biblio
**URL:** `/api/biblio/1`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "notes": "Updated notes",
  "abstract": "Updated abstract"
}
```

**Expected:** ✅ **200 OK**

**Verify:**
- [ ] Updated_at changed
- [ ] Only specified fields updated
- [ ] Other fields unchanged

---

#### Test Case 37: Member - Try to Update
**Expected:** ⚠️ **403 Forbidden**

---

### 3.5 DELETE /api/biblio/:id
**Purpose:** Delete biblio record  
**Access:** 👑 Admin Only

#### Test Case 38: Admin - Delete Biblio
**URL:** `/api/biblio/2`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ✅ **200 OK** OR **204 No Content**

**Verify:**
- [ ] Record no longer in database
- [ ] OR has deleted flag
- [ ] Related items handled (cascade or error)

---

#### Test Case 39: Delete With Active Items
**URL:** `/api/biblio/1` (has items)

**Expected:** ⚠️ **400 Bad Request** OR cascade deletes items

---

## 4. Physical Items Endpoints

### 4.1 GET /api/items
**Purpose:** List all physical items  
**Access:** 🔓 Authenticated

#### Test Case 40: List All Items
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?page=1&limit=20&status=available&barcode=ITEM&biblionumber=1
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "itemnumber": 1,
        "biblionumber": 1,
        "barcode": "ITEM001",
        "status": "available",
        "location": "MAIN",
        "price": 25.99,
        "issues": 0,
        "renewals": 0,
        "biblio": {
          "biblionumber": 1,
          "title": "Harry Potter and the Philosopher's Stone",
          "author": "J.K. Rowling"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Verify:**
- [ ] Filter by status works
- [ ] Filter by barcode works
- [ ] Filter by biblionumber works
- [ ] Includes biblio relationship

---

#### Test Case 41: Filter by Status
**Query:** `?status=issued`

**Expected:** Only items with status "issued"

---

### 4.2 GET /api/items/:id
**Purpose:** Get single item  
**Access:** 🔓 Authenticated

#### Test Case 42: Get Item by ID
**URL:** `/api/items/1`

**Expected:** ✅ **200 OK**

**Verify:**
- [ ] Includes biblio details
- [ ] Status is accurate
- [ ] All item fields present

---

### 4.3 GET /api/items/barcode/:barcode
**Purpose:** Find item by barcode  
**Access:** 🔓 Authenticated

#### Test Case 43: Find by Barcode
**URL:** `/api/items/barcode/ITEM001`

**Expected:** ✅ **200 OK**

---

#### Test Case 44: Non-Existent Barcode
**URL:** `/api/items/barcode/NOTEXIST`

**Expected:** ⚠️ **404 Not Found**

---

### 4.4 POST /api/items
**Purpose:** Create new item  
**Access:** 👑 Admin Only

#### Test Case 45: Admin - Create Item
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "biblionumber": 1,
  "barcode": "ITEM002",
  "itemcallnumber": "FIC ROW HAR",
  "location": "MAIN",
  "price": 25.99,
  "replacementprice": 30.00,
  "status": "available",
  "notforloan": false
}
```

**Expected:** ✅ **201 Created**

**Verify:**
- [ ] Itemnumber auto-generated
- [ ] Linked to correct biblio
- [ ] Created_at timestamp present
- [ ] Status is "available" by default

---

#### Test Case 46: Duplicate Barcode
**Request Body:**
```json
{
  "biblionumber": 1,
  "barcode": "ITEM001"  // Already exists
}
```

**Expected:** ⚠️ **409 Conflict**

---

#### Test Case 47: Invalid Biblionumber
**Request Body:**
```json
{
  "biblionumber": 99999,  // Doesn't exist
  "barcode": "ITEM003"
}
```

**Expected:** ⚠️ **400 Bad Request**

---

### 4.5 PUT /api/items/:id
**Purpose:** Update item  
**Access:** 👑 Admin Only

#### Test Case 48: Admin - Update Item Status
**URL:** `/api/items/1`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "status": "damaged",
  "notes": "Water damage on cover"
}
```

**Expected:** ✅ **200 OK**

**Verify:**
- [ ] Status changed
- [ ] Status_date updated
- [ ] Updated_at changed

---

#### Test Case 49: Invalid Status
**Request Body:**
```json
{
  "status": "invalid_status"
}
```

**Expected:** ⚠️ **400 Bad Request**

**Valid statuses:** available, issued, damaged, lost, withdrawn, on_order

---

### 4.6 DELETE /api/items/:id
**Purpose:** Delete item  
**Access:** 👑 Admin Only

#### Test Case 50: Admin - Delete Item
**URL:** `/api/items/2`

**Expected:** ✅ **200 OK**

---

#### Test Case 51: Delete Item That's Checked Out
**URL:** `/api/items/1` (status: issued)

**Expected:** ⚠️ **400 Bad Request** (cannot delete checked-out item)

---

## 5. Circulation Operations Endpoints

### 5.1 GET /api/circulation/issues
**Purpose:** List checkouts  
**Access:** 👑 Admin (all) | 👤 Member (own only)

#### Test Case 52: Admin - View All Issues
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?page=1&limit=20&borrowernumber=2&status=active
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "issue_id": 1,
        "borrowernumber": 2,
        "itemnumber": 1,
        "issuedate": "2025-10-29T10:00:00Z",
        "date_due": "2025-11-12T23:59:59Z",
        "renewals_count": 0,
        "borrower": {
          "full_name": "John Doe",
          "cardnumber": "MEM001"
        },
        "item": {
          "barcode": "ITEM001",
          "biblio": {
            "title": "Harry Potter"
          }
        }
      }
    ],
    "pagination": {...}
  }
}
```

**Verify:**
- [ ] Includes borrower details
- [ ] Includes item and biblio details
- [ ] Due date calculated correctly
- [ ] Filters work

---

#### Test Case 53: Member - View Own Issues Only
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK** (only member's checkouts)

**Verify:**
- [ ] Only returns issues for logged-in member
- [ ] Cannot see other members' checkouts

---

### 5.2 POST /api/circulation/checkout
**Purpose:** Checkout item to borrower  
**Access:** 👑 Admin (any) | 👤 Member (self only)

#### Test Case 54: Admin - Checkout to Any Borrower
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "borrowernumber": 2,
  "itemnumber": 1
}
```

**Expected:** ✅ **201 Created**
```json
{
  "success": true,
  "data": {
    "issue_id": 1,
    "borrowernumber": 2,
    "itemnumber": 1,
    "issuedate": "2025-10-29T10:00:00Z",
    "date_due": "2025-11-12T23:59:59Z"
  }
}
```

**Verify:**
- [ ] Issue record created
- [ ] Due date = today + loan_period_days (from category)
- [ ] Item status changed to "issued"
- [ ] Item.onloan set to due date
- [ ] Item.issues counter incremented

---

#### Test Case 55: Member - Self Checkout
**Headers:**
```
Authorization: Bearer <member_token>
```

**Request Body:**
```json
{
  "borrowernumber": 2,  // Member's own ID
  "itemnumber": 1
}
```

**Expected:** ✅ **201 Created**

---

#### Test Case 56: Member - Try to Checkout for Another
**Request Body:**
```json
{
  "borrowernumber": 1,  // Different borrower
  "itemnumber": 1
}
```

**Expected:** ⚠️ **403 Forbidden**

---

#### Test Case 57: Item Already Checked Out
**Request Body:**
```json
{
  "borrowernumber": 2,
  "itemnumber": 1  // Status: issued
}
```

**Expected:** ⚠️ **400 Bad Request**
```json
{
  "error": {
    "message": "Item is already checked out"
  }
}
```

---

#### Test Case 58: Item Not For Loan
**Request Body:**
```json
{
  "itemnumber": 5  // notforloan: true
}
```

**Expected:** ⚠️ **400 Bad Request**

---

#### Test Case 59: Borrower Reached Checkout Limit
**Setup:** Member has 5 items checked out (category limit: 5)  
**Request:** Checkout 6th item

**Expected:** ⚠️ **400 Bad Request**
```json
{
  "error": {
    "message": "Checkout limit reached (5/5)"
  }
}
```

---

#### Test Case 60: Borrower is Debarred
**Setup:** Borrower.debarred = future date  
**Request:** Checkout item

**Expected:** ⚠️ **403 Forbidden**
```json
{
  "error": {
    "message": "Borrower is restricted until 2025-12-31"
  }
}
```

---

### 5.3 POST /api/circulation/return
**Purpose:** Return checked-out item  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 61: Admin - Return Item (On Time)
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "itemnumber": 1
}
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "issue_id": 1,
    "returndate": "2025-11-10T14:30:00Z",
    "fine": 0.00
  }
}
```

**Verify:**
- [ ] Issue.returndate set
- [ ] Item status → "available"
- [ ] Item.onloan → null
- [ ] Item.datelastborrowed set
- [ ] No fine created (returned on time)

---

#### Test Case 62: Admin - Return Item (Overdue)
**Setup:** Issue with date_due = 2025-10-20 (9 days overdue)  
**System Preference:** fine_per_day = $0.50

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "issue_id": 1,
    "returndate": "2025-10-29T14:30:00Z",
    "fine": 4.50,
    "daysOverdue": 9
  }
}
```

**Verify:**
- [ ] Fine = 9 days × $0.50 = $4.50
- [ ] AccountLine created:
  - borrowernumber: <borrower>
  - itemnumber: 1
  - amount: 4.50
  - amountoutstanding: 4.50
  - accounttype: "FINE"
  - description: "Overdue fine"
- [ ] Item returned successfully

---

#### Test Case 63: Return Non-Issued Item
**Request Body:**
```json
{
  "itemnumber": 2  // Status: available (not checked out)
}
```

**Expected:** ⚠️ **400 Bad Request**

---

### 5.4 POST /api/circulation/renew
**Purpose:** Renew checked-out item  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 64: Member - Renew Own Item
**Headers:**
```
Authorization: Bearer <member_token>
```

**Request Body:**
```json
{
  "itemnumber": 1
}
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "issue_id": 1,
    "date_due": "2025-11-26T23:59:59Z",  // Extended by 14 days
    "renewals_count": 1,
    "lastreneweddate": "2025-10-29T..."
  }
}
```

**Verify:**
- [ ] Due date extended by loan_period_days
- [ ] Renewals_count incremented
- [ ] Lastreneweddate set
- [ ] Item.renewals incremented

---

#### Test Case 65: Renewal Limit Exceeded
**Setup:** Issue with renewals_count = 3 (system max_renewals = 3)

**Expected:** ⚠️ **403 Forbidden**
```json
{
  "error": {
    "message": "Maximum renewals (3) reached"
  }
}
```

---

#### Test Case 66: Renew Item With Active Hold
**Setup:** Item has a hold/reserve from another borrower

**Expected:** ⚠️ **403 Forbidden**
```json
{
  "error": {
    "message": "Cannot renew: item has active hold"
  }
}
```

---

### 5.5 GET /api/circulation/overdue
**Purpose:** Get overdue items  
**Access:** 👑 Admin

#### Test Case 67: Admin - View Overdue Items
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "overdueIssues": [
      {
        "issue_id": 2,
        "date_due": "2025-10-20T23:59:59Z",
        "daysOverdue": 9,
        "borrower": {
          "full_name": "John Doe",
          "email": "john@test.com"
        },
        "item": {
          "barcode": "ITEM002",
          "biblio": {
            "title": "The Hobbit"
          }
        }
      }
    ]
  }
}
```

---

## 6. Reserves (Holds) Endpoints

### 6.1 GET /api/reserves
**Purpose:** List reserves/holds  
**Access:** 👑 Admin (all) | 👤 Member (own only)

#### Test Case 68: Admin - View All Reserves
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?page=1&limit=20&borrowernumber=2&biblionumber=1&status=active
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "reserves": [
      {
        "reserve_id": 1,
        "borrowernumber": 2,
        "biblionumber": 1,
        "reservedate": "2025-10-29",
        "priority": 1,
        "found": "W",  // W=waiting, T=transit, P=processing
        "borrower": {
          "full_name": "John Doe"
        },
        "biblio": {
          "title": "Harry Potter"
        }
      }
    ],
    "pagination": {...}
  }
}
```

**Verify:**
- [ ] Includes borrower details
- [ ] Includes biblio details
- [ ] Priority queue maintained
- [ ] Filters work

---

#### Test Case 69: Member - View Own Reserves
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK** (only member's holds)

---

### 6.2 POST /api/reserves
**Purpose:** Place hold on title  
**Access:** 👑 Admin (any) | 👤 Member (self only)

#### Test Case 70: Member - Place Hold
**Headers:**
```
Authorization: Bearer <member_token>
```

**Request Body:**
```json
{
  "borrowernumber": 2,  // Own ID
  "biblionumber": 1,
  "itemnumber": 1  // Optional: specific item
}
```

**Expected:** ✅ **201 Created**
```json
{
  "success": true,
  "data": {
    "reserve_id": 1,
    "borrowernumber": 2,
    "biblionumber": 1,
    "reservedate": "2025-10-29",
    "priority": 1,
    "expirationdate": "2025-11-29"  // +30 days
  }
}
```

**Verify:**
- [ ] Reserve created
- [ ] Priority = highest + 1
- [ ] Expiration date calculated
- [ ] Item.reserves_count incremented

---

#### Test Case 71: Duplicate Hold
**Setup:** Borrower already has active hold on same biblionumber

**Expected:** ⚠️ **409 Conflict**
```json
{
  "error": {
    "message": "You already have an active hold on this title"
  }
}
```

---

#### Test Case 72: Member - Try to Hold for Another
**Request Body:**
```json
{
  "borrowernumber": 1,  // Different borrower
  "biblionumber": 1
}
```

**Expected:** ⚠️ **403 Forbidden**

---

### 6.3 DELETE /api/reserves/:id
**Purpose:** Cancel hold  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 73: Member - Cancel Own Hold
**URL:** `/api/reserves/1`  
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "reserve_id": 1,
    "cancellationdate": "2025-10-29T..."
  }
}
```

**Verify:**
- [ ] Cancellationdate set
- [ ] Priority updated for remaining holds
- [ ] Item.reserves_count decremented

---

#### Test Case 74: Member - Try to Cancel Another's Hold
**URL:** `/api/reserves/2` (belongs to another borrower)

**Expected:** ⚠️ **403 Forbidden**

---

## 7. Account Lines (Fines) Endpoints

### 7.1 GET /api/accounts
**Purpose:** List account lines (fines/payments)  
**Access:** 👑 Admin (all) | 👤 Member (own only)

#### Test Case 75: Admin - View All Accounts
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?page=1&limit=20&borrowernumber=2&accounttype=FINE&status=unpaid
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "accountlines": [
      {
        "accountlines_id": 1,
        "borrowernumber": 2,
        "itemnumber": 1,
        "date": "2025-10-29T...",
        "amount": 4.50,
        "amountoutstanding": 4.50,
        "description": "Overdue fine",
        "accounttype": "FINE",
        "status": "unpaid",
        "borrower": {
          "full_name": "John Doe"
        },
        "item": {
          "barcode": "ITEM001"
        }
      }
    ],
    "pagination": {...}
  }
}
```

**Verify:**
- [ ] Includes borrower details
- [ ] Includes item details if applicable
- [ ] Decimal amounts handled correctly
- [ ] Filters work

---

#### Test Case 76: Member - View Own Accounts
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK** (only member's accounts)

---

### 7.2 GET /api/accounts/summary
**Purpose:** Get account summary for borrower  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 77: Member - Get Own Summary
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "borrowernumber": 2,
    "totalFines": 12.50,
    "totalPaid": 5.00,
    "totalOutstanding": 7.50,
    "accountCount": 3
  }
}
```

---

### 7.3 POST /api/accounts/:id/pay
**Purpose:** Process payment  
**Access:** 👑 Admin (any) | 👤 Member (own only)

#### Test Case 78: Member - Pay Own Fine
**URL:** `/api/accounts/1`  
**Headers:**
```
Authorization: Bearer <member_token>
```

**Request Body:**
```json
{
  "amount": 4.50,
  "payment_type": "CASH"
}
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "accountlines_id": 1,
    "amountoutstanding": 0.00,
    "status": "paid",
    "payment": {
      "accountlines_id": 2,
      "amount": -4.50,
      "accounttype": "PAYMENT",
      "payment_type": "CASH"
    }
  }
}
```

**Verify:**
- [ ] Original fine: amountoutstanding reduced
- [ ] New payment record created (negative amount)
- [ ] Status updated to "paid" if fully paid
- [ ] Partial payments supported

---

#### Test Case 79: Partial Payment
**Request Body:**
```json
{
  "amount": 2.00  // Fine is $4.50
}
```

**Expected:** ✅ **200 OK**
```json
{
  "data": {
    "amountoutstanding": 2.50,  // $4.50 - $2.00
    "status": "partial"
  }
}
```

---

#### Test Case 80: Overpayment
**Request Body:**
```json
{
  "amount": 10.00  // Fine is $4.50
}
```

**Expected:** ⚠️ **400 Bad Request**
```json
{
  "error": {
    "message": "Payment amount exceeds outstanding balance"
  }
}
```

---

#### Test Case 81: Member - Try to Pay Another's Fine
**URL:** `/api/accounts/5` (belongs to another borrower)

**Expected:** ⚠️ **403 Forbidden**

---

## 8. System Preferences Endpoints

### 8.1 GET /api/system-preferences
**Purpose:** List all system preferences  
**Access:** 🔓 Authenticated (All can read)

#### Test Case 82: View All Preferences
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "preferences": [
      {
        "variable": "version",
        "value": "1.0.0",
        "explanation": "System version",
        "type": "string"
      },
      {
        "variable": "fine_per_day",
        "value": "0.50",
        "explanation": "Fine amount per day overdue",
        "type": "decimal"
      },
      {
        "variable": "max_renewals",
        "value": "3",
        "explanation": "Maximum renewals per item",
        "type": "integer"
      }
    ]
  }
}
```

**Verify:**
- [ ] All preferences returned
- [ ] Values are strings (converted from DB)
- [ ] Types indicated

---

#### Test Case 83: Member Can View Preferences
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ✅ **200 OK**

---

### 8.2 GET /api/system-preferences/:variable
**Purpose:** Get single preference  
**Access:** 🔓 Authenticated

#### Test Case 84: Get Specific Preference
**URL:** `/api/system-preferences/fine_per_day`

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "variable": "fine_per_day",
    "value": "0.50",
    "explanation": "Fine amount per day overdue",
    "type": "decimal"
  }
}
```

---

### 8.3 PUT /api/system-preferences/:variable
**Purpose:** Update preference value  
**Access:** 👑 Admin Only

#### Test Case 85: Admin - Update Preference
**URL:** `/api/system-preferences/fine_per_day`  
**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "value": "0.75"
}
```

**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "data": {
    "variable": "fine_per_day",
    "value": "0.75",
    "updated_at": "2025-10-29T..."
  }
}
```

**Verify:**
- [ ] Value updated
- [ ] Updated_at changed
- [ ] Change reflected in subsequent calculations

---

#### Test Case 86: Member - Try to Update
**Headers:**
```
Authorization: Bearer <member_token>
```

**Expected:** ⚠️ **403 Forbidden**

---

#### Test Case 87: Invalid Preference Key
**URL:** `/api/system-preferences/nonexistent_key`

**Expected:** ⚠️ **404 Not Found**

---

## 9. Health & Utility Endpoints

### 9.1 GET /api/health
**Purpose:** Health check  
**Access:** 🌐 Public

#### Test Case 88: Health Check
**Expected:** ✅ **200 OK**
```json
{
  "success": true,
  "message": "Library API is healthy"
}
```

**Verify:**
- [ ] No authentication required
- [ ] Fast response (<100ms)

---

### 9.2 GET /
**Purpose:** Root endpoint  
**Access:** 🌐 Public

#### Test Case 89: Root Endpoint
**Expected:** ✅ **200 OK**
```json
{
  "message": "Library Management API",
  "version": "1.0.0",
  "documentation": "/docs"
}
```

---

## 📊 Testing Summary Template

After completing all tests, fill this out:

### Overall Results
- **Total Endpoints Tested:** ____/45
- **Passed:** ____
- **Failed:** ____
- **Blocked:** ____

### By Category
| Category | Tested | Passed | Failed |
|----------|--------|--------|--------|
| Authentication | __/12 | __ | __ |
| Borrowers | __/15 | __ | __ |
| Biblio | __/12 | __ | __ |
| Items | __/12 | __ | __ |
| Circulation | __/16 | __ | __ |
| Reserves | __/7 | __ | __ |
| Accounts | __/7 | __ | __ |
| System Prefs | __/6 | __ | __ |
| Health | __/2 | __ | __ |

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Ready for Submission? ☐ Yes ☐ No

---

## 📞 Quick Reference

### Testing Tools
- **Swagger UI:** http://localhost:4000/docs (admin/admin123)
- **Postman Collection:** (Create and export)
- **Database Client:** Prisma Studio (`npx prisma studio`)

### Key Test Accounts
- **Admin:** admin@library.test / AdminPass123!
- **Member:** member@test.com / Member123!

### Status Code Quick Guide
- **2xx** = Success
- **400** = Bad request / validation
- **401** = Not authenticated
- **403** = Not authorized
- **404** = Not found
- **409** = Conflict (duplicate)
- **500** = Server error

---

**Document Status:** ✅ Complete  
**Last Updated:** October 29, 2025  
**Estimated Testing Time:** 4-6 hours for all 89 test cases
