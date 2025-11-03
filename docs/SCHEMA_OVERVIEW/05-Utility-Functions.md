# Utility Functions Documentation

This document explains all **utility/helper functions** that can be called from application code to perform common library operations.

---

## 📑 Table of Contents

1. [Function Overview](#function-overview)
2. [Availability Functions](#availability-functions)
3. [Patron Functions](#patron-functions)
4. [Date Calculation Functions](#date-calculation-functions)
5. [Financial Functions](#financial-functions)
6. [Maintenance Functions](#maintenance-functions)
7. [Usage Examples](#usage-examples)

---

## 🎯 Function Overview

**Utility functions** are standalone SQL functions that encapsulate common business logic. Unlike triggers (which fire automatically), these functions are **called explicitly** from application code.

### Why Use Functions?

1. **Reusability** - Write once, call from anywhere
2. **Consistency** - Same logic across all applications
3. **Performance** - Runs in database (no network overhead)
4. **Security** - Can grant execute permission without table access
5. **Maintainability** - Update logic in one place

### Function Inventory

| # | Function Name | Returns | Purpose |
|---|---------------|---------|---------|
| 1 | `is_item_available()` | BOOLEAN | Check if item can be checked out |
| 2 | `get_patron_checkout_count()` | INTEGER | Count patron's active checkouts |
| 3 | `calculate_due_date()` | TIMESTAMP | Calculate return date for patron |
| 4 | `get_patron_fines()` | DECIMAL | Get patron's outstanding balance |
| 5 | `can_patron_checkout()` | TABLE | Comprehensive checkout eligibility check |
| 6 | `expire_old_holds()` | INTEGER | Cancel holds not picked up in time |

---

## ✅ Availability Functions

### 1. Function: `is_item_available()`

**Purpose**: Check if a specific item is available for checkout.

**Signature**:
```sql
is_item_available(item_id INTEGER) RETURNS BOOLEAN
```

**Parameters**:
- `item_id` (INTEGER) - The `itemnumber` to check

**Returns**:
- `TRUE` - Item is available and can be checked out
- `FALSE` - Item is unavailable or restricted

**Code**:
```sql
CREATE OR REPLACE FUNCTION is_item_available(item_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    item_available BOOLEAN;
BEGIN
    SELECT status = 'available' AND notforloan = false
    INTO item_available
    FROM items
    WHERE itemnumber = item_id;
    
    RETURN COALESCE(item_available, false);
END;
$$ LANGUAGE plpgsql;
```

**Logic**:
- Checks `items.status = 'available'`
- Checks `items.notforloan = false`
- Both must be true
- Returns false if item doesn't exist (COALESCE handles NULL)

**Usage Example**:
```sql
-- Check if item 123 is available
SELECT is_item_available(123);
-- Returns: true or false

-- Use in WHERE clause
SELECT * FROM items 
WHERE biblionumber = 1 
  AND is_item_available(itemnumber) = true;
-- Returns only available copies of a book
```

**Application Code (Python)**:
```python
# Check availability before checkout
result = db.execute("SELECT is_item_available(%s)", (item_id,))
if result[0]:
    print("Item is available for checkout")
else:
    print("Item is not available")
```

**When to Use**:
- Before presenting checkout button to user
- In availability displays
- In search results (show only available)
- Pre-checkout validation

---

## 👥 Patron Functions

### 2. Function: `get_patron_checkout_count()`

**Purpose**: Count how many items a patron currently has checked out.

**Signature**:
```sql
get_patron_checkout_count(patron_id INTEGER) RETURNS INTEGER
```

**Parameters**:
- `patron_id` (INTEGER) - The `borrowernumber` to check

**Returns**:
- Integer count of active checkouts (0 or more)

**Code**:
```sql
CREATE OR REPLACE FUNCTION get_patron_checkout_count(patron_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    checkout_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO checkout_count
    FROM issues
    WHERE borrowernumber = patron_id;
    
    RETURN COALESCE(checkout_count, 0);
END;
$$ LANGUAGE plpgsql;
```

**Logic**:
- Counts rows in `issues` table for this patron
- Issues table only contains active checkouts
- Returns 0 if patron has no checkouts

**Usage Example**:
```sql
-- Get checkout count for patron 5
SELECT get_patron_checkout_count(5);
-- Returns: 3 (patron has 3 items out)

-- List patrons with their checkout counts
SELECT 
    borrowernumber,
    full_name,
    get_patron_checkout_count(borrowernumber) as items_out
FROM borrowers
ORDER BY items_out DESC;
```

**Application Code (JavaScript)**:
```javascript
// Display patron's current checkouts
const count = await db.query(
    "SELECT get_patron_checkout_count($1) as count",
    [patronId]
);
console.log(`Patron has ${count.rows[0].count} items checked out`);
```

**When to Use**:
- Patron account summary displays
- Before allowing checkout (check against limit)
- Dashboard statistics
- Reporting

---

### 3. Function: `can_patron_checkout()`

**Purpose**: Comprehensive check if patron is eligible to checkout items.

**Signature**:
```sql
can_patron_checkout(patron_id INTEGER) 
RETURNS TABLE(can_checkout BOOLEAN, reason TEXT)
```

**Parameters**:
- `patron_id` (INTEGER) - The `borrowernumber` to check

**Returns**:
- **Table** with two columns:
  - `can_checkout` (BOOLEAN) - True if eligible, false if blocked
  - `reason` (TEXT) - Explanation (either "OK" or reason for block)

**Code**:
```sql
CREATE OR REPLACE FUNCTION can_patron_checkout(patron_id INTEGER)
RETURNS TABLE(can_checkout BOOLEAN, reason TEXT) AS $$
DECLARE
    patron_record RECORD;
    checkout_count INTEGER;
    fine_amount DECIMAL(10,2);
    max_checkouts INTEGER;
    max_fine_allowed DECIMAL(10,2);
BEGIN
    -- Get patron info
    SELECT b.*, c.max_checkout_count 
    INTO patron_record
    FROM borrowers b
    JOIN categories c ON b.categorycode = c.categorycode
    WHERE b.borrowernumber = patron_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Patron not found';
        RETURN;
    END IF;
    
    -- Check if debarred
    IF patron_record.debarred IS NOT NULL 
       AND patron_record.debarred >= CURRENT_DATE THEN
        RETURN QUERY SELECT false, 
            'Patron is restricted until ' || patron_record.debarred::TEXT;
        RETURN;
    END IF;
    
    -- Check membership expiry
    IF patron_record.dateexpiry IS NOT NULL 
       AND patron_record.dateexpiry < CURRENT_DATE THEN
        RETURN QUERY SELECT false, 
            'Membership expired on ' || patron_record.dateexpiry::TEXT;
        RETURN;
    END IF;
    
    -- Check checkout limit
    checkout_count := get_patron_checkout_count(patron_id);
    max_checkouts := patron_record.max_checkout_count;
    
    IF checkout_count >= max_checkouts THEN
        RETURN QUERY SELECT false, 
            'Maximum checkout limit (' || max_checkouts || ') reached';
        RETURN;
    END IF;
    
    -- Check outstanding fines
    fine_amount := get_patron_fines(patron_id);
    SELECT COALESCE(value::DECIMAL, 5.00) INTO max_fine_allowed
    FROM systempreferences 
    WHERE variable = 'max_fine_allowed';
    
    IF fine_amount > max_fine_allowed THEN
        RETURN QUERY SELECT false, 
            'Outstanding fines ($' || fine_amount || ') exceed limit';
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql;
```

**Logic**:
Performs multiple checks in order:
1. Patron exists?
2. Is debarred (restricted)?
3. Is membership expired?
4. At checkout limit?
5. Has excessive fines?

Returns **first failure** encountered, or "OK" if all pass.

**Usage Example**:
```sql
-- Check if patron 5 can checkout
SELECT * FROM can_patron_checkout(5);

-- Results if eligible:
-- can_checkout | reason
-- -------------+-------
-- true         | OK

-- Results if blocked:
-- can_checkout | reason
-- -------------+----------------------------------
-- false        | Outstanding fines ($12.50) exceed limit
```

**Application Code (Python)**:
```python
# Pre-checkout validation
result = db.execute("SELECT * FROM can_patron_checkout(%s)", (patron_id,))
can_checkout, reason = result[0]

if can_checkout:
    # Allow checkout to proceed
    process_checkout(patron_id, item_id)
else:
    # Show error to user
    show_error(f"Cannot checkout: {reason}")
```

**When to Use**:
- **Before** showing checkout screen
- **Before** processing checkout
- In patron account displays
- As part of self-checkout kiosks

**Benefits**:
- Single function call for all checks
- Consistent validation everywhere
- Clear error messages
- Easy to maintain rules

---

## 📅 Date Calculation Functions

### 4. Function: `calculate_due_date()`

**Purpose**: Calculate when an item should be due back based on patron category.

**Signature**:
```sql
calculate_due_date(
    patron_id INTEGER,
    checkout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) RETURNS TIMESTAMP
```

**Parameters**:
- `patron_id` (INTEGER) - The `borrowernumber`
- `checkout_date` (TIMESTAMP) - Optional, defaults to now

**Returns**:
- TIMESTAMP of when item is due

**Code**:
```sql
CREATE OR REPLACE FUNCTION calculate_due_date(
    patron_id INTEGER,
    checkout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS TIMESTAMP AS $$
DECLARE
    loan_period INTEGER;
BEGIN
    SELECT c.loan_period_days INTO loan_period
    FROM borrowers b
    JOIN categories c ON b.categorycode = c.categorycode
    WHERE b.borrowernumber = patron_id;
    
    RETURN checkout_date + (COALESCE(loan_period, 14) || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

**Logic**:
- Gets patron's category loan period
- Adds that many days to checkout date
- Defaults to 14 days if not found

**Usage Example**:
```sql
-- Calculate due date for patron 5 checking out today
SELECT calculate_due_date(5);
-- Returns: 2024-10-23 14:30:00 (14 days from now if Adult)

-- Calculate due date for specific checkout date
SELECT calculate_due_date(5, '2024-10-01 10:00:00');
-- Returns: 2024-10-15 10:00:00

-- Use in checkout
INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (5, 123, calculate_due_date(5));
```

**Category Examples**:
```sql
-- Adult patron (14-day loan)
SELECT calculate_due_date(1);  -- +14 days

-- Child patron (7-day loan)
SELECT calculate_due_date(2);  -- +7 days

-- Staff patron (30-day loan)
SELECT calculate_due_date(3);  -- +30 days
```

**When to Use**:
- During checkout (if not using auto trigger)
- Displaying estimated due dates
- Policy information displays
- Calculating renewal dates

---

## 💰 Financial Functions

### 5. Function: `get_patron_fines()`

**Purpose**: Get total outstanding fines for a patron.

**Signature**:
```sql
get_patron_fines(patron_id INTEGER) RETURNS DECIMAL
```

**Parameters**:
- `patron_id` (INTEGER) - The `borrowernumber`

**Returns**:
- DECIMAL(10,2) - Total amount owed (e.g., 12.50)

**Code**:
```sql
CREATE OR REPLACE FUNCTION get_patron_fines(patron_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_outstanding DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amountoutstanding), 0) INTO total_outstanding
    FROM accountlines
    WHERE borrowernumber = patron_id
      AND amountoutstanding > 0;
    
    RETURN total_outstanding;
END;
$$ LANGUAGE plpgsql;
```

**Logic**:
- Sums `amountoutstanding` from `accountlines`
- Only includes unpaid balances (> 0)
- Returns 0.00 if no fines

**Usage Example**:
```sql
-- Get patron's total fines
SELECT get_patron_fines(5);
-- Returns: 12.50 (patron owes $12.50)

-- Find all patrons with fines
SELECT 
    borrowernumber,
    full_name,
    get_patron_fines(borrowernumber) as total_owed
FROM borrowers
WHERE get_patron_fines(borrowernumber) > 0
ORDER BY total_owed DESC;
```

**Application Code (React)**:
```javascript
// Display patron's account balance
const { data: fines } = await supabase.rpc('get_patron_fines', {
    patron_id: patronId
});

return (
    <div>
        <h3>Account Balance</h3>
        <p>${fines.toFixed(2)}</p>
    </div>
);
```

**When to Use**:
- Patron account displays
- Before allowing checkout
- Payment processing screens
- Financial reports

---

## 🧹 Maintenance Functions

### 6. Function: `expire_old_holds()`

**Purpose**: Automatically cancel holds that haven't been picked up within the time limit.

**Signature**:
```sql
expire_old_holds() RETURNS INTEGER
```

**Parameters**:
- None

**Returns**:
- INTEGER - Count of holds expired

**Code**:
```sql
CREATE OR REPLACE FUNCTION expire_old_holds()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
    expiry_days INTEGER;
BEGIN
    -- Get expiry days from system preferences
    SELECT COALESCE(value::INTEGER, 7) INTO expiry_days
    FROM systempreferences 
    WHERE variable = 'hold_expiry_days';
    
    -- Cancel holds that have been waiting too long
    WITH expired AS (
        UPDATE reserves
        SET cancellationdate = CURRENT_DATE,
            notes = COALESCE(notes || E'\n', '') || 
                   'Expired - not picked up within ' || expiry_days || ' days'
        WHERE found = 'W'
          AND waitingdate < CURRENT_DATE - expiry_days
          AND cancellationdate IS NULL
        RETURNING reserve_id
    )
    SELECT COUNT(*) INTO expired_count FROM expired;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;
```

**Logic**:
1. Gets expiry period from config (default: 7 days)
2. Finds holds marked 'W' (waiting for pickup)
3. Checks if `waitingdate` older than expiry period
4. Sets `cancellationdate` and adds note
5. Returns count of expired holds

**Usage Example**:
```sql
-- Manually expire old holds
SELECT expire_old_holds();
-- Returns: 5 (5 holds were expired)

-- Check which holds will expire
SELECT 
    r.reserve_id,
    b.full_name,
    bib.title,
    r.waitingdate,
    CURRENT_DATE - r.waitingdate as days_waiting
FROM reserves r
JOIN borrowers b ON r.borrowernumber = b.borrowernumber
JOIN biblio bib ON r.biblionumber = bib.biblionumber
WHERE r.found = 'W'
  AND r.waitingdate < CURRENT_DATE - 7;
```

**Scheduled Execution**:
```sql
-- Using pg_cron (if available)
SELECT cron.schedule(
    'expire-holds-daily',
    '0 2 * * *',  -- Every day at 2 AM
    'SELECT expire_old_holds();'
);

-- Or using systemd timer, cron job, or application scheduler
```

**When to Use**:
- **Daily** via scheduled job
- Before generating hold pickup lists
- During system maintenance
- On-demand by staff

**Benefits**:
- Keeps hold queue moving
- Frees items for next patron
- Automatic cleanup
- Configurable time limit

---

## 💡 Usage Examples

### Example 1: Complete Checkout Flow

```sql
-- 1. Check if patron can checkout
SELECT * FROM can_patron_checkout(5);
-- Result: can_checkout=true, reason='OK'

-- 2. Check if item is available
SELECT is_item_available(123);
-- Result: true

-- 3. Calculate due date
SELECT calculate_due_date(5) as due_date;
-- Result: 2024-10-23 14:30:00

-- 4. Process checkout
INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (5, 123, calculate_due_date(5));
-- Checkout complete!
```

### Example 2: Patron Account Summary

```sql
-- Get complete patron status
SELECT 
    b.borrowernumber,
    b.full_name,
    b.email,
    get_patron_checkout_count(b.borrowernumber) as items_out,
    get_patron_fines(b.borrowernumber) as fines_owed,
    c.*
FROM borrowers b
CROSS JOIN LATERAL can_patron_checkout(b.borrowernumber) c
WHERE b.borrowernumber = 5;

-- Returns:
-- borrowernumber | full_name  | email          | items_out | fines_owed | can_checkout | reason
-- --------------+------------+----------------+-----------+------------+--------------+--------
-- 5             | John Smith | john@email.com | 3         | 2.50       | true         | OK
```

### Example 3: Availability Search

```sql
-- Find available copies of a book
SELECT 
    i.itemnumber,
    i.barcode,
    i.location,
    i.itemcallnumber,
    is_item_available(i.itemnumber) as available
FROM items i
WHERE i.biblionumber = 1
  AND is_item_available(i.itemnumber) = true;

-- Returns only available copies
```

### Example 4: Nightly Maintenance

```sql
-- Run as scheduled job
DO $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Expire old holds
    expired_count := expire_old_holds();
    
    RAISE NOTICE 'Maintenance complete: % holds expired', expired_count;
END $$;
```

---

## 🔍 Function Comparison

| Function | Type | Performance | Use Case |
|----------|------|-------------|----------|
| `is_item_available()` | Simple lookup | Very fast | Real-time checks |
| `get_patron_checkout_count()` | Aggregate | Fast | Frequent calls OK |
| `calculate_due_date()` | Calculation | Very fast | Any time |
| `get_patron_fines()` | Aggregate | Fast | Frequent calls OK |
| `can_patron_checkout()` | Complex | Moderate | Pre-checkout only |
| `expire_old_holds()` | Maintenance | Slow | Scheduled only |

---

## 🎯 Best Practices

### 1. Error Handling

```sql
-- Application should check for NULL/errors
SELECT is_item_available(999999);
-- Returns: false (item doesn't exist)

-- Use COALESCE for safety
SELECT COALESCE(get_patron_fines(999), 0.00);
-- Returns: 0.00 (patron doesn't exist)
```

### 2. Performance

```sql
-- ✅ GOOD: Call once, use result
WITH patron_status AS (
    SELECT * FROM can_patron_checkout(5)
)
SELECT * FROM patron_status WHERE can_checkout = true;

-- ❌ BAD: Multiple calls
SELECT * FROM borrowers 
WHERE (SELECT can_checkout FROM can_patron_checkout(borrowernumber));
```

### 3. Supabase Integration

```javascript
// Call functions via Supabase RPC
const { data, error } = await supabase.rpc('can_patron_checkout', {
    patron_id: 5
});

if (data[0].can_checkout) {
    // Allow checkout
} else {
    alert(data[0].reason);
}
```

---

## 📝 Summary

### Function Categories

| Category | Functions | Purpose |
|----------|-----------|---------|
| **Availability** | 1 | Check item status |
| **Patron** | 2 | Patron info and validation |
| **Date** | 1 | Calculate dates |
| **Financial** | 1 | Get balance info |
| **Maintenance** | 1 | Cleanup tasks |
| **Total** | **6** | Complete toolkit |

### Key Benefits

1. **Encapsulation** - Complex logic hidden behind simple interfaces
2. **Reusability** - Call from any application
3. **Performance** - Runs in database
4. **Maintainability** - Update once, affects all callers
5. **Security** - Grant execute without table access

### When to Use Functions vs Triggers

| Use Function When | Use Trigger When |
|-------------------|------------------|
| Need return value | Action always happens |
| Conditional call | Must be automatic |
| Report/display | Data validation |
| Batch processing | Business rule enforcement |

These utility functions provide a **powerful API** for building library applications without needing to know the underlying database complexity.
