# Level 4: Business Logic & Features Explained

## 🎯 Understanding Library Business Logic

Your system implements real-world library operations with complex business rules. Let's explore each feature in detail!

---

## 📚 Core Features Overview

Your Library Management System implements:

1. **Catalog Management** - Add, edit, search books
2. **Circulation** - Check out, return, renew items
3. **Holds/Reserves** - Place and manage holds
4. **Fines & Fees** - Calculate and track late fees
5. **Member Management** - Register, manage patrons
6. **System Configuration** - Adjustable settings

---

## 🔄 Feature 1: Circulation (Check Out, Return, Renew)

### Check Out Process

**What happens when someone checks out a book:**

```
┌─────────────────────────────────────────────────────┐
│           CHECKOUT VALIDATION CHAIN                  │
└─────────────────────────────────────────────────────┘

1. ✓ Does borrower exist?
2. ✓ Is borrower suspended (debarred)?
3. ✓ Has membership expired?
4. ✓ Does item exist?
5. ✓ Is item available for loan?
6. ✓ Is item available status?
7. ✓ Is item reserved for someone else?
8. ✓ Has borrower reached checkout limit?

ALL CHECKS PASS → CREATE CHECKOUT
ANY CHECK FAILS → THROW ERROR
```

### Detailed Checkout Logic

```javascript
// services/circulationService.js - checkoutItem()

export const checkoutItem = async ({ borrowernumber, itemnumber, barcode }, actor) => {
  // PERMISSION CHECK
  // Members can only checkout for themselves, Admins can checkout for anyone
  if (actor && actor.role !== 'ADMIN' && actor.id !== borrowernumber) {
    throw new ApiError(403, 'Members can only checkout items for themselves');
  }

  return prisma.$transaction(async (tx) => {
    // STEP 1: Verify borrower exists and get category
    const borrower = await tx.borrower.findUnique({
      where: { borrowernumber },
      include: { category: true }
    });
    if (!borrower) {
      throw new ApiError(404, 'Borrower not found');
    }

    // STEP 2: Check if borrower is suspended (debarred)
    if (borrower.debarred && borrower.debarred >= new Date()) {
      throw new ApiError(403, `Borrower is debarred until ${borrower.debarred}`);
    }

    // STEP 3: Check if membership is expired
    if (borrower.dateexpiry && borrower.dateexpiry < new Date()) {
      throw new ApiError(403, 'Membership expired');
    }

    // STEP 4: Find item by itemnumber OR barcode
    const item = await getItemByIdentifier(tx, { itemnumber, barcode });
    if (!item) {
      throw new ApiError(404, 'Item not found');
    }

    // STEP 5: Check if item can be loaned
    if (item.notforloan) {
      throw new ApiError(403, 'Item is marked as not for loan');
    }

    // STEP 6: Check item availability
    if (item.status !== 'available') {
      throw new ApiError(409, `Item is currently ${item.status}`);
    }

    // STEP 7: Check if item is reserved for someone else
    const conflictingReserve = await tx.reserve.findFirst({
      where: {
        itemnumber: item.itemnumber,
        borrowernumber: { not: borrowernumber },  // Not for this borrower
        cancellationdate: null,                    // Active reserve
        found: null                                // Not yet fulfilled
      }
    });
    if (conflictingReserve) {
      throw new ApiError(403, 'Item is reserved for another patron');
    }

    // STEP 8: Check checkout limit
    const currentCheckouts = await tx.issue.count({ 
      where: { borrowernumber, returndate: null } 
    });
    const maxCheckouts = borrower.category.max_checkout_count || 5;
    if (currentCheckouts >= maxCheckouts) {
      throw new ApiError(403, 'Borrower reached maximum checkout limit');
    }

    // STEP 9: Calculate due date
    const loanPeriod = borrower.category.loan_period_days || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanPeriod);

    // STEP 10: Create or update issue record
    const issue = await tx.issue.create({
      data: {
        borrowernumber,
        itemnumber: item.itemnumber,
        date_due: dueDate
      },
      include: {
        borrower: { select: { borrowernumber: true, full_name: true, email: true } },
        item: { select: { itemnumber: true, barcode: true, biblionumber: true } }
      }
    });

    // STEP 11: Update item status
    await tx.item.update({
      where: { itemnumber: item.itemnumber },
      data: {
        status: 'checked_out',
        onloan: dueDate,
        issues: { increment: 1 },  // Track popularity
        updated_at: new Date()
      }
    });

    // STEP 12: Mark any reserves for this borrower as picked up
    await tx.reserve.updateMany({
      where: {
        itemnumber: item.itemnumber,
        borrowernumber,
        cancellationdate: null,
        found: null
      },
      data: {
        found: 'P',           // P = Picked up
        waitingdate: new Date()
      }
    });

    return issue;
  });
};
```

