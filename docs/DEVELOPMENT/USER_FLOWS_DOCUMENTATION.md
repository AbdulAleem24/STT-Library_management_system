# 👥 User Flow Documentation - Library Management System

**Version:** 1.0  
**Date:** October 29, 2025  
**Purpose:** Comprehensive Admin and Member User Journeys

---

## 📚 Table of Contents

1. [Admin User Flows](#admin-user-flows)
2. [Member User Flows](#member-user-flows)
3. [Common Workflows](#common-workflows)
4. [Error Handling Flows](#error-handling-flows)
5. [Testing Verification Points](#testing-verification-points)

---

## 🎯 Overview

This document provides **step-by-step user journeys** for testing the Library Management System API. Each flow includes:

- **Prerequisites:** What needs to be set up first
- **Step-by-Step Instructions:** Exact API calls to make
- **Expected Results:** What should happen at each step
- **Verification Points:** How to confirm success
- **Common Issues:** What might go wrong

---

## 👑 Admin User Flows

### Flow A1: Admin Account Setup & First Login

**Purpose:** Set up the first admin account and access the system  
**Duration:** 5 minutes  
**Prerequisites:** API server running, database seeded

#### Steps:

**Step 1: Register Admin Account**

**API Call:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "cardnumber": "ADMIN001",
  "fullName": "Library Administrator",
  "email": "admin@library.test",
  "password": "SecureAdmin@2025",
  "categorycode": "STAFF",
  "role": "ADMIN",
  "phone": "555-0100",
  "address": {
    "street": "123 Library Lane",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701"
  }
}
```

**Expected Response:** 201 Created
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
      "categorycode": "STAFF"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Verification:**
- ✅ Status code is 201
- ✅ Token is present and starts with "eyJ"
- ✅ Role is "ADMIN"
- ✅ Password is NOT in response
- ✅ Created_at timestamp is recent

**Save for Later:**
- Admin Token: `<copy token here>`
- Admin ID: `1`

---

**Step 2: Verify Token by Getting Profile**

**API Call:**
```http
GET /api/auth/me
Authorization: Bearer <admin_token_from_step_1>
```

**Expected Response:** 200 OK
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
- ✅ Profile data matches registration
- ✅ Category details included
- ✅ Checkout limits are 20 items
- ✅ Loan period is 30 days

---

**Step 3: Login Again (Test Login Endpoint)**

**API Call:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@library.test",
  "password": "SecureAdmin@2025"
}
```

**Expected Response:** 200 OK (returns new token)

**Verification:**
- ✅ New token generated
- ✅ Token is different from registration token
- ✅ Profile data included

---

**Step 4: View System Preferences**

**API Call:**
```http
GET /api/system-preferences
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK (list of all preferences)

**Verification:**
- ✅ `fine_per_day` preference exists (default: $0.50)
- ✅ `max_renewals` preference exists (default: 3)
- ✅ `loan_period` preference exists (default: 14)
- ✅ All preferences have values

---

### Flow A2: Admin - Complete Library Setup

**Purpose:** Set up the library catalog from scratch  
**Duration:** 15 minutes  
**Prerequisites:** Admin account from Flow A1

#### Steps:

**Step 1: Create First Book in Catalog**

**API Call:**
```http
POST /api/biblio
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Harry Potter and the Philosopher's Stone",
  "subtitle": "Book 1 of the Harry Potter Series",
  "author": "J.K. Rowling",
  "isbn": "9780439708180",
  "publisher": "Scholastic",
  "publicationyear": 1998,
  "itemtype": "BOOK",
  "abstract": "A young wizard begins his journey at Hogwarts School of Witchcraft and Wizardry.",
  "notes": "First edition"
}
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "biblionumber": 1,
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "isbn": "9780439708180",
    "created_at": "2025-10-29T..."
  }
}
```

**Verification:**
- ✅ Biblionumber auto-generated
- ✅ All fields saved correctly
- ✅ Created_at timestamp present

**Save for Later:**
- Biblio ID: `1`

---

**Step 2: Add Physical Copy (Item) of the Book**

**API Call:**
```http
POST /api/items
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "biblionumber": 1,
  "barcode": "HP001001",
  "itemcallnumber": "FIC ROW HAR 1",
  "location": "MAIN",
  "price": 25.99,
  "replacementprice": 30.00,
  "status": "available",
  "notforloan": false
}
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "itemnumber": 1,
    "biblionumber": 1,
    "barcode": "HP001001",
    "status": "available",
    "location": "MAIN"
  }
}
```

**Verification:**
- ✅ Item linked to biblio
- ✅ Status is "available"
- ✅ Barcode unique

**Save for Later:**
- Item ID: `1`
- Barcode: `HP001001`

---

**Step 3: Add More Copies**

**Repeat Step 2 with different barcodes:**
- HP001002 (copy 2)
- HP001003 (copy 3)

**Verification:**
- ✅ Each barcode is unique
- ✅ All linked to same biblionumber

---

**Step 4: Add Another Book**

**API Call:**
```http
POST /api/biblio
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "The Hobbit",
  "subtitle": "There and Back Again",
  "author": "J.R.R. Tolkien",
  "isbn": "9780547928227",
  "publisher": "Houghton Mifflin Harcourt",
  "publicationyear": 1937,
  "itemtype": "BOOK",
  "abstract": "Bilbo Baggins embarks on an unexpected adventure."
}
```

**Then add items for it (HOB001001, HOB001002, etc.)**

---

**Step 5: Verify Catalog**

**API Call:**
```http
GET /api/biblio?page=1&limit=20
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK (list of books with items)

