# Data Flow & System Examples

This document provides **step-by-step examples** of how data flows through the library management system for common operations.

---

## 📑 Table of Contents

1. [Data Flow Overview](#data-flow-overview)
2. [Checkout Flow (Complete)](#checkout-flow-complete)
3. [Return Flow (Complete)](#return-flow-complete)
4. [Renewal Flow](#renewal-flow)
5. [Hold/Reserve Flow](#hold-reserve-flow)
6. [Payment Flow](#payment-flow)
7. [Patron Registration Flow](#patron-registration-flow)
8. [Search Flow](#search-flow)
9. [Reporting Examples](#reporting-examples)
10. [Error Scenarios](#error-scenarios)

---

## 🎯 Data Flow Overview

### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                        │
│  (Web Interface, Mobile App, Staff Terminal)                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓ SQL Queries / API Calls
┌──────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Utility Functions (can_patron_checkout, etc.)        │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓ Function Calls                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Tables (biblio, items, borrowers, issues, etc.)      │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓ Data Changes                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Triggers (auto_set_due_date, calculate_fine, etc.)   │  │
│  └────────────────────────────────────────────────────────┘  │
│                         ↓ Additional Logic                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Constraints & Indexes (enforce rules, speed queries)  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📤 Checkout Flow (Complete)

### Scenario
Patron John Smith (borrowernumber=5) wants to checkout "The Great Gatsby" (itemnumber=123).

### Step-by-Step Execution

#### **Step 1: Pre-Checkout Validation**

```sql
-- Application calls validation function
SELECT * FROM can_patron_checkout(5);
```

**What happens inside the function:**
```sql
1. Check if patron exists → ✅ Found
2. Check if debarred → ✅ Not restricted
3. Check if membership expired → ✅ Valid until 2025-01-15
4. Check current checkout count → ✅ 3 items out (limit is 5)
5. Check outstanding fines → ✅ $2.50 owed (under $5.00 limit)
6. Return: (true, 'OK')
```

**Result**: Patron is eligible ✅

#### **Step 2: Check Item Availability**

```sql
SELECT * FROM items WHERE itemnumber = 123;
```

**Result**:
```
itemnumber: 123
barcode: "30001000123"
status: "available"  ✅
notforloan: false  ✅
```

**Item is available** ✅

#### **Step 3: Check for Holds**

```sql
-- Check if item has holds for other patrons
SELECT * FROM reserves 
WHERE itemnumber = 123 
  AND cancellationdate IS NULL
  AND found IS NULL;
```

**Result**: No rows (no holds) ✅

#### **Step 4: Process Checkout**

```sql
-- Application inserts checkout record
INSERT INTO issues (borrowernumber, itemnumber, issuedate)
VALUES (5, 123, CURRENT_TIMESTAMP);
```

#### **Step 5: Triggers Fire (Automatic)**

**5a. `auto_set_due_date` trigger (BEFORE INSERT)**
```sql
-- Calculates due date based on patron category
-- Patron is ADULT (14-day loan period)
NEW.date_due = issuedate + 14 days
             = 2024-10-09 + 14 days
             = 2024-10-23
```

**5b. `enforce_checkout_limit` trigger (BEFORE INSERT)**
```sql
-- Lock patron row (prevent race conditions)
-- Count current checkouts: 3
-- Max allowed: 5
-- 3 < 5 → ✅ PASS
```

**5c. `prevent_checkout_if_reserved` trigger (BEFORE INSERT)**
```sql
-- Check for holds by OTHER patrons: None
-- Check for hold by THIS patron: None
-- ✅ PASS
```

**5d. Record inserted into `issues` table**

**5e. `set_item_onloan` trigger (AFTER INSERT)**
```sql
UPDATE items
SET onloan = '2024-10-23',
    status = 'checked_out',
    issues = issues + 1,  -- Increment counter
    datelastseen = CURRENT_TIMESTAMP
WHERE itemnumber = 123;
```

#### **Step 6: Final Database State**

**issues table:**
```
issue_id: 1
borrowernumber: 5
itemnumber: 123
issuedate: 2024-10-09 10:30:00
date_due: 2024-10-23 10:30:00
returndate: NULL  (still out)
renewals_count: 0
```

**items table:**
```
itemnumber: 123
status: "checked_out"  (changed from "available")
onloan: 2024-10-23
issues: 4  (incremented from 3)
datelastseen: 2024-10-09 10:30:00
```

**borrowers table:**
```
borrowernumber: 5
lastseen: 2024-10-09 10:30:00  (updated by application)
```

### Timeline Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ T=0ms: Application calls can_patron_checkout(5)            │
│        ↓ Function checks all rules                          │
│        ↓ Returns: (true, 'OK')                              │
├─────────────────────────────────────────────────────────────┤
│ T=5ms: Application checks item availability                 │
│        ↓ Query items table                                  │
│        ↓ status='available' ✅                              │
├─────────────────────────────────────────────────────────────┤
│ T=10ms: Application inserts into issues                     │
│         ↓ INSERT INTO issues (...)                          │
├─────────────────────────────────────────────────────────────┤
│ T=11ms: Triggers fire (before INSERT)                       │
│         ↓ auto_set_due_date: Sets due date                  │
│         ↓ enforce_checkout_limit: Checks count              │
│         ↓ prevent_checkout_if_reserved: Checks holds        │
├─────────────────────────────────────────────────────────────┤
│ T=12ms: Record inserted into issues                         │
├─────────────────────────────────────────────────────────────┤
│ T=13ms: Triggers fire (after INSERT)                        │
│         ↓ set_item_onloan: Updates item status              │
├─────────────────────────────────────────────────────────────┤
│ T=15ms: Transaction commits                                 │
│         ✅ Checkout complete!                               │
└─────────────────────────────────────────────────────────────┘
```

### Application Code Example

**JavaScript (Supabase)**:
```javascript
async function checkoutItem(patronId, itemId) {
    // 1. Validate patron
    const { data: eligibility } = await supabase
        .rpc('can_patron_checkout', { patron_id: patronId });
    
    if (!eligibility[0].can_checkout) {
        throw new Error(eligibility[0].reason);
    }
    
    // 2. Check item availability
    const { data: item } = await supabase
        .from('items')
        .select('status, notforloan')
        .eq('itemnumber', itemId)
        .single();
    
    if (item.status !== 'available' || item.notforloan) {
        throw new Error('Item not available');
    }
    
    // 3. Process checkout
    const { data, error } = await supabase
        .from('issues')
        .insert({
            borrowernumber: patronId,
            itemnumber: itemId,
            issuedate: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    
    return {
        success: true,
        dueDate: data.date_due,
        message: `Item due back on ${new Date(data.date_due).toLocaleDateString()}`
    };
}
```

---

## 📥 Return Flow (Complete)

### Scenario
Patron returns "The Great Gatsby" (itemnumber=123) 5 days late.

### Step-by-Step Execution

#### **Step 1: Current State**

**issues table:**
```
issue_id: 1
borrowernumber: 5
itemnumber: 123
issuedate: 2024-10-01 10:00:00
date_due: 2024-10-15 10:00:00
returndate: NULL
renewals_count: 0
```

**Today's date**: 2024-10-20 (5 days late)

#### **Step 2: Process Return**

```sql
-- Staff scans item barcode and processes return
UPDATE issues 
SET returndate = CURRENT_TIMESTAMP 
WHERE itemnumber = 123 AND returndate IS NULL;
```

#### **Step 3: Triggers Fire (Automatic)**

**3a. `calculate_overdue_fine` trigger (AFTER UPDATE)**
```sql
-- Detects: returndate changed from NULL to value
-- Detects: returndate > date_due (late!)

-- Calculate fine:
days_overdue = 2024-10-20 - 2024-10-15 = 5 days
fine_per_day = $0.25 (from systempreferences)
fine_amount = 5 × $0.25 = $1.25

-- Create fine record:
INSERT INTO accountlines (
    borrowernumber, itemnumber, issue_id,
    amount, amountoutstanding,
    description, accounttype, status
) VALUES (
    5, 123, 1,
    1.25, 1.25,
    'Overdue fine - 5 days late', 'OVERDUE', 'open'
);
```

**3b. `move_to_old_issues` trigger (AFTER UPDATE)**
```sql
-- Detects: returndate changed from NULL to value

-- Copy to historical archive:
INSERT INTO old_issues (
    issue_id, borrowernumber, itemnumber,
    issuedate, date_due, returndate, renewals_count, created_at
) VALUES (
    1, 5, 123,
    '2024-10-01 10:00:00', '2024-10-15 10:00:00', 
    '2024-10-20 14:30:00', 0, '2024-10-01 10:00:00'
);

-- Update item status:
UPDATE items
SET datelastborrowed = '2024-10-20',
    status = 'available',
    onloan = NULL,
    datelastseen = CURRENT_TIMESTAMP
WHERE itemnumber = 123;

-- Delete from active issues:
DELETE FROM issues WHERE issue_id = 1;
```

**3c. `notify_reserve_on_return` trigger (AFTER UPDATE on items)**
```sql
-- Detects: item status changed to 'available'

-- Check for waiting holds:
SELECT * FROM reserves
WHERE itemnumber = 123
  AND cancellationdate IS NULL
  AND found IS NULL
ORDER BY priority, reservedate
LIMIT 1;

-- Suppose patron #8 has a hold:
UPDATE reserves
SET found = 'W',
    waitingdate = CURRENT_DATE
WHERE reserve_id = 15;

-- (In production, would send email/SMS to patron #8)
```

#### **Step 4: Final Database State**

**issues table:**
```
(Record deleted - no longer in active issues)
```

**old_issues table:**
```
issue_id: 1
borrowernumber: 5
itemnumber: 123
issuedate: 2024-10-01 10:00:00
date_due: 2024-10-15 10:00:00
returndate: 2024-10-20 14:30:00  ✅
renewals_count: 0
```

**items table:**
```
itemnumber: 123
status: "available"  (changed from "checked_out")
onloan: NULL  (cleared)
datelastborrowed: 2024-10-20
issues: 4  (unchanged)
```

**accountlines table:**
```
accountlines_id: 42
borrowernumber: 5
itemnumber: 123
issue_id: 1
amount: 1.25
amountoutstanding: 1.25
description: "Overdue fine - 5 days late"
accounttype: "OVERDUE"
status: "open"
```

**reserves table** (if hold existed):
```
reserve_id: 15
borrowernumber: 8
itemnumber: 123
found: "W"  (changed from NULL)
waitingdate: 2024-10-20  (set)
```

### Timeline Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ T=0ms: Staff scans returned item                            │
│        ↓ UPDATE issues SET returndate = NOW() WHERE ...     │
├─────────────────────────────────────────────────────────────┤
│ T=1ms: calculate_overdue_fine trigger                       │
│        ↓ Detects: 5 days late                               │
│        ↓ Calculates: $1.25 fine                             │
│        ↓ Inserts fine into accountlines                     │
├─────────────────────────────────────────────────────────────┤
│ T=3ms: move_to_old_issues trigger                           │
│        ↓ Copies record to old_issues                        │
│        ↓ Updates item: status='available', onloan=NULL      │
│        ↓ Deletes from issues                                │
├─────────────────────────────────────────────────────────────┤
│ T=5ms: notify_reserve_on_return trigger                     │
│        ↓ Item status changed to 'available'                 │
│        ↓ Finds next hold in queue (patron #8)               │
│        ↓ Marks hold: found='W', waitingdate=today           │
│        ↓ (Sends notification to patron #8)                  │
├─────────────────────────────────────────────────────────────┤
│ T=7ms: Transaction commits                                  │
│        ✅ Return complete! Item available for next patron   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Renewal Flow

### Scenario
Patron wants to renew "The Great Gatsby" (issue_id=1) for another 14 days.

### Step-by-Step

```sql
-- 1. Check renewal eligibility
SELECT renewals_count FROM issues WHERE issue_id = 1;
-- Result: 1 (renewed once, limit is 3)

-- 2. Check for holds
SELECT COUNT(*) FROM reserves 
WHERE itemnumber = 123 AND cancellationdate IS NULL;
-- Result: 0 (no holds)

-- 3. Process renewal
UPDATE issues
SET lastreneweddate = CURRENT_TIMESTAMP,
    date_due = date_due + INTERVAL '14 days'
WHERE issue_id = 1;

-- 4. Triggers fire:
--    a. check_renewal_limit: 1 < 3 ✅ PASS
--    b. increment_renewal_count: renewals_count = 2
--    c. items.renewals counter incremented

-- 5. Result:
-- New due date: 2024-10-23 + 14 days = 2024-11-06
-- Renewals: 2
```

---

## 📌 Hold/Reserve Flow

### Scenario
Patron #8 wants to place a hold on "The Great Gatsby" (all copies checked out).

### Step-by-Step

```sql
-- 1. Check if patron can place holds
SELECT * FROM can_patron_checkout(8);
-- (Same validation as checkout)

-- 2. Check how many holds already exist
SELECT COUNT(*) + 1 as next_priority
FROM reserves
WHERE biblionumber = 1
  AND cancellationdate IS NULL;
-- Result: priority = 1 (first in line)

-- 3. Place hold
INSERT INTO reserves (borrowernumber, biblionumber, priority)
VALUES (8, 1, 1);

-- 4. When item is returned (from earlier example):
--    notify_reserve_on_return trigger fires
--    Patron #8 notified: found='W', waitingdate=today

-- 5. Patron has 7 days to pick up
-- 6. If not picked up by day 8:
SELECT expire_old_holds();
--    Hold cancelled: cancellationdate=today
```

---

## 💳 Payment Flow

### Scenario
Patron pays $1.25 overdue fine.

### Step-by-Step

```sql
-- 1. Get patron's outstanding balance
SELECT SUM(amountoutstanding) FROM accountlines
WHERE borrowernumber = 5 AND amountoutstanding > 0;
-- Result: $1.25

-- 2. Record payment
INSERT INTO accountlines (
    borrowernumber,
    amount,
    amountoutstanding,
    description,
    accounttype,
    payment_type,
    status
) VALUES (
    5,
    -1.25,  -- Negative = credit
    0.00,
    'Payment received',
    'PAYMENT',
    'CASH',
    'paid'
);

-- 3. Mark original fine as paid
UPDATE accountlines
SET amountoutstanding = 0,
    status = 'paid'
WHERE borrowernumber = 5
  AND accounttype = 'OVERDUE'
  AND status = 'open';

-- 4. New balance:
SELECT SUM(amountoutstanding) FROM accountlines
WHERE borrowernumber = 5;
-- Result: $0.00
```

---

## 👤 Patron Registration Flow

### Scenario
New patron "Jane Doe" signs up.

### Step-by-Step

```sql
-- 1. Generate card number
SELECT 'LIB' || LPAD(nextval('cardnumber_seq')::TEXT, 6, '0');
-- Result: 'LIB000042'

-- 2. Hash password
SELECT crypt('user_password', gen_salt('bf'));
-- Result: '$2a$06$...'

-- 3. Insert patron
INSERT INTO borrowers (
    cardnumber,
    full_name,
    email,
    categorycode,
    dateenrolled,
    dateexpiry,
    password
) VALUES (
    'LIB000042',
    'Jane Doe',
    'jane@email.com',
    'ADULT',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    crypt('user_password', gen_salt('bf'))
);

-- 4. Link to Supabase auth (if using Supabase)
UPDATE borrowers
SET auth_user_id = 'uuid-from-supabase'
WHERE cardnumber = 'LIB000042';
```

---

## 🔍 Search Flow

### Scenario
Patron searches for "gastby" (typo).

### Fuzzy Search

```sql
-- Full-text search (exact match fails)
SELECT * FROM biblio
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'gastby');
-- Result: 0 rows

-- Fuzzy search (finds despite typo)
SELECT 
    title,
    author,
    similarity(title, 'gastby') as score
FROM biblio
WHERE title % 'gastby'
ORDER BY score DESC
LIMIT 5;

-- Results:
-- "The Great Gatsby" - 0.75
-- "Gatsby's Gold" - 0.68
```

---

## 📊 Reporting Examples

### Daily Circulation Report

```sql
SELECT 
    COUNT(*) as total_checkouts,
    COUNT(DISTINCT borrowernumber) as unique_patrons,
    COUNT(DISTINCT i.biblionumber) as unique_titles
FROM issues iss
JOIN items i ON iss.itemnumber = i.itemnumber
WHERE issuedate >= CURRENT_DATE;
```

### Overdue Report

```sql
SELECT * FROM overdue_items
ORDER BY days_overdue DESC;
```

### Popular Books

```sql
SELECT * FROM popular_items
WHERE last_checkout_date > CURRENT_DATE - INTERVAL '30 days'
LIMIT 10;
```

---

## ⚠️ Error Scenarios

### Checkout Errors

**Error 1: Patron at Limit**
```sql
INSERT INTO issues (borrowernumber, itemnumber)
VALUES (5, 200);

-- ERROR: Patron has reached maximum checkout limit of 5
-- (enforce_checkout_limit trigger)
```

**Error 2: Item on Hold**
```sql
INSERT INTO issues (borrowernumber, itemnumber)
VALUES (5, 150);

-- ERROR: Item is on hold for another patron (Jane Smith). Cannot checkout.
-- (prevent_checkout_if_reserved trigger)
```

**Error 3: Excessive Fines**
```sql
-- Patron owes $12.00 (limit is $5.00)
SELECT * FROM can_patron_checkout(5);
-- Returns: (false, 'Outstanding fines ($12.00) exceed limit')
```

### Renewal Errors

**Error: Max Renewals Reached**
```sql
UPDATE issues
SET lastreneweddate = NOW(),
    date_due = date_due + INTERVAL '14 days'
WHERE issue_id = 1;

-- ERROR: Maximum renewal limit (3) reached for this item
-- (check_renewal_limit trigger)
```

---

## 📝 Summary

### Key Data Flows

1. **Checkout**: Validation → Insert → Triggers → Item marked unavailable
2. **Return**: Update → Fine calculation → Archive → Next hold notified
3. **Renewal**: Check limit → Update due date → Increment counter
4. **Hold**: Insert → Priority assigned → Notified when available
5. **Payment**: Record payment → Clear balance → Update status

### Automatic Operations

✅ Due date calculation  
✅ Fine generation  
✅ Checkout archival  
✅ Hold notifications  
✅ Limit enforcement  
✅ Statistics tracking

### Manual Operations

🖐️ Patron registration  
🖐️ Payment processing  
🖐️ Item cataloging  
🖐️ Report generation

This comprehensive data flow documentation shows exactly **how data moves** through the system and **what happens automatically** via triggers versus **what requires manual intervention**.