### Real-World Example: Checkout

**Scenario:** John wants to checkout "The Great Gatsby"

**Request:**
```http
POST /api/circulation/checkout
Content-Type: application/json
Authorization: Bearer <token>

{
  "borrowernumber": 1,
  "barcode": "BOOK001"
}
```

**Processing:**
1. Verify John exists ✓
2. Check not suspended ✓
3. Check membership valid ✓
4. Find item with barcode BOOK001 ✓
5. Check item.notforloan = false ✓
6. Check item.status = 'available' ✓
7. Check no conflicting reserves ✓
8. Count John's checkouts: 3 out of 10 allowed ✓
9. Calculate due date: Today + 21 days = Nov 24
10. Create issue record
11. Update item: status = 'checked_out'
12. Mark John's reserve (if any) as picked up

**Response:**
```json
{
  "success": true,
  "message": "Item checked out successfully",
  "data": {
    "issue_id": 42,
    "borrowernumber": 1,
    "itemnumber": 101,
    "issuedate": "2024-11-03T10:00:00Z",
    "date_due": "2024-11-24T23:59:59Z",
    "borrower": {
      "borrowernumber": 1,
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "item": {
      "itemnumber": 101,
      "barcode": "BOOK001",
      "biblionumber": 1
    }
  }
}
```

---

### Return Process

**What happens when someone returns a book:**

```
┌─────────────────────────────────────────────────────┐
│              RETURN PROCESS STEPS                    │
└─────────────────────────────────────────────────────┘

1. Find active checkout record
2. Update issue.returndate
3. Update item.status = 'available'
4. Calculate if overdue
5. If overdue → Create fine in AccountLines
6. Check for holds → Alert next person in queue
```

### Detailed Return Logic

```javascript
export const returnItem = async ({ issueId, itemnumber, barcode }, actor) => {
  return prisma.$transaction(async (tx) => {
    // STEP 1: Find active checkout
    const issue = await tx.issue.findFirst({
      where: {
        AND: [
          issueId ? { issue_id: issueId } : undefined,
          itemnumber ? { itemnumber } : undefined,
          barcode ? { item: { barcode } } : undefined,
          { returndate: null }  // Must be active (not returned)
        ].filter(Boolean)
      },
      include: {
        item: true,
        borrower: { include: { category: true } }
      }
    });

    if (!issue) {
      throw new ApiError(404, 'Active issue not found');
    }

    // STEP 2: Permission check
    if (actor && actor.role !== 'ADMIN' && issue.borrowernumber !== actor.id) {
      throw new ApiError(403, 'Members can only return their own items');
    }

    const now = new Date();

    // STEP 3: Mark as returned
    await tx.issue.update({
      where: { issue_id: issue.issue_id },
      data: { returndate: now }
    });

    // STEP 4: Update item status
    await tx.item.update({
      where: { itemnumber: issue.itemnumber },
      data: {
        status: 'available',
        onloan: null,
        datelastborrowed: now,
        datelastseen: now,
        updated_at: now
      }
    });

    // STEP 5: Calculate overdue fine
    const overdueMs = now - issue.date_due;
    if (overdueMs > 0) {
      const daysOverdue = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        // Get fine rate from system preferences
        const finePerDay = await getSystemPreference(tx, 'fine_per_day', '0.25');
        const fineAmount = Number((daysOverdue * Number(finePerDay)).toFixed(2));

        if (fineAmount > 0) {
          // Create fine record
          await tx.accountLine.create({
            data: {
              borrowernumber: issue.borrowernumber,
              itemnumber: issue.itemnumber,
              issue_id: issue.issue_id,
              amount: fineAmount,
              amountoutstanding: fineAmount,
              description: `Overdue fine - ${daysOverdue} days late`,
              accounttype: 'OVERDUE',
              status: 'open'
            }
          });
        }
      }
    }

    // STEP 6: Check for holds and alert next person
    const nextReserve = await tx.reserve.findFirst({
      where: {
        biblionumber: issue.item.biblionumber,
        cancellationdate: null,
        found: null
      },
      orderBy: [
        { priority: 'asc' },      // Lowest priority first (1, 2, 3...)
        { reservedate: 'asc' }    // Earliest date first
      ]
    });

    if (nextReserve) {
      // Mark hold as ready for pickup
      await tx.reserve.update({
        where: { reserve_id: nextReserve.reserve_id },
        data: {
          found: 'W',              // W = Waiting for pickup
          waitingdate: new Date()
        }
      });
      
      // In production, you'd send an email/SMS notification here
    }

    return updatedIssue;
  });
};
```

