# 🧪 Business Logic Testing Guide - Library Management System

**Version:** 1.0  
**Date:** October 29, 2025  
**Purpose:** Test Complex Business Rules and Edge Cases

---

## 📚 Table of Contents

1. [Circulation Business Logic](#circulation-business-logic)
2. [Fine Calculation Rules](#fine-calculation-rules)
3. [Hold/Reserve Management](#hold-reserve-management)
4. [Checkout Limit Enforcement](#checkout-limit-enforcement)
5. [Renewal Rules](#renewal-rules)
6. [Edge Cases & Boundary Testing](#edge-cases--boundary-testing)
7. [Validation Rules Testing](#validation-rules-testing)

---

## 🎯 Overview

This guide focuses on **complex business logic** that requires careful testing. These are rules that involve multiple conditions, calculations, and state changes.

---

## 📦 Circulation Business Logic

### Rule CL1: Due Date Calculation

**Business Rule:**  
Due date = Checkout date + Category's loan_period_days

**Categories:**
- ADULT: 14 days
- CHILD: 7 days
- STAFF: 30 days

#### Test Scenario CL1.1: Adult Member Checkout

**Setup:**
```
Category: ADULT
Loan Period: 14 days
Checkout Date: 2025-10-29 10:00:00
```

**Action:** Checkout item

**Expected Due Date:** 2025-11-12 23:59:59

**API Test:**
```http
POST /api/circulation/checkout
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "borrowernumber": 2,  // ADULT category
  "itemnumber": 1
}
```

**Verify Response:**
```json
{
  "data": {
    "issuedate": "2025-10-29T10:00:00Z",
    "date_due": "2025-11-12T23:59:59Z"
  }
}
```

**Verification:**
- [ ] Due date is exactly 14 days from checkout
- [ ] Time is set to 23:59:59 (end of day)
- [ ] Date is in correct timezone

---

#### Test Scenario CL1.2: Child Member Checkout

**Setup:**
```
Category: CHILD
Loan Period: 7 days
Checkout Date: 2025-10-29 14:30:00
```

**Expected Due Date:** 2025-11-05 23:59:59

**Verification:**
- [ ] Due date is 7 days (not 14)
- [ ] Calculation ignores checkout time, uses end of day

---

#### Test Scenario CL1.3: Staff Member Checkout

**Setup:**
```
Category: STAFF
Loan Period: 30 days
Checkout Date: 2025-10-29
```

**Expected Due Date:** 2025-11-28 23:59:59

**Verification:**
- [ ] Due date is 30 days
- [ ] Handles month boundary correctly

---

### Rule CL2: Item Status Transitions

**Valid Status Flow:**
```
available → issued → available
available → damaged → withdrawn
available → lost → withdrawn
```

#### Test Scenario CL2.1: Checkout Status Change

**Initial State:**
```json
{
  "status": "available",
  "onloan": null,
  "issues": 0
}
```

**Action:** Checkout item

**Expected State:**
```json
{
  "status": "issued",
  "onloan": "2025-11-12T23:59:59Z",
  "issues": 1
}
```

**Verification:**
- [ ] Status changed from "available" to "issued"
- [ ] Onloan set to due date
- [ ] Issues counter incremented
- [ ] Status_date updated

---

#### Test Scenario CL2.2: Return Status Change

**Initial State:**
```json
{
  "status": "issued",
  "onloan": "2025-11-12T23:59:59Z"
}
```

**Action:** Return item

**Expected State:**
```json
{
  "status": "available",
  "onloan": null,
  "datelastborrowed": "2025-10-29T14:30:00Z"
}
```

**Verification:**
- [ ] Status back to "available"
- [ ] Onloan cleared
- [ ] Datelastborrowed set

---

#### Test Scenario CL2.3: Invalid Status Transition

**Initial State:**
```
Status: "available"
```

**Action:** Try to return (item not checked out)

**Expected:** 400 Bad Request
```json
{
  "error": {
    "message": "Item is not checked out"
  }
}
```

---

### Rule CL3: Checkout Eligibility Checks

**Checks Performed:**
1. Item is available
2. Item not marked as "not for loan"
3. Borrower exists
4. Borrower not debarred
5. Borrower within checkout limit
6. No active holds by other borrowers

#### Test Scenario CL3.1: Item Not Available

**Setup:**
```
Item status: "issued"
```

**Action:** Try to checkout

**Expected:** 400 Bad Request
```json
{
  "error": {
    "message": "Item is not available for checkout"
  }
}
```

**Test:**
```http
POST /api/circulation/checkout
{
  "borrowernumber": 2,
  "itemnumber": 1  // Status: issued
}
```

---

#### Test Scenario CL3.2: Item Not For Loan

**Setup:**
```
Item: notforloan = true
```

**Action:** Try to checkout

**Expected:** 400 Bad Request
```json
{
  "error": {
    "message": "Item is not available for loan"
  }
}
```

---

#### Test Scenario CL3.3: Borrower Debarred

**Setup:**
```
Borrower: debarred = "2025-12-31"
Current date: "2025-10-29"
```

**Action:** Try to checkout

**Expected:** 403 Forbidden
```json
{
  "error": {
    "message": "Borrower is restricted until 2025-12-31"
  }
}
```

**Test:**
```http
POST /api/circulation/checkout
{
  "borrowernumber": 5,  // Debarred borrower
  "itemnumber": 1
}
```

---

#### Test Scenario CL3.4: Checkout Limit Reached

**Setup:**
```
Category: ADULT (max: 5 items)
Current checkouts: 5
```

**Action:** Try to checkout 6th item

**Expected:** 400 Bad Request
```json
{
  "error": {
    "message": "Checkout limit reached (5/5)"
  }
}
```

**How to Test:**
1. Checkout 5 items to borrower
2. Try to checkout 6th item
3. Verify error message

---

#### Test Scenario CL3.5: Item Has Active Hold

**Setup:**
```
Item: available
Hold: active, by borrower #3
```

**Action:** Borrower #2 tries to checkout

**Expected:** 400 Bad Request
```json
{
  "error": {
    "message": "Item has an active hold"
  }
}
```

**Exception:** Borrower #3 (who placed hold) CAN checkout

---

## 💰 Fine Calculation Rules

### Rule FC1: Basic Fine Calculation

**Formula:**  
Fine = (Days Overdue) × (Fine Per Day)

**Default Rate:** $0.50 per day

#### Test Scenario FC1.1: Simple Overdue Calculation

**Setup:**
```
Due Date: 2025-10-20 23:59:59
Return Date: 2025-10-29 14:30:00
Days Overdue: 9 days
Fine Rate: $0.50/day
```

**Expected Fine:** $4.50

**Calculation:**
```
Days = (Return Date) - (Due Date)
Days = Oct 29 - Oct 20 = 9 days
Fine = 9 × $0.50 = $4.50
```

**API Test:**
```http
POST /api/circulation/return
{
  "itemnumber": 1  // Due: Oct 20, Return: Oct 29
}
```

**Expected Response:**
```json
{
  "data": {
    "returndate": "2025-10-29T14:30:00Z",
    "fine": 4.50,
    "daysOverdue": 9
  }
}
```

**Verification:**
- [ ] Days calculated correctly
- [ ] Fine is exact (not rounded)
- [ ] AccountLine created with correct amount

---

#### Test Scenario FC1.2: On-Time Return (No Fine)

**Setup:**
```
Due Date: 2025-11-12 23:59:59
Return Date: 2025-11-10 10:00:00
Days Overdue: 0
```

**Expected Fine:** $0.00

**Verification:**
- [ ] No fine calculated
- [ ] No AccountLine created
- [ ] Return processed normally

---

#### Test Scenario FC1.3: Return on Due Date

**Setup:**
```
Due Date: 2025-11-12 23:59:59
Return Date: 2025-11-12 20:00:00
```

**Expected Fine:** $0.00

**Verification:**
- [ ] Same-day return is not overdue
- [ ] No fine even if returned at 23:59:00

---

#### Test Scenario FC1.4: Return at Midnight

**Setup:**
```
Due Date: 2025-11-12 23:59:59
Return Date: 2025-11-13 00:01:00
Days Overdue: 1
```

**Expected Fine:** $0.50

**Verification:**
- [ ] One minute after midnight counts as next day
- [ ] Fine calculated for 1 day

---

#### Test Scenario FC1.5: Long Overdue

**Setup:**
```
Due Date: 2025-09-01 23:59:59
Return Date: 2025-10-29 14:00:00
Days Overdue: 58 days
Fine Rate: $0.50/day
```

**Expected Fine:** $29.00

**Verification:**
- [ ] Handles large day counts
- [ ] No maximum fine cap (unless configured)

---

### Rule FC2: Fine Amount Precision

**Rule:** Fines use Decimal type with 2 decimal places

#### Test Scenario FC2.1: Fractional Fine

**Setup:**
```
Days Overdue: 3
Fine Rate: $0.25/day
```

**Expected Fine:** $0.75

**Verification:**
- [ ] Decimal precision maintained
- [ ] No rounding errors
- [ ] Database stores as DECIMAL(10,2)

---

#### Test Scenario FC2.2: Fine Rate Change

**Setup:**
```
1. Admin changes fine_per_day from $0.50 to $0.75
2. Return item with 10 days overdue
```

**Expected Fine:** $7.50 (uses new rate)

**Test Steps:**
```http
# Step 1: Update fine rate
PUT /api/system-preferences/fine_per_day
{
  "value": "0.75"
}

# Step 2: Return item
POST /api/circulation/return
{
  "itemnumber": 1  // 10 days overdue
}
```

**Verification:**
- [ ] New rate applied immediately
- [ ] Old checkouts use new rate at return time

---

### Rule FC3: AccountLine Creation

**Rule:** Fine creates AccountLine record

#### Test Scenario FC3.1: Fine Record Structure

**Expected AccountLine:**
```json
{
  "accountlines_id": 1,
  "borrowernumber": 2,
  "itemnumber": 1,
  "issue_id": 1,
  "date": "2025-10-29T14:30:00Z",
  "amount": 4.50,
  "amountoutstanding": 4.50,
  "description": "Overdue fine (9 days)",
  "accounttype": "FINE",
  "status": "unpaid",
  "payment_type": null,
  "manager_id": null
}
```

**Verification:**
- [ ] Linked to borrower
- [ ] Linked to item
- [ ] Linked to issue
- [ ] Amount = amountoutstanding initially
- [ ] Accounttype is "FINE"
- [ ] Status is "unpaid"
- [ ] Date is return date

---

## 🔄 Hold/Reserve Management

### Rule HR1: Hold Priority Queue

**Rule:** Holds are ordered by priority (1 = first in line)

#### Test Scenario HR1.1: First Hold

**Setup:**
```
Biblio has no existing holds
```

**Action:** Place hold

**Expected:**
```json
{
  "reserve_id": 1,
  "priority": 1
}
```

---

#### Test Scenario HR1.2: Second Hold

**Setup:**
```
Biblio has 1 hold (priority 1)
```

**Action:** Place another hold

**Expected:**
```json
{
  "reserve_id": 2,
  "priority": 2
}
```

---

#### Test Scenario HR1.3: Hold Cancellation Priority Update

**Setup:**
```
Holds: [A(priority 1), B(priority 2), C(priority 3)]
```

**Action:** Cancel hold B

**Expected State:**
```
Holds: [A(priority 1), C(priority 2)]
```

**Verification:**
- [ ] Hold B cancelled
- [ ] Hold C priority decremented from 3 to 2
- [ ] Hold A priority unchanged

---

### Rule HR2: Hold Expiration

**Rule:** Holds expire after 30 days if not fulfilled

#### Test Scenario HR2.1: Expiration Date Calculation

**Setup:**
```
Reserve Date: 2025-10-29
```

**Expected Expiration:** 2025-11-28

**Verification:**
- [ ] Expirationdate = reservedate + 30 days

---

#### Test Scenario HR2.2: Expired Hold

**Setup:**
```
Expirationdate: 2025-10-01
Current Date: 2025-10-29
```

**Expected:** Hold is considered expired

**Note:** Requires scheduled job or manual cleanup

---

### Rule HR3: Hold Fulfillment

**Rule:** When item returned, first hold gets notification

#### Test Scenario HR3.1: Item Return with Active Hold

**Setup:**
```
Item: issued to borrower A
Hold: borrower B (priority 1)
```

**Action:** Borrower A returns item

**Expected Flow:**
1. Item status → "available"
2. Hold status → "waiting" (W)
3. Hold found → "W"
4. Waitingdate set

**Then:**
5. Admin checks out to borrower B
6. Hold fulfilled

**Verification:**
- [ ] Hold status updated
- [ ] Next borrower can checkout
- [ ] Priority queue maintained

---

### Rule HR4: Duplicate Hold Prevention

**Rule:** One active hold per borrower per title

#### Test Scenario HR4.1: Duplicate Hold Attempt

**Setup:**
```
Borrower #2 already has hold on biblionumber 1
```

**Action:** Try to place another hold on same title

**Expected:** 409 Conflict
```json
{
  "error": {
    "message": "You already have an active hold on this title"
  }
}
```

**Test:**
```http
POST /api/reserves
{
  "borrowernumber": 2,
  "biblionumber": 1  // Already has hold
}
```

---

## 📊 Checkout Limit Enforcement

### Rule CLE1: Category-Based Limits

**Categories:**
- ADULT: 5 items
- CHILD: 3 items
- STAFF: 20 items

#### Test Scenario CLE1.1: ADULT Limit Test

**Steps:**
1. Checkout items 1-5 to ADULT member
2. Try to checkout item 6

**Expected:**
- Checkouts 1-5: Success
- Checkout 6: 400 Bad Request

**Detailed Test:**
```
Checkout 1: ✅ Success (1/5)
Checkout 2: ✅ Success (2/5)
Checkout 3: ✅ Success (3/5)
Checkout 4: ✅ Success (4/5)
Checkout 5: ✅ Success (5/5)
Checkout 6: ❌ Error "Checkout limit reached (5/5)"
```

---

#### Test Scenario CLE1.2: CHILD Limit Test

**Steps:**
1. Checkout items 1-3 to CHILD member
2. Try to checkout item 4

**Expected:**
- Checkouts 1-3: Success
- Checkout 4: 400 Bad Request

---

#### Test Scenario CLE1.3: Limit After Return

**Steps:**
1. ADULT member has 5/5 items
2. Return 1 item (now 4/5)
3. Checkout another item

**Expected:**
- After return: Can checkout again
- Limit decreases with returns

---

### Rule CLE2: Real-Time Limit Checking

**Rule:** Check current count at checkout time

#### Test Scenario CLE2.1: Concurrent Checkouts

**Setup:**
```
Member has 4/5 items
```

**Action:** Two simultaneous checkout requests

**Expected:**
- First request: Success (5/5)
- Second request: Error (over limit)

**Note:** Requires transaction isolation testing

---

## 🔁 Renewal Rules

### Rule RR1: Renewal Limit

**Default:** 3 renewals per item

#### Test Scenario RR1.1: Within Limit

**Steps:**
```
Initial checkout: renewals_count = 0
Renewal 1: renewals_count = 1 ✅
Renewal 2: renewals_count = 2 ✅
Renewal 3: renewals_count = 3 ✅
Renewal 4: ❌ Error "Maximum renewals (3) reached"
```

**Test:**
```http
# Renewal 1
POST /api/circulation/renew
{
  "itemnumber": 1
}
# Expected: Success

# Renewal 2
POST /api/circulation/renew
{
  "itemnumber": 1
}
# Expected: Success

# Renewal 3
POST /api/circulation/renew
{
  "itemnumber": 1
}
# Expected: Success

# Renewal 4
POST /api/circulation/renew
{
  "itemnumber": 1
}
# Expected: 403 Forbidden
```

---

### Rule RR2: Renewal Due Date Extension

**Rule:** New due date = current due date + loan period

#### Test Scenario RR2.1: Simple Renewal

**Setup:**
```
Original due date: 2025-11-12
Loan period: 14 days
Renewal date: 2025-11-05 (7 days before due)
```

**Expected New Due Date:** 2025-11-26
```
Calculation: 2025-11-12 + 14 days = 2025-11-26
```

**Verification:**
- [ ] Extension from original due date (not from renewal date)
- [ ] Same loan period applied

---

#### Test Scenario RR2.2: Overdue Renewal

**Setup:**
```
Original due date: 2025-10-20 (9 days ago)
Renewal date: 2025-10-29
Loan period: 14 days
```

**Expected New Due Date:** 2025-11-03
```
Calculation: 2025-10-20 + 14 days = 2025-11-03
```

**Alternative Policy:** Some systems calculate from renewal date:
```
2025-10-29 + 14 days = 2025-11-12
```

**Verify your system's policy!**

---

### Rule RR3: Renewal with Active Hold

**Rule:** Cannot renew if another borrower has hold

#### Test Scenario RR3.1: Blocked Renewal

**Setup:**
```
Item: checked out to borrower A
Hold: borrower B (priority 1)
```

**Action:** Borrower A tries to renew

**Expected:** 403 Forbidden
```json
{
  "error": {
    "message": "Cannot renew: item has active hold"
  }
}
```

---

## 🎲 Edge Cases & Boundary Testing

### Edge Case EC1: Leap Year Dates

#### Test Scenario EC1.1: February 29 Checkout

**Setup:**
```
Checkout date: 2024-02-29 (leap year)
Loan period: 14 days
```

**Expected Due Date:** 2024-03-14

**Verification:**
- [ ] Handles leap year correctly
- [ ] No date calculation errors

---

### Edge Case EC2: Time Zones

#### Test Scenario EC2.1: Midnight Boundary

**Setup:**
```
Due date: 2025-11-12 23:59:59 UTC
Return: 2025-11-12 23:59:00 Local (if different TZ)
```

**Expected:** Not overdue (use consistent timezone)

**Verification:**
- [ ] All dates in UTC
- [ ] No timezone conversion issues

---

### Edge Case EC3: Maximum Values

#### Test Scenario EC3.1: Very Large Fine

**Setup:**
```
Days overdue: 365
Fine rate: $1.00/day
```

**Expected Fine:** $365.00

**Verification:**
- [ ] Decimal field can handle amount
- [ ] No overflow errors

---

#### Test Scenario EC3.2: Many Items

**Setup:**
```
Category: STAFF (max 20)
Checkout 20 items
```

**Verification:**
- [ ] System handles 20+ simultaneous checkouts
- [ ] No performance degradation

---

### Edge Case EC4: Concurrent Operations

#### Test Scenario EC4.1: Simultaneous Checkouts

**Action:** Two users try to checkout same item at exact same time

**Expected:** One succeeds, one fails

**Verification:**
- [ ] Database transaction isolation works
- [ ] No race conditions

---

#### Test Scenario EC4.2: Return While Renewing

**Action:** 
- User A renews item
- User B (admin) returns item
- Both at same time

**Expected:** One operation succeeds based on transaction order

---

### Edge Case EC5: Data Cleanup

#### Test Scenario EC5.1: Delete Borrowed Item

**Setup:**
```
Item: checked out (status: issued)
```

**Action:** Try to delete item

**Expected:** 400 Bad Request OR cascade handling

**Verification:**
- [ ] Cannot delete checked-out items
- [ ] OR issues marked as returned

---

## ✅ Validation Rules Testing

### Validation V1: Email Format

#### Test Cases:
```
Valid:
✅ user@example.com
✅ user.name@example.com
✅ user+tag@example.co.uk

Invalid:
❌ plaintext
❌ @example.com
❌ user@
❌ user @example.com (space)
```

---

### Validation V2: Password Strength

#### Test Cases:
```
Valid:
✅ Password@123 (8+ chars, mixed case, number, special)
✅ SecurePass2025!

Invalid:
❌ 12345678 (no letters)
❌ password (no numbers, no special)
❌ Pass1! (too short)
```

---

### Validation V3: Phone Numbers

#### Test Cases:
```
Valid:
✅ 555-1234
✅ (555) 123-4567
✅ +1-555-123-4567

Invalid:
❌ 12345 (too short)
❌ abcd-efgh
```

---

### Validation V4: Dates

#### Test Cases:
```
Valid:
✅ 1990-05-15 (ISO format)
✅ 2025-10-29

Invalid:
❌ 13-01-2025 (wrong format)
❌ 2025-13-40 (invalid date)
❌ 1800-01-01 (too old for DOB)
❌ 2030-01-01 (future date for DOB)
```

---

### Validation V5: Barcode Uniqueness

#### Test Scenario V5.1: Duplicate Barcode

**Setup:**
```
Existing barcode: "HP001001"
```

**Action:** Create item with same barcode

**Expected:** 409 Conflict

---

### Validation V6: Foreign Key Validation

#### Test Scenario V6.1: Invalid Biblionumber

**Action:** Create item with biblionumber = 99999 (doesn't exist)

**Expected:** 400 Bad Request

---

#### Test Scenario V6.2: Invalid Categorycode

**Action:** Create borrower with categorycode = "INVALID"

**Expected:** 400 Bad Request

---

## 📊 Testing Checklist

### Circulation Tests
- [ ] Due date calculated correctly for all categories
- [ ] Item status transitions work
- [ ] All eligibility checks enforced
- [ ] Checkout blocked when limit reached
- [ ] Checkout blocked for debarred borrowers

### Fine Calculation Tests
- [ ] Simple overdue fine calculated correctly
- [ ] On-time return has no fine
- [ ] Fine precision maintained (Decimal)
- [ ] AccountLine created properly
- [ ] Fine rate changes apply immediately

### Hold/Reserve Tests
- [ ] Priority queue maintained
- [ ] Duplicate holds prevented
- [ ] Hold expiration calculated
- [ ] Hold fulfillment workflow works
- [ ] Priority updates on cancellation

### Renewal Tests
- [ ] Renewal limit enforced
- [ ] Due date extended correctly
- [ ] Renewal blocked with active hold
- [ ] Overdue renewals handled

### Edge Cases
- [ ] Leap year dates work
- [ ] Timezone handling correct
- [ ] Large values supported
- [ ] Concurrent operations safe
- [ ] Data cleanup policies enforced

### Validation Tests
- [ ] Email format validated
- [ ] Password strength enforced
- [ ] Phone numbers validated
- [ ] Dates validated
- [ ] Uniqueness constraints enforced
- [ ] Foreign keys validated

---

## 📞 Quick Reference

### Key Business Rules
- **Due Date:** Checkout date + loan period days
- **Fine:** Days overdue × fine per day
- **Hold Priority:** 1 = first in line
- **Checkout Limits:** ADULT=5, CHILD=3, STAFF=20
- **Renewal Limit:** 3 times per item
- **Hold Expiry:** 30 days

### Common Test Values
- **Fine Rate:** $0.50/day (default)
- **Loan Period:** ADULT=14, CHILD=7, STAFF=30 days
- **Max Renewals:** 3 (default)

---

**Document Status:** ✅ Complete  
**Last Updated:** October 29, 2025  
**Estimated Testing Time:** 2-3 hours for all business logic tests
