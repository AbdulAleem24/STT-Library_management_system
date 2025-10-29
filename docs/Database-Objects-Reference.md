# Database Objects Reference
## Library Management System - Streamlined Schema

**Schema Version:** 2.0.0  
**Generated:** October 10, 2025  
**Purpose:** Complete reference of all tables, views, indexes, functions, triggers, and other database objects

---

## Table of Contents
1. [Tables](#tables)
2. [Views](#views)
3. [Indexes](#indexes)
4. [Functions](#functions)
5. [Triggers](#triggers)
6. [Extensions](#extensions)
7. [Statistics](#statistics)

---

## Tables

### 1. `categories`
**Purpose:** Patron categories with circulation rules  
**Type:** Lookup/Reference Table  
**Key Fields:** `categorycode` (PK)

Defines membership types (Adult, Child, Staff) with associated borrowing rules including maximum checkout limits and loan periods.

---

### 2. `itemtypes`
**Purpose:** Types of items with associated fees  
**Type:** Lookup/Reference Table  
**Key Fields:** `itemtype` (PK)

Catalogs different material types (books, DVDs, magazines, audio books, eBooks) with rental charges and default replacement costs.

---

### 3. `biblio`
**Purpose:** Main bibliographic records for books and materials  
**Type:** Core Data Table  
**Key Fields:** `biblionumber` (PK, Serial)

Stores catalog information for library materials including title, author, ISBN, publisher, publication year, and abstract. Each record represents a unique title/work.

---

### 4. `items`
**Purpose:** Physical copies of bibliographic items with status and location  
**Type:** Core Data Table  
**Key Fields:** `itemnumber` (PK, Serial), `biblionumber` (FK), `barcode` (Unique)

Represents individual physical copies of books/materials. Tracks availability status, location, circulation statistics (issues, renewals, reserves), condition, and current loan status.

---

### 5. `borrowers`
**Purpose:** Library patrons/members  
**Type:** Core Data Table  
**Key Fields:** `borrowernumber` (PK, Serial), `cardnumber` (Unique), `userid` (Unique)

Streamlined patron records containing personal information, contact details, membership category, enrollment/expiry dates, restriction status, and authentication credentials.

---

### 6. `issues`
**Purpose:** Active checkouts - items currently on loan to patrons  
**Type:** Transactional Table  
**Key Fields:** `issue_id` (PK, Serial), `borrowernumber` (FK), `itemnumber` (FK, Unique)

Tracks all current checkouts including issue date, due date, renewal count, and return date. When returned, records automatically move to `old_issues`.

---

### 7. `old_issues`
**Purpose:** Historical record of all completed checkouts  
**Type:** Archive Table  
**Key Fields:** `issue_id` (PK)

Archive of completed circulation transactions. Maintains borrowing history for statistical reporting and patron records.

---

### 8. `reserves`
**Purpose:** Patron holds/requests for items  
**Type:** Transactional Table  
**Key Fields:** `reserve_id` (PK, Serial), `borrowernumber` (FK), `biblionumber` (FK), `itemnumber` (FK)

Manages patron requests for items that are currently checked out or specific copies. Includes priority queue, expiration dates, and fulfillment status (Waiting, In Transit, Processing).

---

### 9. `old_reserves`
**Purpose:** Historical record of holds  
**Type:** Archive Table  
**Key Fields:** `reserve_id` (PK)

Archive of completed or cancelled hold requests for historical tracking and reporting.

---

### 10. `accountlines`
**Purpose:** Patron fines, fees, and payments  
**Type:** Financial/Transactional Table  
**Key Fields:** `accountlines_id` (PK, Serial), `borrowernumber` (FK)

Tracks all financial transactions including overdue fines, lost item fees, rental charges, and payments. Maintains running balance with `amountoutstanding` field.

---

### 11. `systempreferences`
**Purpose:** System-wide configuration settings  
**Type:** Configuration Table  
**Key Fields:** `variable` (PK)

Stores configurable system parameters such as fine rates, renewal limits, hold expiry periods, and other operational settings.

---

### 12. `action_logs`
**Purpose:** Audit trail for critical operations  
**Type:** Audit/Logging Table  
**Key Fields:** `log_id` (PK, BigSerial)

Comprehensive audit log tracking who changed what and when. Records old and new data in JSONB format with IP address and user agent for security and compliance.

---

## Views

### 1. `available_items`
**Purpose:** All items currently available for checkout  
**Type:** Reporting View

Provides a filtered list of items with status 'available' and not marked as 'not for loan', joined with bibliographic information for easy display in search results.

**Key Columns:** itemnumber, barcode, location, title, author, isbn, status

---

### 2. `overdue_items`
**Purpose:** All currently overdue checkouts with patron and item details  
**Type:** Operational View

Shows all active checkouts past their due date with calculated days overdue, patron contact information, and item details for collection management.

**Key Columns:** issue_id, borrowernumber, full_name, email, barcode, title, date_due, days_overdue

---

### 3. `patron_account_summary`
**Purpose:** Summary of each patron account  
**Type:** Dashboard View

Aggregates key patron metrics including current checkout count, active holds, total outstanding fines, and overdue count for quick account assessment.

**Key Columns:** borrowernumber, cardnumber, full_name, current_checkouts, active_holds, total_fines, overdue_count

---

### 4. `popular_items`
**Purpose:** Most circulated items with usage statistics  
**Type:** Analytics View

Ranks bibliographic records by circulation activity showing total checkouts, renewals, holds, and copy count to identify popular materials.

**Key Columns:** biblionumber, title, author, total_checkouts, total_renewals, total_holds, copy_count

---

## Indexes

### Biblio Table Indexes
- **`idx_biblio_title`** - Full-text search index (GIN) on title field for fast text searches
- **`idx_biblio_title_trgm`** - Trigram index (GiST) for fuzzy/partial title matching
- **`idx_biblio_author_trgm`** - Trigram index (GiST) for fuzzy/partial author matching
- **`idx_biblio_isbn`** - Partial index on ISBN (where not null) for fast ISBN lookups
- **`idx_biblio_itemtype`** - Index on itemtype for filtering by material type

### Items Table Indexes
- **`idx_items_bibnum`** - Foreign key index on biblionumber
- **`idx_items_barcode`** - Index on barcode for fast item scanning/lookup
- **`idx_items_status`** - Index on status for availability queries
- **`idx_items_onloan`** - Partial index on onloan (where not null) for due date queries
- **`idx_items_itemcallnumber`** - Index on call number for shelf location queries

### Borrowers Table Indexes
- **`idx_borrowers_full_name`** - Index on full_name for patron searches
- **`idx_borrowers_cardnumber`** - Index on cardnumber for fast card scans
- **`idx_borrowers_userid`** - Partial index on userid (where not null) for authentication
- **`idx_borrowers_email`** - Index on email for contact lookup
- **`idx_borrowers_categorycode`** - Foreign key index on categorycode
- **`idx_borrowers_dateexpiry`** - Index on dateexpiry for membership management
- **`idx_borrowers_debarred`** - Partial index on debarred (where not null) for restriction checks

### Issues Table Indexes
- **`idx_issues_borrowernumber`** - Foreign key index on borrowernumber
- **`idx_issues_itemnumber`** - Foreign key index on itemnumber
- **`idx_issues_date_due`** - Index on date_due for overdue queries
- **`idx_issues_returndate`** - Partial index on returndate (where null) for active checkouts
- **`idx_issues_issuedate`** - Index on issuedate for date range queries

### Old_Issues Table Indexes
- **`idx_old_issues_borrowernumber`** - Index on borrowernumber for patron history
- **`idx_old_issues_itemnumber`** - Index on itemnumber for item history
- **`idx_old_issues_returndate`** - Index on returndate for historical queries
- **`idx_old_issues_issuedate`** - Index on issuedate for circulation statistics

### Reserves Table Indexes
- **`idx_reserves_borrowernumber`** - Foreign key index on borrowernumber
- **`idx_reserves_biblionumber`** - Foreign key index on biblionumber
- **`idx_reserves_itemnumber`** - Partial index on itemnumber (where not null)
- **`idx_reserves_priority`** - Index on priority for queue ordering
- **`idx_reserves_found`** - Partial index on found status (where not null)
- **`idx_reserves_cancellationdate`** - Index on cancellationdate for active holds

### Old_Reserves Table Indexes
- **`idx_old_reserves_borrowernumber`** - Index on borrowernumber
- **`idx_old_reserves_biblionumber`** - Index on biblionumber

### Accountlines Table Indexes
- **`idx_accountlines_borrowernumber`** - Foreign key index on borrowernumber
- **`idx_accountlines_itemnumber`** - Foreign key index on itemnumber
- **`idx_accountlines_issue_id`** - Index on issue_id for transaction tracking
- **`idx_accountlines_status`** - Index on status for payment queries
- **`idx_accountlines_amountoutstanding`** - Partial index (where > 0) for unpaid fines

### Action_Logs Table Indexes
- **`idx_action_logs_table_action`** - Composite index on table_name and action
- **`idx_action_logs_timestamp`** - Index on changed_at for time-based queries
- **`idx_action_logs_changed_by`** - Index on changed_by for user activity tracking
- **`idx_action_logs_record_id`** - Index on record_id for record audit trails

---

## Functions

### Timestamp Management

#### `update_timestamp()`
**Returns:** TRIGGER  
**Purpose:** Automatically updates the `updated_at` column to current timestamp on row updates  
**Used By:** Triggers on biblio, items, borrowers tables

---

### Circulation Functions

#### `archive_returned_issue()`
**Returns:** TRIGGER  
**Purpose:** Automatically moves completed checkouts from `issues` to `old_issues` when returndate is set  
**Actions:**
- Inserts record into old_issues
- Updates item status to 'available'
- Clears item's onloan date
- Updates datelastborrowed
- Deletes from active issues table

#### `update_item_on_checkout()`
**Returns:** TRIGGER  
**Purpose:** Updates item status and statistics when checked out  
**Actions:**
- Sets item status to 'checked_out'
- Sets onloan date to due date
- Increments issues counter
- Updates datelastseen timestamp

#### `create_overdue_fine()`
**Returns:** TRIGGER  
**Purpose:** Automatically calculates and creates overdue fines when items are returned late  
**Logic:**
- Retrieves fine_per_day rate from systempreferences
- Calculates days overdue
- Creates accountlines entry with status 'open'

#### `check_renewal_limit()`
**Returns:** TRIGGER  
**Purpose:** Prevents renewals beyond maximum allowed limit  
**Logic:**
- Retrieves max_renewals from systempreferences
- Raises exception if limit reached

#### `track_renewal()`
**Returns:** TRIGGER  
**Purpose:** Increments renewal counters when item is renewed  
**Actions:**
- Increments renewals_count in issues table
- Increments renewals in items table

#### `check_item_not_reserved()`
**Returns:** TRIGGER  
**Purpose:** Prevents checkout if item is on hold for another patron  
**Logic:**
- Checks for active reserves by other patrons
- Raises exception if reserved for someone else
- Marks reserve as 'Processing' if reserved for current patron

#### `check_checkout_limit()`
**Returns:** TRIGGER  
**Purpose:** Enforces maximum checkout limits based on patron category  
**Logic:**
- Locks borrower row to prevent race conditions
- Counts current checkouts
- Compares against category max_checkout_count
- Raises exception if limit exceeded

#### `auto_fill_due_date()`
**Returns:** TRIGGER  
**Purpose:** Automatically calculates due date if not provided during checkout  
**Logic:**
- Retrieves loan_period_days from patron's category
- Adds period to issuedate
- Defaults to 14 days if category not configured

#### `sync_item_status()`
**Returns:** TRIGGER  
**Purpose:** Updates status_date timestamp when item status changes  

#### `notify_next_reserve()`
**Returns:** TRIGGER  
**Purpose:** Notifies next patron in hold queue when item becomes available  
**Logic:**
- Triggers when item status changes to 'available'
- Finds next waiting reserve by priority and date
- Marks reserve as 'Waiting' for pickup
- Sets waitingdate

---

### Utility Functions

#### `is_item_available(item_id INTEGER)`
**Returns:** BOOLEAN  
**Purpose:** Checks if a specific item is available for checkout  
**Logic:** Returns true if status='available' AND notforloan=false

#### `get_patron_checkout_count(patron_id INTEGER)`
**Returns:** INTEGER  
**Purpose:** Returns the current number of active checkouts for a patron

#### `calculate_due_date(patron_id INTEGER, checkout_date TIMESTAMP)`
**Returns:** TIMESTAMP  
**Purpose:** Calculates due date based on patron category loan period  
**Logic:**
- Retrieves loan_period_days from patron's category
- Adds period to checkout_date
- Defaults to 14 days

#### `get_patron_fines(patron_id INTEGER)`
**Returns:** DECIMAL  
**Purpose:** Returns total outstanding fines for a patron  
**Logic:** Sums amountoutstanding from accountlines where > 0

#### `expire_old_holds()`
**Returns:** INTEGER  
**Purpose:** Cancels holds that have been waiting for pickup beyond expiry period  
**Logic:**
- Retrieves hold_expiry_days from systempreferences
- Finds holds with found='W' older than expiry period
- Sets cancellationdate and adds expiry note
- Returns count of expired holds
**Usage:** Should be run daily via cron job or pg_cron

#### `can_patron_checkout(patron_id INTEGER)`
**Returns:** TABLE(can_checkout BOOLEAN, reason TEXT)  
**Purpose:** Comprehensive checkout eligibility check for a patron  
**Checks:**
- Patron exists
- Not debarred/restricted
- Membership not expired
- Under checkout limit
- Fines under maximum allowed
**Returns:** Boolean flag and descriptive reason message

---

## Triggers

### Timestamp Triggers

#### `update_biblio_timestamp`
**Table:** biblio  
**Event:** BEFORE UPDATE  
**Function:** update_timestamp()  
**Purpose:** Maintains updated_at timestamp

#### `update_items_timestamp`
**Table:** items  
**Event:** BEFORE UPDATE  
**Function:** update_timestamp()  
**Purpose:** Maintains updated_at timestamp

#### `update_borrowers_timestamp`
**Table:** borrowers  
**Event:** BEFORE UPDATE  
**Function:** update_timestamp()  
**Purpose:** Maintains updated_at timestamp

---

### Circulation Triggers

#### `move_to_old_issues`
**Table:** issues  
**Event:** AFTER UPDATE  
**Function:** archive_returned_issue()  
**Purpose:** Archives completed checkouts to old_issues table

#### `set_item_onloan`
**Table:** issues  
**Event:** AFTER INSERT  
**Function:** update_item_on_checkout()  
**Purpose:** Updates item status when checked out

#### `calculate_overdue_fine`
**Table:** issues  
**Event:** AFTER UPDATE  
**Function:** create_overdue_fine()  
**Purpose:** Creates fine entries for overdue returns

#### `enforce_renewal_limit`
**Table:** issues  
**Event:** BEFORE UPDATE  
**Function:** check_renewal_limit()  
**Purpose:** Prevents excessive renewals

#### `increment_renewal_count`
**Table:** issues  
**Event:** BEFORE UPDATE  
**Function:** track_renewal()  
**Purpose:** Tracks renewal statistics

#### `prevent_checkout_if_reserved`
**Table:** issues  
**Event:** BEFORE INSERT  
**Function:** check_item_not_reserved()  
**Purpose:** Enforces hold queue priority

#### `enforce_checkout_limit`
**Table:** issues  
**Event:** BEFORE INSERT  
**Function:** check_checkout_limit()  
**Purpose:** Prevents exceeding patron checkout limits

#### `auto_set_due_date`
**Table:** issues  
**Event:** BEFORE INSERT  
**Function:** auto_fill_due_date()  
**Purpose:** Automatically calculates due dates

---

### Item Management Triggers

#### `track_status_change`
**Table:** items  
**Event:** BEFORE UPDATE  
**Function:** sync_item_status()  
**Purpose:** Timestamps status changes

#### `notify_reserve_on_return`
**Table:** items  
**Event:** AFTER UPDATE  
**Condition:** WHEN (NEW.status IS DISTINCT FROM OLD.status)  
**Function:** notify_next_reserve()  
**Purpose:** Notifies patrons when held items become available

---

## Extensions

### `uuid-ossp`
**Purpose:** Provides UUID generation functions  
**Usage:** Enables generation of universally unique identifiers for distributed systems

### `pgcrypto`
**Purpose:** Cryptographic functions  
**Usage:** Supports password hashing and encryption for secure authentication

### `pg_trgm`
**Purpose:** Trigram matching for similarity searches  
**Usage:** Enables fuzzy/partial text search on title and author fields for improved search results

---

## Statistics

### `items_biblio_stats`
**Columns:** biblionumber, status  
**Purpose:** Extended statistics for query optimization on items table  
**Benefit:** Improves query planning for common joins between items and biblio

### `issues_patron_stats`
**Columns:** borrowernumber, date_due  
**Purpose:** Extended statistics for query optimization on issues table  
**Benefit:** Improves performance of patron checkout and overdue queries

### `reserves_patron_biblio_stats`
**Columns:** borrowernumber, biblionumber  
**Purpose:** Extended statistics for query optimization on reserves table  
**Benefit:** Improves performance of hold queue and availability queries

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Tables** | 12 |
| **Views** | 4 |
| **Indexes** | 47 |
| **Functions** | 18 |
| **Triggers** | 13 |
| **Extensions** | 3 |
| **Statistics** | 3 |
| **Total Objects** | **100** |

---

## Key Features

### Automation
- ✅ Automatic fine calculation on overdue returns
- ✅ Automatic archival of completed transactions
- ✅ Automatic due date calculation
- ✅ Automatic hold queue notification
- ✅ Automatic renewal tracking
- ✅ Automatic timestamp maintenance

### Data Integrity
- ✅ Foreign key constraints with appropriate cascade rules
- ✅ Check constraints for data validation
- ✅ Unique constraints on critical identifiers
- ✅ Trigger-based business rule enforcement
- ✅ Row-level locking to prevent race conditions

### Performance
- ✅ Strategic indexing on frequently queried fields
- ✅ Partial indexes to reduce index size
- ✅ Full-text search indexes for catalog searches
- ✅ Trigram indexes for fuzzy matching
- ✅ Extended statistics for complex query optimization
- ✅ Pre-analyzed tables for optimal query plans

### Security
- ✅ Comprehensive audit logging with JSONB data snapshots
- ✅ Password hashing support via pgcrypto
- ✅ IP address and user agent tracking
- ✅ Soft deletes with SET NULL for historical preservation

### Reporting
- ✅ Pre-built views for common operational queries
- ✅ Aggregated patron account summaries
- ✅ Popular items analytics
- ✅ Overdue tracking with calculated fields

---

## Schema Simplifications (vs. Original Koha)

**Removed Complexity:**
- ❌ Multi-branch/library operations (single branch only)
- ❌ 80+ unnecessary columns across tables
- ❌ 4 redundant tables (branches, biblioitems, collection_codes, authorised_values)
- ❌ Excessive name/address field variants
- ❌ Over-cataloging fields
- ❌ Multiple status tracking fields (consolidated to single status)

**Retained Features:**
- ✅ Complete circulation management
- ✅ Hold/reserve queue system
- ✅ Fine and fee tracking
- ✅ Patron management
- ✅ Catalog management
- ✅ Automated business logic
- ✅ Performance optimization
- ✅ Audit trail