### Real-World Example: Return

**Scenario:** John returns "The Great Gatsby" 5 days late

**Request:**
```http
POST /api/circulation/return
Content-Type: application/json
Authorization: Bearer <token>

{
  "barcode": "BOOK001"
}
```

**Processing:**
1. Find issue where barcode=BOOK001 and returndate=null ✓
2. Issue found: issued on Nov 1, due Nov 15
3. Today is Nov 20 (5 days late)
4. Mark issue as returned
5. Update item status to 'available'
6. Calculate fine: 5 days × $0.25 = $1.25
7. Create AccountLine record for $1.25
8. Check reserves: Jane has a hold!
9. Update Jane's reserve: found='W', waitingdate=now
10. (Would send Jane an email: "Your hold is ready!")

**Response:**
```json
{
  "success": true,
  "message": "Item returned successfully. Fine assessed: $1.25",
  "data": {
    "issue_id": 42,
    "returndate": "2024-11-20T14:30:00Z",
    "fine_assessed": 1.25,
    "days_overdue": 5
  }
}
```

---

### Renew Process

**What happens when someone renews a book:**

```
┌─────────────────────────────────────────────────────┐
│              RENEWAL VALIDATION CHAIN                │
└─────────────────────────────────────────────────────┘

1. ✓ Does checkout exist?
2. ✓ Is item already returned?
3. ✓ Has max renewals been reached?
4. ✓ Is item reserved for someone else?

ALL CHECKS PASS → EXTEND DUE DATE
ANY CHECK FAILS → THROW ERROR
```

### Detailed Renewal Logic

```javascript
export const renewItem = async ({ issueId }, actor) => {
  return prisma.$transaction(async (tx) => {
    // STEP 1: Find checkout
    const issue = await tx.issue.findUnique({
      where: { issue_id: issueId },
      include: {
        borrower: { include: { category: true } },
        item: true
      }
    });

    if (!issue) {
      throw new ApiError(404, 'Issue not found');
    }

    // STEP 2: Permission check
    if (actor && actor.role !== 'ADMIN' && issue.borrowernumber !== actor.id) {
      throw new ApiError(403, 'Members can only renew their own items');
    }

    // STEP 3: Check if already returned
    if (issue.returndate) {
      throw new ApiError(400, 'Cannot renew a returned item');
    }

    // STEP 4: Check renewal limit
    const maxRenewals = await getSystemPreference(tx, 'max_renewals', '3');
    if (issue.renewals_count >= Number(maxRenewals)) {
      throw new ApiError(403, `Maximum renewal limit (${maxRenewals}) reached`);
    }

    // STEP 5: Check for conflicting reserves
    const conflictingReserve = await tx.reserve.findFirst({
      where: {
        itemnumber: issue.itemnumber,
        borrowernumber: { not: issue.borrowernumber },
        cancellationdate: null,
        found: null
      }
    });
    if (conflictingReserve) {
      throw new ApiError(403, 'Item is reserved for another patron');
    }

    // STEP 6: Calculate new due date
    const loanPeriod = issue.borrower.category.loan_period_days || 14;
    const newDue = new Date(issue.date_due);
    newDue.setDate(newDue.getDate() + loanPeriod);

    // STEP 7: Update issue
    const renewedIssue = await tx.issue.update({
      where: { issue_id: issue.issue_id },
      data: {
        date_due: newDue,
        lastreneweddate: new Date(),
        renewals_count: { increment: 1 }
      }
    });

    // STEP 8: Update item
    await tx.item.update({
      where: { itemnumber: issue.itemnumber },
      data: {
        renewals: { increment: 1 },
        onloan: newDue,
        updated_at: new Date()
      }
    });

    return renewedIssue;
  });
};
```