**Verification:**
- ✅ All created books appear
- ✅ Each book shows item count
- ✅ Pagination metadata correct

---

### Flow A3: Admin - Member Management

**Purpose:** Create and manage library members  
**Duration:** 10 minutes

#### Steps:

**Step 1: Create Adult Member**

**API Call:**
```http
POST /api/borrowers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "cardnumber": "MEM001",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "Member@123",
  "categorycode": "ADULT",
  "role": "MEMBER",
  "phone": "555-0200",
  "dateofbirth": "1990-05-15",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Springfield",
    "state": "IL",
    "zip": "62702"
  }
}
```

**Expected Response:** 201 Created

**Save for Later:**
- Member ID: `<borrowernumber>`

---

**Step 2: Create Child Member**

**API Call:**
```http
POST /api/borrowers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "cardnumber": "MEM002",
  "fullName": "Emily Smith",
  "email": "emily.parent@example.com",
  "password": "Child@123",
  "categorycode": "CHILD",
  "role": "MEMBER",
  "phone": "555-0201",
  "dateofbirth": "2015-08-20",
  "address": {
    "street": "789 Maple Drive",
    "city": "Springfield",
    "state": "IL",
    "zip": "62703"
  }
}
```

**Verification:**
- ✅ Category is CHILD
- ✅ Max_checkout_count is 3 (from category)
- ✅ Loan_period_days is 7 (from category)

---

**Step 3: View All Members**

**API Call:**
```http
GET /api/borrowers?page=1&limit=20
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "borrowers": [
      {
        "borrowernumber": 1,
        "cardnumber": "ADMIN001",
        "full_name": "Library Administrator",
        "role": "ADMIN"
      },
      {
        "borrowernumber": 2,
        "cardnumber": "MEM001",
        "full_name": "John Doe",
        "role": "MEMBER"
      },
      {
        "borrowernumber": 3,
        "cardnumber": "MEM002",
        "full_name": "Emily Smith",
        "role": "MEMBER"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

**Verification:**
- ✅ All members listed
- ✅ Admin and members separated by role
- ✅ Pagination works

---

**Step 4: Search for Member**

**API Call:**
```http
GET /api/borrowers?search=john
Authorization: Bearer <admin_token>
```

**Expected Response:** Returns only "John Doe"

**Verification:**
- ✅ Search is case-insensitive
- ✅ Searches in full_name and email

---

**Step 5: Update Member Information**

**API Call:**
```http
PUT /api/borrowers/2
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "phone": "555-9999",
  "address": {
    "street": "123 New Street",
    "city": "Springfield",
    "state": "IL",
    "zip": "62704"
  }
}
```

**Expected Response:** 200 OK (updated member data)

**Verification:**
- ✅ Only specified fields changed
- ✅ Other fields unchanged
- ✅ Updated_at timestamp changed

---

### Flow A4: Admin - Process Checkout Workflow

**Purpose:** Complete checkout flow from member request to item checkout  
**Duration:** 10 minutes

#### Steps:

**Step 1: Verify Item is Available**

**API Call:**
```http
GET /api/items/1
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "itemnumber": 1,
    "barcode": "HP001001",
    "status": "available",
    "notforloan": false,
    "onloan": null
  }
}
```

**Verification:**
- ✅ Status is "available"
- ✅ Not marked as "notforloan"
- ✅ Onloan is null

---

**Step 2: Check Member Eligibility**

**API Call:**
```http
GET /api/borrowers/2
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK

**Verify:**
- ✅ Debarred is null or past date
- ✅ Current checkouts < max_checkout_count
- ✅ Category allows checkouts

---

**Step 3: Process Checkout**

**API Call:**
```http
POST /api/circulation/checkout
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "borrowernumber": 2,
  "itemnumber": 1
}
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "issue_id": 1,
    "borrowernumber": 2,
    "itemnumber": 1,
    "issuedate": "2025-10-29T10:00:00Z",
    "date_due": "2025-11-12T23:59:59Z",
    "renewals_count": 0
  }
}
```

**Verification:**
- ✅ Issue record created
- ✅ Due date = today + 14 days (ADULT category)
- ✅ Issue date is current timestamp
- ✅ Renewals_count starts at 0

---

**Step 4: Verify Item Status Changed**

**API Call:**
```http
GET /api/items/1
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "status": "issued",
    "onloan": "2025-11-12T23:59:59Z",
    "issues": 1
  }
}
```

**Verification:**
- ✅ Status changed to "issued"
- ✅ Onloan date matches due date
- ✅ Issues counter incremented

---

**Step 5: View Active Checkouts**

**API Call:**
```http
GET /api/circulation/issues
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK (list with the checkout)

**Verification:**
- ✅ New checkout appears in list
- ✅ Includes borrower and item details

---

### Flow A5: Admin - Process Return with Fine

**Purpose:** Return overdue item and calculate fine  
**Duration:** 10 minutes

#### Setup:
**Assume:** Item due on 2025-10-20, today is 2025-10-29 (9 days overdue)  
**Fine Rate:** $0.50/day  
**Expected Fine:** 9 × $0.50 = $4.50

#### Steps:

**Step 1: Check Current Checkout**

**API Call:**
```http
GET /api/circulation/issues?borrowernumber=2
Authorization: Bearer <admin_token>
```

**Expected Response:** Shows issue with past due date

**Verification:**
- ✅ Date_due is in the past
- ✅ Returndate is null

---

**Step 2: Process Return**

**API Call:**
```http
POST /api/circulation/return
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "itemnumber": 1
}
```

**Expected Response:** 200 OK
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

**Verification:**
- ✅ Return date set to now
- ✅ Fine calculated correctly (9 × $0.50)
- ✅ Days overdue is 9

---

**Step 3: Verify Item Status Reset**

**API Call:**
```http
GET /api/items/1
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "status": "available",
    "onloan": null,
    "datelastborrowed": "2025-10-29T14:30:00Z"
  }
}
```

**Verification:**
- ✅ Status back to "available"
- ✅ Onloan cleared
- ✅ Datelastborrowed updated

---

**Step 4: Verify Fine Created**

**API Call:**
```http
GET /api/accounts?borrowernumber=2
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "accountlines": [
      {
        "accountlines_id": 1,
        "borrowernumber": 2,
        "itemnumber": 1,
        "date": "2025-10-29T14:30:00Z",
        "amount": 4.50,
        "amountoutstanding": 4.50,
        "description": "Overdue fine (9 days)",
        "accounttype": "FINE",
        "status": "unpaid"
      }
    ]
  }
}
```

**Verification:**
- ✅ AccountLine created
- ✅ Amount is $4.50
- ✅ Amountoutstanding is $4.50 (unpaid)
- ✅ Accounttype is "FINE"
- ✅ Linked to borrower and item

---

**Step 5: View Member's Account Summary**

**API Call:**
```http
GET /api/accounts/summary?borrowernumber=2
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "totalFines": 4.50,
    "totalPaid": 0.00,
    "totalOutstanding": 4.50
  }
}
```

---

### Flow A6: Admin - Process Fine Payment

**Purpose:** Record payment for outstanding fine  
**Duration:** 5 minutes

#### Steps:

**Step 1: View Outstanding Fines**

**API Call:**
```http
GET /api/accounts?borrowernumber=2&status=unpaid
Authorization: Bearer <admin_token>
```

**Expected Response:** Shows unpaid $4.50 fine

---

**Step 2: Process Full Payment**

**API Call:**
```http
POST /api/accounts/1/pay
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "amount": 4.50,
  "payment_type": "CASH"
}
```

**Expected Response:** 200 OK
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
      "payment_type": "CASH",
      "date": "2025-10-29T..."
    }
  }
}
```

