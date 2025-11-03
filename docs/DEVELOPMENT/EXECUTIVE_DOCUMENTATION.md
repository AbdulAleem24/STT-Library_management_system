# Library Management System - Database Documentation

## 📑 Table of Contents

1. [Key Stats](#key-stats)
2. [Database Architecture](#️-database-architecture)
3. [Data Flow Examples](#-data-flow-examples)
4. [Core Tables & Relationships](#-core-tables--relationships)
   - [Reference Tables](#1-reference-tables-configuration)
   - [Master Tables](#2-master-tables-core-entities)
   - [Transaction Tables](#3-transaction-tables-operations)
   - [System Tables](#4-system-tables)
5. [Automated Business Logic (Triggers)](#️-automated-business-logic-triggers)
6. [Reporting Views](#-reporting-views)
7. [Utility Functions](#️-utility-functions)
8. [Cascading Rules](#cascading-rules)
9. [Performance Optimization](#-performance-optimization)
10. [Key Design Decisions](#-key-design-decisions)

---

## Key Stats

- **12 Core Tables** (organized in 4 tiers)
- **15 Automated Triggers** for business logic
- **4 Reporting Views** for analytics
- **6 Utility Functions** for common operations
- **Fully normalized** (4NF compliant)

---

## 🗂️ Database Architecture

### Three-Tier Table Structure

```
┌─────────────────────────────────────────────────────────┐
│  TIER 1: REFERENCE DATA (lookup tables)                │
│  ├─ categories (patron types & circulation rules)      │
│  └─ itemtypes (book types, fees, rental charges)       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 2: MASTER DATA (entities)                        │
│  ├─ biblio (book catalog/records)                      │
│  ├─ items (physical copies of books)                   │
│  └─ borrowers (library members/patrons)                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 3: TRANSACTIONAL DATA (operations)               │
│  ├─ issues (active checkouts)                          │
│  ├─ old_issues (checkout history)                      │
│  ├─ reserves (holds/requests)                          │
│  ├─ old_reserves (hold history)                        │
│  └─ accountlines (fines, fees, payments)               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 4: SYSTEM TABLES                                 │
│  ├─ systempreferences (configuration)                  │
│  └─ action_logs (audit trail)                          │
└─────────────────────────────────────────────────────────┘
```

---

## � Data Flow Examples

### **Scenario 1: Checking Out a Book**

```
1. User scans item barcode
2. System checks:
   ✓ Patron not debarred
   ✓ Membership not expired
   ✓ Under checkout limit (< 5 for adults)
   ✓ Fines under limit (< $5.00)
   ✓ Item available and not reserved for someone else
   
3. INSERT into issues table
   ├─ Trigger: auto_set_due_date
   │  └─ Calculates date_due (14 days for adults)
   ├─ Trigger: enforce_checkout_limit
   │  └─ Verifies patron under limit
   ├─ Trigger: prevent_checkout_if_reserved
   │  └─ Blocks if held for another patron
   └─ Trigger: set_item_onloan
      └─ Updates items.status = 'checked_out'
      └─ Sets items.onloan = due_date
      └─ Increments items.issues counter
```

---

### **Scenario 2: Returning a Book (No Overdue)**

```
1. Staff scans barcode
2. System finds active issue
3. UPDATE issues SET returndate = NOW()
   └─ Trigger: move_to_old_issues
      ├─ Copies record to old_issues
      ├─ Updates items.status = 'available'
      ├─ Clears items.onloan
      └─ Deletes from issues
   
4. Trigger: notify_reserve_on_return
   └─ Checks if anyone has hold on this item
   └─ Updates next reserve.found = 'W' (waiting)
   └─ Sets waitingdate = today
```

---

### **Scenario 3: Returning a Book (Late)**

```
1. UPDATE issues SET returndate = NOW()
   ├─ Trigger: calculate_overdue_fine
   │  ├─ Calculates days late: returndate - date_due
   │  ├─ Calculates fine: days × $0.25
   │  └─ INSERT into accountlines
   │     ├─ amount = fine_amount
   │     ├─ amountoutstanding = fine_amount
   │     ├─ accounttype = 'OVERDUE'
   │     └─ status = 'open'
   └─ Trigger: move_to_old_issues
      └─ (same as Scenario 2)
```

---

### **Scenario 4: Placing a Hold**

```
1. Patron searches for book
2. All copies checked out
3. INSERT into reserves
   ├─ borrowernumber = patron_id
   ├─ biblionumber = book_id
   ├─ priority = next_in_queue
   └─ found = NULL (waiting)
   
4. When item returned:
   └─ Trigger: notify_reserve_on_return
      └─ Updates reserve.found = 'W'
      └─ Patron notified (ready for pickup)
      
5. If not picked up in 7 days:
   └─ Function: expire_old_holds()
      └─ Sets cancellationdate = today
```

---

## �📋 Core Tables & Relationships

### 1. **Reference Tables** (Configuration)

#### `categories` - Patron Categories
Defines member types (Adult, Child, Staff) with circulation rules including maximum checkout limits and default loan periods.

**Relationships:** Referenced by `borrowers` to determine checkout limits and due dates.

---

#### `itemtypes` - Item Types  
Defines book formats (Book, DVD, eBook, Magazine, Audio) with associated rental fees and replacement costs.

**Relationships:** Referenced by `biblio` to classify materials and determine replacement costs.

---

### 2. **Master Tables** (Core Entities)

#### `biblio` - Book Catalog
Master bibliographic records containing title, author, ISBN, publisher, and publication information. Represents the "book" concept (not physical copies).

**Relationships:**
- → `items` (one-to-many): One book record can have multiple physical copies
- ← `itemtypes` (many-to-one): Each book belongs to a type

---

#### `items` - Physical Copies
Physical copies with barcode, location, status (available/checked_out/lost/damaged), and circulation statistics. Tracks the actual items patrons borrow.

**Relationships:**
- ← `biblio` (many-to-one): Each copy belongs to one book record
- → `issues` (one-to-one when checked out): Currently borrowed by patron
- → `reserves` (one-to-many): Can have multiple holds queued

**Note:** Status automatically updated by triggers during checkout/return.

---

#### `borrowers` - Library Members
Patron accounts with personal info (name, contact details), library card number, membership expiration, and optional restrictions.

**Relationships:**
- ← `categories` (many-to-one): Determines checkout limits and loan periods
- → `issues` (one-to-many): Current checkouts
- → `reserves` (one-to-many): Active holds
- → `accountlines` (one-to-many): Fines and payments

---

### 3. **Transaction Tables** (Operations)

#### `issues` - Active Checkouts
Tracks items currently borrowed by patrons with issue date, due date, and renewal count. When returned, automatically moves to `old_issues` and updates item status to available.

**Relationships:**
- ← `borrowers` (many-to-one): Who borrowed it
- ← `items` (one-to-one): What was borrowed (each item can only be checked out once)
- → `accountlines` (one-to-many): Generates fines if overdue

**Enforced Rules:** Checkout limits, renewal limits (max 3), prevents checkout if reserved for another patron.

---

#### `old_issues` - Checkout History
Archive of completed checkouts. Maintains permanent audit trail without cluttering the active `issues` table.

---

#### `reserves` - Holds/Requests
Patron hold queue for items not currently available. Tracks priority, wait status (waiting/ready for pickup/in transit), and expiration dates.

**Relationships:**
- ← `borrowers` (many-to-one): Who requested it
- ← `biblio` (many-to-one): Which book (any copy)
- ← `items` (many-to-one): Specific copy (optional)

**Queue System:** Sorted by priority and date. When item becomes available, next patron automatically notified. Holds expire after 7 days.

---

#### `old_reserves` - Hold History
Archive of completed/cancelled holds.

---

#### `accountlines` - Financial Transactions
Tracks all fines, fees, payments, and credits with amount owed and payment status. Overdue fines auto-calculated at $0.25/day when items returned late.

**Relationships:**
- ← `borrowers` (many-to-one): Patron's account
- ← `items` (many-to-one): Related item

**Auto-Rules:** Blocks checkouts if fines exceed $5.00.

---

### 4. **System Tables**

#### `systempreferences` - Configuration
Key-value store for system-wide settings (fine amounts, renewal limits, hold expiry days, etc.).

---

#### `action_logs` - Audit Trail
Tracks all critical database operations with before/after snapshots (JSONB), user who made changes, and timestamp.

---

## ⚙️ Automated Business Logic (Triggers)

### Circulation Triggers

| Trigger | When | Action |
|---------|------|--------|
| **auto_set_due_date** | Before checkout | Calculates due date based on patron category |
| **enforce_checkout_limit** | Before checkout | Blocks if patron at max limit |
| **check_item_not_reserved** | Before checkout | Prevents checkout if held for another patron |
| **set_item_onloan** | After checkout | Updates item status to 'checked_out' |
| **track_renewal** | On renewal | Increments renewal counter |
| **check_renewal_limit** | On renewal | Blocks if max renewals reached |

### Return & Fine Triggers

| Trigger | When | Action |
|---------|------|--------|
| **calculate_overdue_fine** | On return | Creates fine if late ($0.25/day) |
| **move_to_old_issues** | On return | Archives to old_issues, frees item |
| **archive_returned_issue** | On return | Moves completed checkout to history |

### Notification Triggers

| Trigger | When | Action |
|---------|------|--------|
| **notify_reserve_on_return** | Item becomes available | Notifies next patron in hold queue |

### Status Tracking Triggers

| Trigger | When | Action |
|---------|------|--------|
| **sync_item_status** | Item status changes | Updates status_date timestamp |
| **update_timestamp** | Record updated | Updates updated_at for audit |

---

## 📊 Reporting Views

### 1. `available_items`
Shows all items ready to check out.

**Columns:** barcode, title, author, location, call number, item type

**Use Case:** Staff searches for available books

---

### 2. `overdue_items`
Currently overdue checkouts with patron details.

**Columns:** patron name, email, phone, book title, due date, days overdue

**Use Case:** Generate overdue notices, contact patrons

---

### 3. `patron_account_summary`
Complete patron account overview.

**Columns:** name, current checkouts, active holds, total fines, overdue count

**Use Case:** Quick patron status check at circulation desk

---

### 4. `popular_items`
Most borrowed books with statistics.

**Columns:** title, author, total checkouts, total renewals, total holds, copies available

**Use Case:** Collection development, purchasing decisions

---

## 🛠️ Utility Functions

### Patron Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| **can_patron_checkout(patron_id)** | Boolean + reason | Pre-checkout validation |
| **get_patron_checkout_count(patron_id)** | Integer | Current items borrowed |
| **get_patron_fines(patron_id)** | Decimal | Total outstanding balance |

### Item Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| **is_item_available(item_id)** | Boolean | Check if item can be borrowed |

### Date Calculation

| Function | Returns | Purpose |
|----------|---------|---------|
| **calculate_due_date(patron_id, checkout_date)** | Timestamp | Compute return due date |

### Maintenance

| Function | Returns | Purpose |
|----------|---------|---------|
| **expire_old_holds()** | Integer | Cancel expired holds (run daily) |

---


### Cascading Rules

✅ **biblio → items:** CASCADE (deleting book deletes copies)  
✅ **borrowers → issues:** RESTRICT (can't delete patron with checkouts)  
✅ **borrowers → reserves:** CASCADE (deleting patron cancels holds)  

---

## 🚀 Performance Optimization

### Strategic Indexes

- **Full-text search:** Title and author (GIN + trigram)
- **Barcode lookups:** B-tree on items.barcode
- **Patron search:** Name, email, card number
- **Due date queries:** issues.date_due (for overdue reports)
- **Status filtering:** items.status (for availability)

### Query Optimization

- **Statistics:** Multi-column statistics for common joins
- **Partial indexes:** Only on relevant rows (e.g., WHERE status = 'available')
- **ANALYZE:** Tables analyzed for optimal query plans

### Scalability

- **Partitioning ready:** Old issues/reserves can be partitioned by year
- **Archive strategy:** Historical data separated from active transactions
- **Index maintenance:** Automatic update on data changes

---

## 🎯 Key Design Decisions

### Simplifications from Standard ILS

1. **Single Branch:** Removed multi-location complexity
2. **Consolidated Names:** One `full_name` field instead of 6 separate fields
3. **JSONB Addresses:** Flexible structure vs. rigid columns
4. **Single Status Field:** Instead of 6+ boolean flags
5. **Merged Biblio Tables:** Eliminated biblioitems redundancy

---