### Real-World Example: Renewal

**Scenario:** John wants to renew "The Great Gatsby"

**Request:**
```http
POST /api/circulation/renew
Content-Type: application/json
Authorization: Bearer <token>

{
  "issueId": 42
}
```

**Processing:**
1. Find issue #42 ✓
2. Check John is the borrower ✓
3. Check not already returned ✓
4. Check renewals_count: 1 out of 3 allowed ✓
5. Check no holds: None ✓
6. Current due date: Nov 15
7. New due date: Nov 15 + 21 days = Dec 6
8. Update issue: renewals_count=2, date_due=Dec 6
9. Update item: renewals++

**Response:**
```json
{
  "success": true,
  "message": "Item renewed successfully",
  "data": {
    "issue_id": 42,
    "date_due": "2024-12-06T23:59:59Z",
    "renewals_count": 2,
    "renewals_remaining": 1
  }
}
```

---

## 🔖 Feature 2: Holds/Reserves

### Place Hold Process

**What happens when someone places a hold:**

```
┌─────────────────────────────────────────────────────┐
│              HOLD PLACEMENT LOGIC                    │
└─────────────────────────────────────────────────────┘

1. Check if biblio (title) exists
2. Check if already on hold by this member
3. Calculate priority (position in queue)
4. Create reserve record
5. Update item.reserves_count
```

### Hold Lifecycle

```
┌────────────┐      ┌─────────────┐      ┌───────────┐      ┌──────────┐
│   PLACED   │─────▶│   WAITING   │─────▶│  READY    │─────▶│ PICKED UP│
│ (created)  │      │ (all copies │      │(available)│      │(converted│
│            │      │  checked    │      │ found='W' │      │to checkout)
│            │      │   out)      │      │           │      │           │
└────────────┘      └─────────────┘      └───────────┘      └──────────┘
       │                                       │                   │
       │                                       ▼                   ▼
       │                                 ┌──────────┐        ┌──────────┐
       └────────────────────────────────▶│ CANCELLED│        │ EXPIRED  │
                                         │          │        │(not picked│
                                         └──────────┘        │   up)    │
                                                             └──────────┘
```

### Hold Status Codes

```javascript
found: null    // Not yet available (waiting)
found: 'W'     // Waiting for pickup at desk
found: 'T'     // In transit between branches
found: 'P'     // Picked up (fulfilled)
```

### Priority Queue System

```javascript
// When placing a hold
const existingHolds = await prisma.reserve.count({
  where: {
    biblionumber,
    cancellationdate: null
  }
});

const priority = existingHolds + 1;  // You're number X in line
```