**Verification:**
- ✅ Original fine: amountoutstanding → 0.00
- ✅ Original fine: status → "paid"
- ✅ New payment record created (negative amount)
- ✅ Payment record linked to borrower

---

**Step 3: Verify Account Cleared**

**API Call:**
```http
GET /api/accounts/summary?borrowernumber=2
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "totalFines": 4.50,
    "totalPaid": 4.50,
    "totalOutstanding": 0.00
  }
}
```

---

### Flow A7: Admin - Manage Holds/Reserves

**Purpose:** Manage hold queue when items are in demand  
**Duration:** 15 minutes

#### Scenario:
- Item #1 is checked out
- Member #3 wants to reserve it
- Admin processes the hold

#### Steps:

**Step 1: Member Places Hold Request**
(Admin does this on behalf of member)

**API Call:**
```http
POST /api/reserves
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "borrowernumber": 3,
  "biblionumber": 1
}
```

**Expected Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "reserve_id": 1,
    "borrowernumber": 3,
    "biblionumber": 1,
    "reservedate": "2025-10-29",
    "priority": 1,
    "found": null,
    "expirationdate": "2025-11-29"
  }
}
```

**Verification:**
- ✅ Reserve created
- ✅ Priority is 1 (first in queue)
- ✅ Expiration date = +30 days

---

**Step 2: Another Member Places Hold**

**Repeat Step 1 with borrowernumber 4**

**Verification:**
- ✅ Priority is 2 (second in queue)

---

**Step 3: View All Reserves**

**API Call:**
```http
GET /api/reserves?biblionumber=1
Authorization: Bearer <admin_token>
```

**Expected Response:** List ordered by priority

**Verification:**
- ✅ Ordered by priority (1, 2, 3...)
- ✅ Shows all waiting members

---

**Step 4: Item is Returned**

(Follow Flow A5 to return item)

---

**Step 5: Check Out to First in Queue**

**API Call:**
```http
POST /api/circulation/checkout
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "borrowernumber": 3,  // First in queue
  "itemnumber": 1
}
```

**Expected Response:** 201 Created

**Verification:**
- ✅ Checkout succeeds (reserve fulfilled)
- ✅ Reserve status updated (optional)

---

**Step 6: Cancel a Hold**

**API Call:**
```http
DELETE /api/reserves/2
Authorization: Bearer <admin_token>
```

**Expected Response:** 200 OK

**Verification:**
- ✅ Reserve cancelled
- ✅ Cancellationdate set
- ✅ Priority queue reordered

---

### Flow A8: Admin - System Configuration

**Purpose:** Update system-wide settings  
**Duration:** 5 minutes

#### Steps:

**Step 1: View Current Settings**

**API Call:**
```http
GET /api/system-preferences
Authorization: Bearer <admin_token>
```

**Expected Response:** All preferences

---

**Step 2: Update Fine Rate**

**API Call:**
```http
PUT /api/system-preferences/fine_per_day
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "value": "0.75"
}
```

**Expected Response:** 200 OK

**Verification:**
- ✅ Value updated to $0.75
- ✅ Future fines calculated with new rate

---

**Step 3: Update Renewal Limit**

**API Call:**
```http
PUT /api/system-preferences/max_renewals
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "value": "5"
}
```

**Expected Response:** 200 OK

**Verification:**
- ✅ Members can now renew up to 5 times

---

---

## 👤 Member User Flows

### Flow M1: Member Registration & First Login

**Purpose:** Member self-service registration  
**Duration:** 5 minutes

#### Steps:

**Step 1: Self-Register**

**API Call:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "cardnumber": "MEM003",
  "fullName": "Sarah Johnson",
  "email": "sarah.j@example.com",
  "password": "Sarah@2025",
  "categorycode": "ADULT",
  "role": "MEMBER",
  "phone": "555-0300",
  "dateofbirth": "1992-03-10",
  "address": {
    "street": "321 Pine Street",
    "city": "Springfield",
    "state": "IL",
    "zip": "62704"
  }
}
```

