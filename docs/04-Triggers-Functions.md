# Complete Triggers & Functions Documentation

This document explains **every trigger** and **trigger function** in the library management system, including when they fire, what they do, and the business logic they implement.

---

## 📑 Table of Contents

1. [Trigger Overview](#trigger-overview)
2. [Timestamp Management](#timestamp-management)
3. [Checkout/Return Triggers](#checkout-return-triggers)
4. [Renewal Triggers](#renewal-triggers)
5. [Holds/Reserves Triggers](#holds-reserves-triggers)
6. [Item Status Triggers](#item-status-triggers)
7. [Business Rule Enforcement](#business-rule-enforcement)

---

## 🎯 Trigger Overview

### What is a Trigger?

A **trigger** is code that automatically executes in response to specific database events:
- **BEFORE INSERT** - Runs before a new row is added
- **AFTER INSERT** - Runs after a new row is added
- **BEFORE UPDATE** - Runs before a row is modified
- **AFTER UPDATE** - Runs after a row is modified
- **BEFORE/AFTER DELETE** - Runs when a row is deleted

### Why Use Triggers?

1. **Automation** - Business logic executes automatically, no application code needed
2. **Consistency** - Rules enforced regardless of how data is modified
3. **Data Integrity** - Prevent invalid states
4. **Audit Trail** - Track changes automatically
5. **Performance** - Logic runs in database (fewer round trips)

### Our Trigger Inventory

| # | Trigger Name | Table | Event | Purpose |
|---|--------------|-------|-------|---------|
| 1 | `update_biblio_timestamp` | biblio | BEFORE UPDATE | Update modified timestamp |
| 2 | `update_items_timestamp` | items | BEFORE UPDATE | Update modified timestamp |
| 3 | `update_borrowers_timestamp` | borrowers | BEFORE UPDATE | Update modified timestamp |
| 4 | `set_item_onloan` | issues | AFTER INSERT | Mark item as checked out |
| 5 | `move_to_old_issues` | issues | AFTER UPDATE | Archive returned checkouts |
| 6 | `calculate_overdue_fine` | issues | AFTER UPDATE | Generate fines for late returns |
| 7 | `auto_set_due_date` | issues | BEFORE INSERT | Calculate due date |
| 8 | `enforce_checkout_limit` | issues | BEFORE INSERT | Prevent over-checkout |
| 9 | `prevent_checkout_if_reserved` | issues | BEFORE INSERT | Honor holds queue |
| 10 | `check_renewal_limit` | issues | BEFORE UPDATE | Limit renewals |
| 11 | `increment_renewal_count` | issues | BEFORE UPDATE | Track renewals |
| 12 | `track_status_change` | items | BEFORE UPDATE | Timestamp status changes |
| 13 | `notify_reserve_on_return` | items | AFTER UPDATE | Alert next patron in queue |

---

## ⏱️ Timestamp Management

### 1. Function: `update_timestamp()`

**Purpose**: Automatically update `updated_at` column when records are modified.

**Code**:
```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
- Trigger fires BEFORE UPDATE
- Sets `NEW.updated_at` to current timestamp
- Returns modified `NEW` record
- Database saves record with new timestamp

**Applied To**:
1. `biblio` table
2. `items` table
3. `borrowers` table

---

### 2. Trigger: `update_biblio_timestamp`

```sql
CREATE TRIGGER update_biblio_timestamp
    BEFORE UPDATE ON biblio
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

**When**: Before any update to `biblio` table  
**What**: Updates `updated_at` column  
**Why**: Track when catalog records were last modified

**Example**:
```sql
-- User updates book title
UPDATE biblio SET title = 'New Title' WHERE biblionumber = 1;

-- Trigger automatically adds:
-- updated_at = '2024-10-09 14:30:00'
```

---

### 3. Trigger: `update_items_timestamp`

```sql
CREATE TRIGGER update_items_timestamp
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

**When**: Before any update to `items` table  
**What**: Updates `updated_at` column  
**Why**: Track when item records were last modified

---

### 4. Trigger: `update_borrowers_timestamp`

```sql
CREATE TRIGGER update_borrowers_timestamp
    BEFORE UPDATE ON borrowers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

**When**: Before any update to `borrowers` table  
**What**: Updates `updated_at` column  
**Why**: Track when patron records were last modified

**Use Cases**:
- Audit when patron info changes
- Detect stale records
- Data synchronization
- Compliance requirements

---

## 📤 Checkout/Return Triggers

### 5. Function: `update_item_on_checkout()`

**Purpose**: When item is checked out, update item's status and statistics.

**Code**:
```sql
CREATE OR REPLACE FUNCTION update_item_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET onloan = NEW.date_due::date,
        status = 'checked_out',
        issues = issues + 1,
        datelastseen = CURRENT_TIMESTAMP
    WHERE itemnumber = NEW.itemnumber;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires AFTER INSERT into `issues`
2. Updates corresponding `items` record:
   - `onloan` = due date
   - `status` = 'checked_out'
   - `issues` counter increments
   - `datelastseen` = now
3. Item now shows as unavailable

**Trigger**:
```sql
CREATE TRIGGER set_item_onloan
    AFTER INSERT ON issues
    FOR EACH ROW EXECUTE FUNCTION update_item_on_checkout();
```

**Example Flow**:
```sql
-- 1. Staff checks out item
INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (1, 5, '2024-10-23');

-- 2. Trigger fires automatically
-- 3. Items table updated:
--    itemnumber=5: status='checked_out', onloan='2024-10-23', issues=3
```

---

### 6. Function: `archive_returned_issue()`

**Purpose**: When item is returned, move checkout record to history and free up the item.

**Code**:
```sql
CREATE OR REPLACE FUNCTION archive_returned_issue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.returndate IS NOT NULL AND OLD.returndate IS NULL THEN
        -- Insert into old_issues
        INSERT INTO old_issues (
            issue_id, borrowernumber, itemnumber, issuedate, 
            date_due, returndate, lastreneweddate, renewals_count, created_at
        ) VALUES (
            NEW.issue_id, NEW.borrowernumber, NEW.itemnumber, NEW.issuedate,
            NEW.date_due, NEW.returndate, NEW.lastreneweddate, 
            NEW.renewals_count, NEW.created_at
        );
        
        -- Update item statistics with error checking
        UPDATE items 
        SET datelastborrowed = NEW.returndate::date,
            status = 'available',
            onloan = NULL,
            datelastseen = CURRENT_TIMESTAMP
        WHERE itemnumber = NEW.itemnumber;
        
        -- Verify item update succeeded
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item % not found during return processing', 
                NEW.itemnumber;
        END IF;
        
        -- Delete from active issues
        DELETE FROM issues WHERE issue_id = NEW.issue_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires AFTER UPDATE on `issues`
2. Checks if `returndate` changed from NULL to a date
3. If yes (item returned):
   - Copy record to `old_issues`
   - Update item: status='available', onloan=NULL
   - Delete from active `issues`
4. Returns NULL (record already deleted)

**Trigger**:
```sql
CREATE TRIGGER move_to_old_issues
    AFTER UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION archive_returned_issue();
```

**Example Flow**:
```sql
-- 1. Staff scans returned item
UPDATE issues SET returndate = NOW() WHERE issue_id = 1;

-- 2. Trigger fires automatically:
--    a. Copies to old_issues (preserves history)
--    b. Updates items: status='available', onloan=NULL
--    c. Deletes from issues (no longer active)

-- 3. Item now available for next checkout
```

**Why This Design?**
- Keeps `issues` table small (only active checkouts)
- Preserves complete history in `old_issues`
- Automatic, no manual archival needed
- Atomic operation (all or nothing)

---

### 7. Function: `create_overdue_fine()`

**Purpose**: Automatically calculate and charge fines for late returns.

**Code**:
```sql
CREATE OR REPLACE FUNCTION create_overdue_fine()
RETURNS TRIGGER AS $$
DECLARE
    fine_amount DECIMAL(10,2);
    fine_per_day DECIMAL(10,2);
    days_overdue INTEGER;
BEGIN
    IF NEW.returndate IS NOT NULL AND OLD.returndate IS NULL 
       AND NEW.returndate > NEW.date_due THEN
        
        -- Get fine rate from system preferences
        SELECT COALESCE(value::DECIMAL, 0.25) INTO fine_per_day
        FROM systempreferences 
        WHERE variable = 'fine_per_day';
        
        -- Calculate days overdue
        days_overdue := EXTRACT(DAY FROM (NEW.returndate - NEW.date_due));
        fine_amount := days_overdue * fine_per_day;
        
        -- Create fine if amount > 0
        IF fine_amount > 0 THEN
            INSERT INTO accountlines (
                borrowernumber, 
                itemnumber, 
                issue_id,
                amount, 
                amountoutstanding,
                description, 
                accounttype,
                status
            ) VALUES (
                NEW.borrowernumber,
                NEW.itemnumber,
                NEW.issue_id,
                fine_amount,
                fine_amount,
                'Overdue fine - ' || days_overdue || ' days late',
                'OVERDUE',
                'open'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires AFTER UPDATE on `issues`
2. Checks if item just returned (returndate changed from NULL)
3. Checks if return is late (returndate > date_due)
4. If late:
   - Gets fine rate from config ($0.25/day default)
   - Calculates days overdue
   - Calculates fine amount
   - Creates `accountlines` record with fine
5. Fine automatically appears on patron's account

**Trigger**:
```sql
CREATE TRIGGER calculate_overdue_fine
    AFTER UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION create_overdue_fine();
```

**Example**:
```sql
-- Item due: 2024-10-01
-- Returned: 2024-10-04 (3 days late)

UPDATE issues SET returndate = '2024-10-04' WHERE issue_id = 1;

-- Trigger creates fine:
-- Days overdue: 3
-- Fine rate: $0.25/day
-- Total fine: $0.75

-- accountlines record:
-- borrowernumber: 1
-- amount: 0.75
-- description: "Overdue fine - 3 days late"
-- accounttype: "OVERDUE"
-- status: "open"
```

**Configuration**:
```sql
-- Change fine rate
UPDATE systempreferences 
SET value = '0.50' 
WHERE variable = 'fine_per_day';
```

---

## 🔄 Renewal Triggers

### 8. Function: `check_renewal_limit()`

**Purpose**: Prevent renewals beyond the maximum allowed.

**Code**:
```sql
CREATE OR REPLACE FUNCTION check_renewal_limit()
RETURNS TRIGGER AS $$
DECLARE
    max_renewals INTEGER;
BEGIN
    -- Only check if this is a renewal
    IF NEW.lastreneweddate IS NOT NULL AND 
       (OLD.lastreneweddate IS NULL OR NEW.lastreneweddate > OLD.lastreneweddate) 
    THEN
        -- Get max renewals from system preferences
        SELECT COALESCE(value::INTEGER, 3) INTO max_renewals
        FROM systempreferences WHERE variable = 'max_renewals';
        
        -- Check if already at limit
        IF COALESCE(OLD.renewals_count, 0) >= max_renewals THEN
            RAISE EXCEPTION 'Maximum renewal limit (%) reached for this item', 
                max_renewals;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires BEFORE UPDATE on `issues`
2. Detects if this is a renewal (lastreneweddate updated)
3. Gets max renewals from config (default: 3)
4. Checks current renewal count
5. If at or over limit: **RAISES EXCEPTION** (blocks update)
6. If under limit: Allows renewal to proceed

**Trigger**:
```sql
CREATE TRIGGER enforce_renewal_limit
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION check_renewal_limit();
```

**Example - Renewal Blocked**:
```sql
-- Item already renewed 3 times (at limit)
UPDATE issues 
SET lastreneweddate = NOW(), 
    date_due = date_due + INTERVAL '14 days'
WHERE issue_id = 1;

-- ERROR: Maximum renewal limit (3) reached for this item
-- Update blocked, patron must return item
```

**Example - Renewal Allowed**:
```sql
-- Item renewed only 1 time (under limit)
UPDATE issues 
SET lastreneweddate = NOW(), 
    date_due = date_due + INTERVAL '14 days'
WHERE issue_id = 2;

-- SUCCESS: Renewal proceeds
-- Trigger allows update to continue
```

---

### 9. Function: `track_renewal()`

**Purpose**: Increment renewal counter and update item statistics.

**Code**:
```sql
CREATE OR REPLACE FUNCTION track_renewal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lastreneweddate IS NOT NULL AND 
       (OLD.lastreneweddate IS NULL OR NEW.lastreneweddate > OLD.lastreneweddate) 
    THEN
        -- Increment issue renewal count
        NEW.renewals_count := COALESCE(OLD.renewals_count, 0) + 1;
        
        -- Update item renewal count
        UPDATE items 
        SET renewals = renewals + 1
        WHERE itemnumber = NEW.itemnumber;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires BEFORE UPDATE on `issues`
2. Detects renewal (lastreneweddate updated)
3. Increments `renewals_count` in the issue record
4. Increments `renewals` counter in item record
5. Returns modified NEW record

**Trigger**:
```sql
CREATE TRIGGER increment_renewal_count
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION track_renewal();
```

**Example**:
```sql
-- Initial state:
-- issues: renewals_count = 1
-- items: renewals = 5

UPDATE issues 
SET lastreneweddate = NOW(), 
    date_due = date_due + INTERVAL '14 days'
WHERE issue_id = 1;

-- After trigger:
-- issues: renewals_count = 2 (incremented)
-- items: renewals = 6 (incremented)
```

**Trigger Execution Order**:
```
1. enforce_renewal_limit (checks if allowed)
2. increment_renewal_count (if allowed, increment counter)
3. Update proceeds
```

---

## 📌 Holds/Reserves Triggers

### 10. Function: `check_item_not_reserved()`

**Purpose**: Prevent checkout if item is on hold for someone else.

**Code**:
```sql
CREATE OR REPLACE FUNCTION check_item_not_reserved()
RETURNS TRIGGER AS $$
DECLARE
    has_other_reserves BOOLEAN;
    reserve_patron_name TEXT;
BEGIN
    -- Check if item has any active reserves for OTHER patrons
    SELECT EXISTS(
        SELECT 1 FROM reserves
        WHERE itemnumber = NEW.itemnumber
          AND borrowernumber != NEW.borrowernumber
          AND cancellationdate IS NULL
          AND found IS NULL
    ) INTO has_other_reserves;
    
    IF has_other_reserves THEN
        -- Get the patron name for better error message
        SELECT b.full_name INTO reserve_patron_name
        FROM reserves r
        JOIN borrowers b ON r.borrowernumber = b.borrowernumber
        WHERE r.itemnumber = NEW.itemnumber
          AND r.borrowernumber != NEW.borrowernumber
          AND r.cancellationdate IS NULL
          AND r.found IS NULL
        ORDER BY r.priority, r.reservedate
        LIMIT 1;
        
        RAISE EXCEPTION 'Item is on hold for another patron (%). Cannot checkout.', 
            reserve_patron_name;
    END IF;
    
    -- If item has a reserve for THIS patron, mark it as fulfilled
    UPDATE reserves
    SET found = 'P',  -- P = Processing/Picked up
        waitingdate = CURRENT_DATE
    WHERE itemnumber = NEW.itemnumber
      AND borrowernumber = NEW.borrowernumber
      AND cancellationdate IS NULL
      AND found IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires BEFORE INSERT into `issues`
2. Checks if item has holds for OTHER patrons
3. If yes: **RAISES EXCEPTION** with patron name (blocks checkout)
4. If item held for THIS patron: Marks hold as fulfilled
5. If no holds: Allows checkout

**Trigger**:
```sql
CREATE TRIGGER prevent_checkout_if_reserved
    BEFORE INSERT ON issues
    FOR EACH ROW EXECUTE FUNCTION check_item_not_reserved();
```

**Example - Checkout Blocked**:
```sql
-- Item has hold for Patron #2
-- Patron #1 tries to checkout

INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (1, 5, '2024-10-23');

-- ERROR: Item is on hold for another patron (Jane Smith). Cannot checkout.
-- Checkout blocked to honor holds queue
```

**Example - Checkout Allowed (Patron Picking Up Hold)**:
```sql
-- Item has hold for Patron #1
-- Patron #1 checks out (picking up their hold)

INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (1, 5, '2024-10-23');

-- SUCCESS: Checkout proceeds
-- Reserve marked: found='P', waitingdate=today
```

---

### 11. Function: `notify_next_reserve()`

**Purpose**: When item is returned, alert next patron in holds queue.

**Code**:
```sql
CREATE OR REPLACE FUNCTION notify_next_reserve()
RETURNS TRIGGER AS $$
DECLARE
    next_reserve RECORD;
BEGIN
    -- Only process when item becomes available from checked_out status
    IF NEW.status = 'available' AND OLD.status = 'checked_out' THEN
        -- Find next waiting reserve for this item
        SELECT * INTO next_reserve
        FROM reserves
        WHERE itemnumber = NEW.itemnumber 
          AND cancellationdate IS NULL
          AND found IS NULL
        ORDER BY priority, reservedate
        LIMIT 1;
        
        IF FOUND THEN
            -- Mark reserve as waiting for pickup
            UPDATE reserves
            SET found = 'W',
                waitingdate = CURRENT_DATE
            WHERE reserve_id = next_reserve.reserve_id;
            
            -- In production, this would trigger email/SMS notification
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires AFTER UPDATE on `items`
2. Checks if status changed from 'checked_out' to 'available'
3. Finds next reserve in queue (lowest priority number)
4. Marks reserve as 'W' (Waiting for pickup)
5. Sets waitingdate to today
6. (In production: sends notification to patron)

**Trigger**:
```sql
CREATE TRIGGER notify_reserve_on_return
    AFTER UPDATE ON items
    FOR EACH ROW 
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION notify_next_reserve();
```

**Example**:
```sql
-- Item returned, status updated to 'available'
UPDATE items SET status = 'available' WHERE itemnumber = 5;

-- Trigger finds next hold:
-- reserve_id: 123
-- borrowernumber: 8
-- priority: 1

-- Updates reserve:
-- found: 'W'
-- waitingdate: '2024-10-09'

-- Patron #8 notified: "Your hold is ready for pickup!"
```

**Hold Lifecycle**:
```
1. Patron places hold → found=NULL
2. Item returned → found='W', waitingdate=today (THIS TRIGGER)
3. Patron has 7 days to pick up
4. Patron checks out → Hold deleted/archived
5. OR Hold expires → cancellationdate set
```

---

## 🔐 Business Rule Enforcement

### 12. Function: `check_checkout_limit()`

**Purpose**: Enforce maximum checkout limits per patron category.

**Code**:
```sql
CREATE OR REPLACE FUNCTION check_checkout_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_checkouts INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Lock the borrower row FIRST to prevent race conditions
    PERFORM 1 FROM borrowers 
    WHERE borrowernumber = NEW.borrowernumber 
    FOR UPDATE;
    
    -- NOW get current checkout count (after lock ensures accuracy)
    SELECT COUNT(*) INTO current_checkouts
    FROM issues
    WHERE borrowernumber = NEW.borrowernumber;
    
    -- Get maximum allowed from category
    SELECT max_checkout_count INTO max_allowed
    FROM categories c
    JOIN borrowers b ON c.categorycode = b.categorycode
    WHERE b.borrowernumber = NEW.borrowernumber;
    
    IF current_checkouts >= max_allowed THEN
        RAISE EXCEPTION 'Patron has reached maximum checkout limit of %', 
            max_allowed;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires BEFORE INSERT into `issues`
2. **LOCKS borrower row** (prevents concurrent checkouts)
3. Counts current checkouts for this patron
4. Gets max allowed from patron's category
5. If at limit: **RAISES EXCEPTION** (blocks checkout)
6. If under limit: Allows checkout

**Trigger**:
```sql
CREATE TRIGGER enforce_checkout_limit
    BEFORE INSERT ON issues
    FOR EACH ROW EXECUTE FUNCTION check_checkout_limit();
```

**Why the Lock?**
Prevents race condition:
```
WITHOUT LOCK:
Thread 1: Counts checkouts: 4 (under limit of 5)
Thread 2: Counts checkouts: 4 (under limit of 5)
Thread 1: Inserts checkout #5 ✓
Thread 2: Inserts checkout #6 ✗ (over limit!)

WITH LOCK:
Thread 1: Locks patron, counts: 4, inserts #5, releases lock
Thread 2: Waits for lock, counts: 5, rejects (at limit)
```

**Example - Checkout Blocked**:
```sql
-- Adult patron (limit: 5)
-- Currently has 5 items checked out

INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (1, 10, '2024-10-23');

-- ERROR: Patron has reached maximum checkout limit of 5
```

**Example - Checkout Allowed**:
```sql
-- Child patron (limit: 3)
-- Currently has 2 items checked out

INSERT INTO issues (borrowernumber, itemnumber, date_due)
VALUES (5, 10, '2024-10-23');

-- SUCCESS: Under limit, checkout proceeds
```

---

### 13. Function: `auto_fill_due_date()`

**Purpose**: Calculate due date if not provided at checkout.

**Code**:
```sql
CREATE OR REPLACE FUNCTION auto_fill_due_date()
RETURNS TRIGGER AS $$
DECLARE
    loan_period INTEGER;
BEGIN
    IF NEW.date_due IS NULL THEN
        -- Get loan period from patron's category
        SELECT c.loan_period_days INTO loan_period
        FROM borrowers b
        JOIN categories c ON b.categorycode = c.categorycode
        WHERE b.borrowernumber = NEW.borrowernumber;
        
        -- Calculate due date
        NEW.date_due := NEW.issuedate + (COALESCE(loan_period, 14) || ' days')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires BEFORE INSERT into `issues`
2. Checks if `date_due` is NULL
3. If NULL:
   - Gets patron's category loan period
   - Calculates: due date = checkout date + loan period
   - Sets NEW.date_due
4. Returns modified record

**Trigger**:
```sql
CREATE TRIGGER auto_set_due_date
    BEFORE INSERT ON issues
    FOR EACH ROW EXECUTE FUNCTION auto_fill_due_date();
```

**Example**:
```sql
-- Adult patron (14-day loan period)
-- Checkout without specifying due date

INSERT INTO issues (borrowernumber, itemnumber, issuedate)
VALUES (1, 5, '2024-10-09');

-- Trigger calculates:
-- date_due = '2024-10-09' + 14 days = '2024-10-23'

-- Record saved with date_due automatically filled
```

**Benefits**:
- No manual date calculation needed
- Consistent with category rules
- Can still override if needed:
  ```sql
  INSERT INTO issues (borrowernumber, itemnumber, issuedate, date_due)
  VALUES (1, 5, '2024-10-09', '2024-10-30');  -- Custom due date
  ```

---

### 14. Function: `sync_item_status()`

**Purpose**: Automatically timestamp when item status changes.

**Code**:
```sql
CREATE OR REPLACE FUNCTION sync_item_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status <> OLD.status THEN
        NEW.status_date := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**How It Works**:
1. Trigger fires BEFORE UPDATE on `items`
2. Compares old and new status
3. If changed: Sets status_date to now
4. Returns modified record

**Trigger**:
```sql
CREATE TRIGGER track_status_change
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION sync_item_status();
```

**Example**:
```sql
-- Item damaged during checkout
UPDATE items SET status = 'damaged' WHERE itemnumber = 5;

-- Trigger automatically adds:
-- status_date = '2024-10-09 14:30:00'

-- Later, can query:
SELECT * FROM items WHERE status = 'damaged' AND status_date > '2024-10-01';
-- "Items damaged in the last week"
```

---

## 🔄 Trigger Execution Order

When multiple triggers fire on the same event:

### Checkout (INSERT into issues)

```
BEFORE INSERT:
  1. auto_set_due_date (calculate due date)
  2. enforce_checkout_limit (check patron limit)
  3. prevent_checkout_if_reserved (check holds queue)
  ↓
  INSERT executes
  ↓
AFTER INSERT:
  4. set_item_onloan (update item status)
```

### Renewal (UPDATE issues)

```
BEFORE UPDATE:
  1. enforce_renewal_limit (check max renewals)
  2. increment_renewal_count (track renewal)
  ↓
  UPDATE executes
  ↓
AFTER UPDATE:
  (No post-renewal triggers)
```

### Return (UPDATE issues with returndate)

```
BEFORE UPDATE:
  (No pre-return triggers)
  ↓
  UPDATE executes
  ↓
AFTER UPDATE:
  1. calculate_overdue_fine (charge late fees)
  2. move_to_old_issues (archive + free item)
     ↓
     Item status updated to 'available'
     ↓
  3. notify_reserve_on_return (alert next patron)
```

---

## 📊 Trigger Performance

### Best Practices Used

1. **Minimal Logic** - Triggers do only what's necessary
2. **Fast Lookups** - Use indexed columns (borrowernumber, itemnumber)
3. **Avoid Loops** - No row-by-row processing
4. **Transaction Safety** - All triggers run in same transaction
5. **Error Handling** - Validate and raise meaningful exceptions

### Monitoring

```sql
-- Find slow triggers (if pg_stat_statements enabled)
SELECT query, mean_exec_time 
FROM pg_stat_statements 
WHERE query LIKE '%TRIGGER%'
ORDER BY mean_exec_time DESC;

-- Count trigger executions
SELECT schemaname, tablename, tgname, tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid;
```

---

## 🧪 Testing Triggers

### Test Scenarios

```sql
-- Test: Checkout limit enforcement
-- Setup: Adult patron with 5 checkouts
-- Action: Try to checkout 6th item
-- Expected: Exception raised

-- Test: Overdue fine calculation
-- Setup: Item due 2024-10-01, returned 2024-10-05
-- Action: Update issues.returndate
-- Expected: $1.00 fine created (4 days * $0.25)

-- Test: Renewal limit
-- Setup: Item renewed 3 times (at limit)
-- Action: Try 4th renewal
-- Expected: Exception raised

-- Test: Hold queue honor
-- Setup: Item on hold for Patron A
-- Action: Patron B tries to checkout
-- Expected: Exception raised
```

---

## 📝 Summary

### Trigger Categories

| Category | Count | Purpose |
|----------|-------|---------|
| **Timestamp Management** | 3 | Track modification times |
| **Checkout/Return** | 3 | Handle circulation lifecycle |
| **Renewals** | 2 | Manage and limit renewals |
| **Holds/Reserves** | 2 | Honor holds queue |
| **Business Rules** | 3 | Enforce library policies |
| **Total** | **13** | Complete automation |

### Key Benefits

1. **Automatic** - No manual intervention needed
2. **Consistent** - Rules enforced always
3. **Fast** - Run at database level
4. **Safe** - Transactional (all or nothing)
5. **Auditable** - Track all changes

### Trigger Philosophy

> "The best business logic is invisible business logic."  
> — Triggers enforce rules silently, reliably, and efficiently.

This comprehensive documentation covers every trigger in exhaustive detail, explaining not just what they do, but **why** and **how** they implement library business logic.