**Example:**
- Book: "Harry Potter"
- Existing holds: 3 (priority 1, 2, 3)
- Your hold: priority = 4 (you're 4th in line)
- When person #1 picks up, everyone moves up

---

## 💰 Feature 3: Fines & Fees

### Fine Calculation

```javascript
// When item is returned late
const now = new Date();
const dueDate = issue.date_due;
const overdueMs = now - dueDate;

if (overdueMs > 0) {
  // Convert milliseconds to days
  const daysOverdue = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
  
  // Get fine rate from system preferences
  const finePerDay = await getSystemPreference(tx, 'fine_per_day', '0.25');
  
  // Calculate total fine
  const fineAmount = daysOverdue * Number(finePerDay);
  
  // Create account line
  await tx.accountLine.create({
    data: {
      borrowernumber: issue.borrowernumber,
      itemnumber: issue.itemnumber,
      issue_id: issue.issue_id,
      amount: fineAmount,
      amountoutstanding: fineAmount,
      description: `Overdue fine - ${daysOverdue} days late`,
      accounttype: 'OVERDUE',
      status: 'open'
    }
  });
}
```

### Fine Examples

| Scenario | Fine Per Day | Days Late | Total Fine |
|----------|--------------|-----------|------------|
| Book due Nov 1, returned Nov 3 | $0.25 | 2 | $0.50 |
| Book due Nov 1, returned Nov 10 | $0.25 | 9 | $2.25 |
| DVD due Nov 1, returned Nov 5 | $1.00 | 4 | $4.00 |
| Book due Nov 1, returned Dec 1 | $0.25 | 30 | $7.50 |

### Payment Process

```javascript
// accountService.js - recordPayment()
export const recordPayment = async ({ borrowernumber, amount, paymentType, note }, managerId) => {
  return prisma.$transaction(async (tx) => {
    // Get all unpaid fines for this borrower
    const unpaidFines = await tx.accountLine.findMany({
      where: {
        borrowernumber,
        amountoutstanding: { gt: 0 }
      },
      orderBy: { date: 'asc' }  // Pay oldest first
    });

    let remainingPayment = Number(amount);

    // Apply payment to each fine until exhausted
    for (const fine of unpaidFines) {
      if (remainingPayment <= 0) break;

      const toPay = Math.min(remainingPayment, Number(fine.amountoutstanding));
      const newOutstanding = Number(fine.amountoutstanding) - toPay;

      await tx.accountLine.update({
        where: { accountlines_id: fine.accountlines_id },
        data: {
          amountoutstanding: newOutstanding,
          status: newOutstanding === 0 ? 'PAID' : 'PARTIAL'
        }
      });

      remainingPayment -= toPay;
    }

    // Record the payment transaction
    await tx.accountLine.create({
      data: {
        borrowernumber,
        amount: -Number(amount),  // Negative = payment/credit
        amountoutstanding: 0,
        description: note || `Payment received via ${paymentType}`,
        accounttype: 'PAYMENT',
        payment_type: paymentType,
        status: 'PAID',
        manager_id: managerId
      }
    });

    return { success: true };
  });
};
```

### Payment Example

**Scenario:** John has 3 overdue fines, pays $5

**Existing Fines:**
```javascript
Fine #1: $2.50 outstanding (oldest)
Fine #2: $3.00 outstanding
Fine #3: $1.50 outstanding
Total owed: $7.00
```

**Payment: $5.00**

**Processing:**
1. Apply $2.50 to Fine #1 → Fully paid, $2.50 remaining
2. Apply $2.50 to Fine #2 → Partial, $0.50 outstanding, $0 remaining
3. Fine #3 remains unpaid ($1.50)

**Result:**
```javascript
Fine #1: $0.00 outstanding ✓ PAID
Fine #2: $0.50 outstanding (PARTIAL)
Fine #3: $1.50 outstanding (UNPAID)
Total owed: $2.00
```

---

## 👤 Feature 4: Member Management

### Member Categories

```javascript
// Seeded in prisma/seed.js
const categories = [
  {
    categorycode: 'ADULT',
    description: 'Adult Patron',
    max_checkout_count: 10,
    loan_period_days: 21
  },
  {
    categorycode: 'CHILD',
    description: 'Child Patron (under 13)',
    max_checkout_count: 5,
    loan_period_days: 14
  },
  {
    categorycode: 'STAFF',
    description: 'Library Staff',
    max_checkout_count: 20,
    loan_period_days: 30
  }
];
```

### Member Status

```javascript
// Active member
{
  dateexpiry: "2025-12-31",  // Membership valid
  debarred: null              // Not suspended
}

// Expired membership
{
  dateexpiry: "2023-12-31",  // Past date
  debarred: null
}
// → Cannot checkout items

// Suspended member
{
  dateexpiry: "2025-12-31",
  debarred: "2024-12-15"      // Suspended until this date
}
// → Cannot checkout items

// Suspended with reason
{
  debarred: "2024-12-15",
  debarred_comment: "Too many overdue items"
}
```

### Debar (Suspend) Member

```javascript
// borrowerService.js
export const updateBorrower = async (id, payload, actorRole) => {
  // Only admins can modify certain fields
  if (actorRole !== 'ADMIN') {
    delete payload.role;
    delete payload.debarred;
    delete payload.debarred_comment;
    delete payload.staff_notes;
  }

  // Prevent self-demotion
  if (actorRole !== 'ADMIN' && payload.role) {
    throw new ApiError(403, 'Only admins can change roles');
  }

  return prisma.borrower.update({
    where: { borrowernumber: id },
    data: {
      ...payload,
      updated_at: new Date()
    }
  });
};
```

---

## ⚙️ Feature 5: System Preferences

### Configurable Settings

```javascript
// Seeded in prisma/seed.js
const systemPreferences = [
  {
    variable: 'fine_per_day',
    value: '0.25',
    type: 'decimal',
    explanation: 'Daily overdue fine amount in dollars'
  },
  {
    variable: 'max_renewals',
    value: '3',
    type: 'integer',
    explanation: 'Maximum times an item can be renewed'
  },
  {
    variable: 'hold_expiry_days',
    value: '7',
    type: 'integer',
    explanation: 'Days to pick up held item before it expires'
  },
  {
    variable: 'version',
    value: '1.0.0',
    type: 'string',
    explanation: 'Library system version'
  }
];
```

### Using System Preferences

```javascript
// In any service
const getSystemPreference = async (tx, variable, fallback) => {
  const pref = await tx.systemPreference.findUnique({ 
    where: { variable } 
  });
  
  if (!pref || pref.value === null) {
    return fallback;  // Use default if not set
  }
  
  return pref.value;
};

// Example usage
const fineRate = await getSystemPreference(tx, 'fine_per_day', '0.25');
const maxRenewals = await getSystemPreference(tx, 'max_renewals', '3');
```

---

## 🔍 Feature 6: Search & Filtering

### Catalog Search

```javascript
// Search by title, author, or ISBN
const where = {
  OR: [
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { author: { contains: searchTerm, mode: 'insensitive' } },
    { isbn: { contains: searchTerm, mode: 'insensitive' } }
  ]
};

const biblios = await prisma.biblio.findMany({ where });
```

**Examples:**
- Search "gatsby" → Finds "The Great Gatsby"
- Search "fitzgerald" → Finds books by F. Scott Fitzgerald
- Search "9780743273565" → Finds book with that ISBN

### Filter by Item Type

```javascript
// GET /api/biblio?itemtype=BOOK
const where = { itemtype: 'BOOK' };
```

### Date Range Filters

```javascript
// Circulation history by date range
// GET /api/circulation/history?issuedFrom=2024-01-01&issuedTo=2024-12-31

const where = {
  issuedate: {
    gte: new Date(issuedFrom),
    lte: new Date(issuedTo)
  }
};
```

### Pagination

```javascript
// GET /api/biblio?page=2&limit=20

const { skip, take } = buildPagination({ page: 2, limit: 20 });
// skip = 20, take = 20 (items 21-40)

const biblios = await prisma.biblio.findMany({
  skip,
  take,
  orderBy: { created_at: 'desc' }
});
```

---

## 🎯 Business Rules Summary

### Checkout Rules
- ✓ Member must not be debarred (suspended)
- ✓ Membership must not be expired
- ✓ Item must be available for loan
- ✓ Item must have status 'available'
- ✓ Item must not be reserved for someone else
- ✓ Member must not have reached checkout limit

### Renewal Rules
- ✓ Item must be currently checked out
- ✓ Must not exceed max renewal limit (default 3)
- ✓ Item must not be reserved for someone else
- ✓ Only the borrower (or admin) can renew

### Hold Rules
- ✓ Can place hold on any biblio (title)
- ✓ Cannot place duplicate hold
- ✓ Assigned priority based on queue position
- ✓ Notified when item becomes available
- ✓ Hold expires if not picked up within X days

### Fine Rules
- ✓ Calculated on return if overdue
- ✓ Rate: days_late × fine_per_day
- ✓ Payments applied to oldest fines first
- ✓ Only admins can waive fines
- ✓ Member can view own fines, admin can view all

### Permission Rules
- ✓ MEMBER: Can checkout, return, renew own items
- ✓ MEMBER: Can view own history and fines
- ✓ MEMBER: Can place holds
- ✓ ADMIN: Can do everything members can
- ✓ ADMIN: Can checkout/return for anyone
- ✓ ADMIN: Can add/edit/delete catalog items
- ✓ ADMIN: Can manage members
- ✓ ADMIN: Can process payments
- ✓ ADMIN: Can view all data

---

## ❓ Q&A: Business Logic Questions

### Q1: What happens if two people try to checkout the same book simultaneously?
**A:** Prisma transactions with database locks prevent this. Only one will succeed, the other will get "Item is currently checked_out" error.

### Q2: Can someone place a hold on a book that's currently available?
**A:** Yes! This ensures they get it when it's returned. Some libraries allow this for popular books.

### Q3: What if someone never picks up their hold?
**A:** Hold expires after `hold_expiry_days` (default 7). The system should have a cron job to:
```javascript
// Expire old holds
await prisma.reserve.updateMany({
  where: {
    found: 'W',  // Waiting for pickup
    waitingdate: { lt: sevenDaysAgo },
    cancellationdate: null
  },
  data: {
    cancellationdate: new Date(),
    notes: 'Hold expired - not picked up'
  }
});
```

### Q4: Can fines be waived?
**A:** Not in current code, but would add:
```javascript
// Admin only
export const waiveFine = async (accountLineId, managerId) => {
  await prisma.accountLine.update({
    where: { accountlines_id: accountLineId },
    data: {
      amountoutstanding: 0,
      status: 'WAIVED',
      manager_id: managerId,
      note: 'Fine waived by admin'
    }
  });
};
```

### Q5: What prevents a member from checking out the same book twice?
**A:** The `itemnumber` field in Issues table has a `@unique` constraint. Prisma will throw P2002 error if you try.

### Q6: How do you track which staff member processed a payment?
**A:** The `manager_id` field in AccountLines links to the admin who recorded it.

### Q7: Can someone renew an overdue item?
**A:** Yes! There's no check for overdue status. Some libraries allow this to encourage returns.

### Q8: What if a book is lost?
**A:** Would add:
```javascript
// Mark item as lost
await prisma.item.update({
  where: { itemnumber },
  data: { status: 'lost' }
});

// Charge replacement cost
await prisma.accountLine.create({
  data: {
    borrowernumber,
    itemnumber,
    amount: item.replacementprice,
    amountoutstanding: item.replacementprice,
    accounttype: 'LOST',
    description: 'Item lost - replacement charge'
  }
});
```

### Q9: How do you handle partial payments?
**A:** The code applies payment to oldest fines first until exhausted. Each fine's status becomes 'PARTIAL' if not fully paid.

### Q10: Can you place a hold on a specific copy?
**A:** Yes! Reserves table has both `biblionumber` (any copy) and `itemnumber` (specific copy). If `itemnumber` is null, any copy is fine.

---

## 🎓 Key Takeaways

1. **Transactions ensure data consistency** - All or nothing
2. **Business rules are enforced in service layer** - Not in database
3. **Fine calculation is automatic** - On item return
4. **Hold queue is managed by priority** - Fair system
5. **Permissions are granular** - Members vs Admins
6. **System preferences make it flexible** - No hardcoded values
7. **Validation happens at multiple levels** - Input + Business logic
8. **Audit trail via timestamps and manager_id** - Track who did what
9. **Status fields drive workflow** - available, checked_out, etc.
10. **Your system implements real library practices!** - Not just CRUD

---

**Next: Level 5 - Testing Strategy** (How to ensure quality)