**Expected Response:** 201 Created (with token)

**Save for Later:**
- Member Token: `<token>`
- Member ID: `<borrowernumber>`

---

**Step 2: View Own Profile**

**API Call:**
```http
GET /api/auth/me
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK (own profile)

**Verification:**
- ✅ Shows own data only
- ✅ Includes category limits

---

**Step 3: Try to View All Borrowers (Should Fail)**

**API Call:**
```http
GET /api/borrowers
Authorization: Bearer <member_token>
```

**Expected Response:** 403 Forbidden

**Verification:**
- ✅ Access denied
- ✅ Error message clear

---

### Flow M2: Member - Browse Catalog

**Purpose:** Search and browse available books  
**Duration:** 10 minutes

#### Steps:

**Step 1: View All Books**

**API Call:**
```http
GET /api/biblio?page=1&limit=20
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK (catalog list)

**Verification:**
- ✅ Members can view catalog
- ✅ Shows availability status

---

**Step 2: Search for Specific Book**

**API Call:**
```http
GET /api/biblio?search=potter
Authorization: Bearer <member_token>
```

**Expected Response:** Filtered results

---

**Step 3: View Book Details**

**API Call:**
```http
GET /api/biblio/1
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK (full details with items)

**Verification:**
- ✅ Shows all copies
- ✅ Shows which are available
- ✅ Shows which are checked out

---

**Step 4: Try to Add Book (Should Fail)**

**API Call:**
```http
POST /api/biblio
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "title": "Test Book",
  "author": "Test"
}
```

**Expected Response:** 403 Forbidden

---

### Flow M3: Member - Place Hold on Checked-Out Book

**Purpose:** Request notification when book becomes available  
**Duration:** 5 minutes

#### Prerequisites:
- Book is checked out to someone else
- Member has an account

#### Steps:

**Step 1: Check Book Availability**

**API Call:**
```http
GET /api/biblio/1
Authorization: Bearer <member_token>
```

**Response Shows:** All items have status "issued"

---

**Step 2: Place Hold**

**API Call:**
```http
POST /api/reserves
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "borrowernumber": 3,  // Own ID
  "biblionumber": 1
}
```

**Expected Response:** 201 Created

**Verification:**
- ✅ Reserve created
- ✅ Priority assigned
- ✅ Expiration date set

---

**Step 3: View Own Holds**

**API Call:**
```http
GET /api/reserves
Authorization: Bearer <member_token>
```

**Expected Response:** List of member's holds only

**Verification:**
- ✅ Shows only own holds
- ✅ Cannot see others' holds

---

**Step 4: Try to Place Duplicate Hold (Should Fail)**

**Repeat Step 2**

**Expected Response:** 409 Conflict

---

**Step 5: Cancel Hold**

**API Call:**
```http
DELETE /api/reserves/1
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK

---

### Flow M4: Member - Checkout, Renew, Return Flow

**Purpose:** Complete circulation workflow as member  
**Duration:** 15 minutes

#### Prerequisites:
- Admin has checked out item to member
- OR member has permission for self-checkout

#### Steps:

**Step 1: View Own Checkouts**

**API Call:**
```http
GET /api/circulation/issues
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "issue_id": 2,
        "borrowernumber": 3,
        "itemnumber": 2,
        "issuedate": "2025-10-29T...",
        "date_due": "2025-11-12T...",
        "renewals_count": 0,
        "item": {
          "barcode": "HP001002",
          "biblio": {
            "title": "Harry Potter..."
          }
        }
      }
    ]
  }
}
```

**Verification:**
- ✅ Shows only own checkouts
- ✅ Shows due dates
- ✅ Shows renewal count

---

**Step 2: Renew Item**

**API Call:**
```http
POST /api/circulation/renew
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "itemnumber": 2
}
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "issue_id": 2,
    "date_due": "2025-11-26T...",  // Extended
    "renewals_count": 1
  }
}
```

**Verification:**
- ✅ Due date extended by 14 days
- ✅ Renewals_count incremented
- ✅ Still within max_renewals limit

---

**Step 3: Try to Renew Again (Up to Limit)**

**Repeat Step 2 until renewals_count = max_renewals**

**Verification:**
- ✅ Each renewal extends due date
- ✅ Counter increments

---

**Step 4: Try to Renew Beyond Limit**

**Repeat Step 2 when renewals_count = max_renewals**

**Expected Response:** 403 Forbidden
```json
{
  "error": {
    "message": "Maximum renewals (3) reached"
  }
}
```

---

**Step 5: View Overdue Status**

**If item is overdue:**

**API Call:**
```http
GET /api/circulation/issues
Authorization: Bearer <member_token>
```

**Response Shows:**
- Overdue items highlighted
- Days overdue calculated

---

**Step 6: Return Item (If Self-Return Enabled)**

**API Call:**
```http
POST /api/circulation/return
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "itemnumber": 2
}
```

**Expected Response:** 200 OK

**Verification:**
- ✅ Item marked returned
- ✅ Fine calculated if overdue
- ✅ Fine added to account

---

### Flow M5: Member - View and Pay Fines

**Purpose:** Manage outstanding fines  
**Duration:** 5 minutes

#### Steps:

**Step 1: View Own Account**

**API Call:**
```http
GET /api/accounts
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK (own fines only)

**Verification:**
- ✅ Shows only own account lines
- ✅ Cannot see others' accounts

---

**Step 2: View Account Summary**

**API Call:**
```http
GET /api/accounts/summary
Authorization: Bearer <member_token>
```

**Expected Response:**
```json
{
  "data": {
    "totalFines": 10.50,
    "totalPaid": 5.00,
    "totalOutstanding": 5.50
  }
}
```

---

**Step 3: Pay Fine**

**API Call:**
```http
POST /api/accounts/1/pay
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "amount": 5.50,
  "payment_type": "CREDIT_CARD"
}
```

**Expected Response:** 200 OK

**Verification:**
- ✅ Payment recorded
- ✅ Outstanding balance updated

---

**Step 4: Try to Pay Another's Fine (Should Fail)**

**API Call:**
```http
POST /api/accounts/99/pay
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "amount": 1.00
}
```

**Expected Response:** 403 Forbidden

---

### Flow M6: Member - Update Own Profile

**Purpose:** Maintain current contact information  
**Duration:** 5 minutes

#### Steps:

**Step 1: View Current Profile**

**API Call:**
```http
GET /api/borrowers/<own_id>
Authorization: Bearer <member_token>
```

**Expected Response:** 200 OK

---

**Step 2: Update Contact Info**

**API Call:**
```http
PUT /api/borrowers/<own_id>
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "phone": "555-9999",
  "email": "new.email@example.com",
  "address": {
    "street": "New Address",
    "city": "Springfield",
    "state": "IL",
    "zip": "62705"
  }
}
```

**Expected Response:** 200 OK

**Verification:**
- ✅ Fields updated
- ✅ Sensitive fields protected

---

**Step 3: Try to Change Role (Should Be Ignored or Fail)**

**API Call:**
```http
PUT /api/borrowers/<own_id>
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "role": "ADMIN"
}
```

**Expected Response:** 403 Forbidden OR role unchanged

---

**Step 4: Try to Update Another Member (Should Fail)**

**API Call:**
```http
PUT /api/borrowers/1
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "phone": "123"
}
```

**Expected Response:** 403 Forbidden

---

## 🔄 Common Workflows

### Workflow CW1: Complete Circulation Cycle

**Purpose:** End-to-end flow from catalog to return  
**Duration:** 20 minutes  
**Roles:** Admin + Member

#### Steps:

1. **Admin:** Add book to catalog
2. **Admin:** Add physical item
3. **Member:** Browse catalog and find book
4. **Member:** Check if available
5. **Admin:** Check out item to member
6. **Member:** View own checkouts
7. **Member:** Renew item (if needed)
8. **Member:** Return item (or Admin returns)
9. **System:** Calculate fine if overdue
10. **Member:** View and pay fine

---

### Workflow CW2: High-Demand Title Management

**Purpose:** Handle multiple holds on popular items  
**Duration:** 30 minutes  
**Roles:** Admin + Multiple Members

#### Steps:

1. **Admin:** Add popular book with 2 copies
2. **Admin:** Checkout both copies to members
3. **Member A:** Place hold (priority 1)
4. **Member B:** Place hold (priority 2)
5. **Member C:** Place hold (priority 3)
6. **Admin:** Member returns copy 1
7. **Admin:** Checkout to Member A (first in queue)
8. **Member A:** Hold fulfilled
9. **Admin:** Member returns copy 2
10. **Admin:** Checkout to Member B (next in queue)

---

## ⚠️ Error Handling Flows

### Error Flow E1: Validation Failures

**Test various validation errors:**

1. **Invalid Email Format**
   - Endpoint: POST /api/auth/register
   - Data: `email: "not-an-email"`
   - Expected: 400 Bad Request

2. **Missing Required Fields**
   - Endpoint: POST /api/biblio
   - Data: `{ "author": "Test" }` (missing title)
   - Expected: 400 Bad Request

3. **Weak Password**
   - Endpoint: POST /api/auth/register
   - Data: `password: "123"`
   - Expected: 400 Bad Request

---

### Error Flow E2: Authorization Failures

1. **No Token**
   - Any protected endpoint without Authorization header
   - Expected: 401 Unauthorized

2. **Invalid Token**
   - Authorization: Bearer invalid_token
   - Expected: 401 Unauthorized

3. **Insufficient Permissions**
   - Member tries admin endpoint
   - Expected: 403 Forbidden

---

### Error Flow E3: Business Logic Errors

1. **Checkout Already Issued Item**
   - Expected: 400 Bad Request

2. **Exceed Checkout Limit**
   - Member with 5/5 items tries to checkout 6th
   - Expected: 400 Bad Request

3. **Renew Beyond Limit**
   - Item with 3/3 renewals
   - Expected: 403 Forbidden

4. **Return Non-Issued Item**
   - Item with status "available"
   - Expected: 400 Bad Request

---

## ✅ Testing Verification Points

### Authentication Verification
- [ ] Tokens are valid JWT format
- [ ] Tokens contain user ID and role
- [ ] Tokens expire after configured time
- [ ] Passwords never returned in responses
- [ ] Passwords are hashed in database

### Authorization Verification
- [ ] Admins can access all endpoints
- [ ] Members cannot access admin-only endpoints
- [ ] Members can only access own data
- [ ] Proper error messages for insufficient permissions

### Data Integrity Verification
- [ ] Auto-increment IDs work correctly
- [ ] Foreign keys maintained
- [ ] Unique constraints enforced
- [ ] Required fields validated
- [ ] Dates calculated correctly

### Business Logic Verification
- [ ] Due dates calculated from category loan period
- [ ] Fines calculated: days × rate
- [ ] Checkout limits enforced
- [ ] Renewal limits enforced
- [ ] Hold queue priority maintained
- [ ] Item status transitions correctly

### Response Format Verification
- [ ] All responses have `success` field
- [ ] Success responses have `data` field
- [ ] Error responses have `error` field with `message`
- [ ] Pagination includes metadata
- [ ] Timestamps in ISO 8601 format

---

## 📊 Testing Completion Checklist

### Admin Flows (8 flows)
- [ ] A1: Account Setup & Login
- [ ] A2: Library Setup
- [ ] A3: Member Management
- [ ] A4: Checkout Workflow
- [ ] A5: Return with Fine
- [ ] A6: Fine Payment
- [ ] A7: Manage Holds
- [ ] A8: System Configuration

### Member Flows (6 flows)
- [ ] M1: Registration & Login
- [ ] M2: Browse Catalog
- [ ] M3: Place Hold
- [ ] M4: Checkout/Renew/Return
- [ ] M5: View and Pay Fines
- [ ] M6: Update Profile

### Common Workflows (2 workflows)
- [ ] CW1: Complete Circulation Cycle
- [ ] CW2: High-Demand Title Management

### Error Flows (3 flows)
- [ ] E1: Validation Failures
- [ ] E2: Authorization Failures
- [ ] E3: Business Logic Errors

**Total:** 19 comprehensive user flows

---

## 📞 Quick Reference

### Test Accounts
**Admin:**
- Email: admin@library.test
- Password: SecureAdmin@2025
- Card: ADMIN001

**Member 1:**
- Email: john.doe@example.com
- Password: Member@123
- Card: MEM001

**Member 2:**
- Email: sarah.j@example.com
- Password: Sarah@2025
- Card: MEM003

### Key URLs
- API Base: http://localhost:4000/api
- Swagger: http://localhost:4000/docs
- Prisma Studio: http://localhost:5555 (run `npx prisma studio`)

---

**Document Status:** ✅ Complete  
**Last Updated:** October 29, 2025  
**Estimated Testing Time:** 3-4 hours for all flows
