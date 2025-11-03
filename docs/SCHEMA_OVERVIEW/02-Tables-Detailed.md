# Complete Database Tables Documentation

This document provides **exhaustive documentation** for every table, every column, and every constraint in the library management system.

---

## 📑 Table of Contents

1. [Reference/Lookup Tables](#reference-tables)
   - categories
   - itemtypes
2. [Bibliographic Tables](#bibliographic-tables)
   - biblio
   - items
3. [Patron Tables](#patron-tables)
   - borrowers
4. [Circulation Tables](#circulation-tables)
   - issues
   - old_issues
5. [Holds/Reserves Tables](#holds-tables)
   - reserves
   - old_reserves
6. [Financial Tables](#financial-tables)
   - accountlines
7. [System Tables](#system-tables)
   - systempreferences
   - action_logs

---

## 🏷️ Reference Tables

### Table: `categories`

**Purpose**: Defines patron categories (membership types) with their circulation rules.

**Primary Key**: `categorycode`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `categorycode` | VARCHAR(10) | NO | - | Unique identifier for category (e.g., 'ADULT', 'CHILD') |
| `description` | TEXT | NO | - | Human-readable description of the category |
| `category_type` | VARCHAR(1) | NO | 'A' | Type code: 'A'=Adult, 'C'=Child, 'S'=Staff |
| `max_checkout_count` | INTEGER | YES | 5 | Maximum items this category can checkout simultaneously |
| `loan_period_days` | INTEGER | YES | 14 | Default loan period in days for this category |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |

**Constraints**:
- `CHECK (category_type IN ('A', 'C', 'S'))` - Only valid types allowed
- `CHECK (max_checkout_count > 0)` - Must allow at least 1 checkout
- `CHECK (loan_period_days > 0)` - Loan period must be positive

**Indexes**: Primary key (categorycode)

**Sample Data**:
```sql
'ADULT'  | 'Adult Member'     | 'A' | 5  | 14 days
'CHILD'  | 'Child Member'     | 'C' | 3  | 7 days
'STAFF'  | 'Library Staff'    | 'S' | 20 | 30 days
```

**Business Rules**:
- Staff members get extended privileges (more items, longer periods)
- Children have reduced limits for age-appropriateness
- These rules are enforced automatically during checkout

---

### Table: `itemtypes`

**Purpose**: Defines types of library materials with associated fees and policies.

**Primary Key**: `itemtype`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `itemtype` | VARCHAR(10) | NO | - | Unique identifier (e.g., 'BOOK', 'DVD') |
| `description` | VARCHAR(255) | NO | - | Full description of the item type |
| `rentalcharge` | DECIMAL(10,2) | YES | 0.00 | Fee charged for borrowing this type |
| `defaultreplacecost` | DECIMAL(10,2) | YES | 0.00 | Default cost if item is lost/damaged |
| `notforloan` | BOOLEAN | YES | false | If true, items of this type cannot be loaned |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |

**Constraints**:
- `CHECK (rentalcharge >= 0)` - No negative rental fees
- `CHECK (defaultreplacecost >= 0)` - No negative costs

**Indexes**: Primary key (itemtype)

**Sample Data**:
```sql
'BOOK'     | 'Book'          | 0.00 | 25.00 | false
'DVD'      | 'DVD'           | 2.00 | 20.00 | false
'MAGAZINE' | 'Magazine'      | 0.00 | 5.00  | false
'AUDIO'    | 'Audio Book'    | 1.00 | 15.00 | false
```

**Usage**:
- Referenced by `biblio` and `items` tables
- Rental charges applied at checkout
- Replacement costs charged if item declared lost

---

## 📚 Bibliographic Tables

### Table: `biblio`

**Purpose**: Main bibliographic records - represents a "work" or "title" (not physical copies).

**Primary Key**: `biblionumber` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `biblionumber` | SERIAL | NO | auto | Unique identifier for this bibliographic record |
| `title` | TEXT | NO | - | Main title of the work |
| `subtitle` | TEXT | YES | - | Subtitle or additional title information |
| `author` | TEXT | YES | - | Primary author(s) |
| `isbn` | VARCHAR(30) | YES | - | International Standard Book Number |
| `publisher` | TEXT | YES | - | Publisher name |
| `publicationyear` | INTEGER | YES | - | Year published |
| `itemtype` | VARCHAR(10) | YES | - | Type of material (FK to itemtypes) |
| `notes` | TEXT | YES | - | Internal cataloging notes |
| `abstract` | TEXT | YES | - | Summary/description of content |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Foreign Keys**:
- `itemtype` → `itemtypes(itemtype)`

**Constraints**:
- `CHECK (isbn IS NULL OR isbn ~ '^[0-9X-]{10,17}$')` - Valid ISBN format (ISBN-10 or ISBN-13)
- `CHECK (publicationyear IS NULL OR (publicationyear >= 1000 AND publicationyear <= EXTRACT(YEAR FROM CURRENT_DATE) + 1))` - Reasonable year range

**Indexes**:
- `idx_biblio_title` - GIN index for full-text search on title
- `idx_biblio_title_trgm` - GiST trigram index for fuzzy title search
- `idx_biblio_author_trgm` - GiST trigram index for fuzzy author search
- `idx_biblio_isbn` - B-tree index on ISBN (partial index, only non-null)
- `idx_biblio_itemtype` - B-tree index on itemtype

**Triggers**:
- `update_biblio_timestamp` - Auto-updates `updated_at` on modifications

**One-to-Many Relationships**:
- One biblio → Many items (physical copies)
- One biblio → Many reserves (patron holds)

**Example**:
```sql
biblionumber: 1
title: "The Great Gatsby"
author: "F. Scott Fitzgerald"
isbn: "978-0-7432-7356-5"
publicationyear: 1925
itemtype: "BOOK"

-- This biblio might have 3 physical copies (3 records in 'items' table)
```

---

### Table: `items`

**Purpose**: Physical copies/instances of bibliographic records. Each item is a specific copy that can be checked out.

**Primary Key**: `itemnumber` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `itemnumber` | SERIAL | NO | auto | Unique identifier for this physical item |
| `biblionumber` | INTEGER | NO | - | Which biblio record this is a copy of (FK) |
| `barcode` | VARCHAR(20) | NO | - | Scannable barcode (must be unique) |
| `itemcallnumber` | VARCHAR(255) | YES | - | Shelving location code (e.g., "FIC FIT") |
| `location` | VARCHAR(80) | YES | - | Physical location (e.g., "Main Floor", "Children's Section") |
| `price` | DECIMAL(10,2) | YES | - | Purchase price of this item |
| `replacementprice` | DECIMAL(10,2) | YES | - | Cost to replace if lost (overrides itemtype default) |
| `status` | VARCHAR(20) | YES | 'available' | Current status of the item |
| `status_date` | TIMESTAMP WITH TIME ZONE | YES | - | When status last changed |
| `notforloan` | BOOLEAN | YES | false | If true, this specific item cannot be loaned |
| `issues` | INTEGER | YES | 0 | Total times this item has been checked out |
| `renewals` | INTEGER | YES | 0 | Total times this item has been renewed |
| `reserves` | INTEGER | YES | 0 | Total times this item has been placed on hold |
| `onloan` | DATE | YES | - | Due date if currently checked out (NULL if available) |
| `datelastborrowed` | DATE | YES | - | Date of most recent checkout |
| `datelastseen` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Last time item was scanned/handled |
| `notes` | TEXT | YES | - | Notes about this specific copy |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Foreign Keys**:
- `biblionumber` → `biblio(biblionumber)` ON DELETE CASCADE

**Constraints**:
- `UNIQUE(barcode)` - Each barcode must be unique
- `CHECK (status IN ('available', 'checked_out', 'lost', 'damaged', 'withdrawn'))` - Only valid statuses
- `CHECK (price IS NULL OR price >= 0)` - No negative prices
- `CHECK (replacementprice IS NULL OR replacementprice >= 0)` - No negative costs
- `CHECK (issues >= 0)` - Counters cannot be negative
- `CHECK (renewals >= 0)`
- `CHECK (reserves >= 0)`

**Indexes**:
- `idx_items_bibnum` - Items by biblio record
- `idx_items_barcode` - Fast barcode lookup
- `idx_items_status` - Filter by availability status
- `idx_items_onloan` - Find checked-out items (partial index, only non-null)
- `idx_items_itemcallnumber` - Sort by call number

**Triggers**:
- `update_items_timestamp` - Auto-updates `updated_at`
- `track_status_change` - Auto-updates `status_date` when status changes
- `notify_reserve_on_return` - Alerts next patron in hold queue when item becomes available

**Status Values Explained**:
- `available` - Ready to be checked out
- `checked_out` - Currently on loan to a patron
- `lost` - Item has been declared lost
- `damaged` - Item is damaged and needs repair
- `withdrawn` - Item removed from circulation permanently

**Example**:
```sql
-- Three copies of "The Great Gatsby"
itemnumber: 1, biblionumber: 1, barcode: "30001000001", status: "available"
itemnumber: 2, biblionumber: 1, barcode: "30001000002", status: "checked_out"
itemnumber: 3, biblionumber: 1, barcode: "30001000003", status: "damaged"
```

---

## 👥 Patron Tables

### Table: `borrowers`

**Purpose**: Library patrons/members who can borrow materials. Streamlined design with essential fields only.

**Primary Key**: `borrowernumber` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `borrowernumber` | SERIAL | NO | auto | Unique identifier for this patron |
| `cardnumber` | VARCHAR(32) | NO | - | Library card number (unique, scannable) |
| `full_name` | VARCHAR(255) | NO | - | Patron's complete legal name |
| `preferred_name` | VARCHAR(255) | YES | - | Name patron prefers to be called |
| `dateofbirth` | DATE | YES | - | Date of birth (for age verification) |
| `email` | VARCHAR(255) | YES | - | Email address for notifications |
| `phone` | VARCHAR(50) | YES | - | Phone number |
| `address` | JSONB | YES | - | Flexible address structure |
| `categorycode` | VARCHAR(10) | NO | - | Patron category (FK to categories) |
| `dateenrolled` | DATE | YES | CURRENT_DATE | Date patron joined library |
| `dateexpiry` | DATE | YES | - | Membership expiration date |
| `debarred` | DATE | YES | - | Restricted until this date (NULL = not restricted) |
| `debarred_comment` | TEXT | YES | - | Reason for restriction |
| `userid` | VARCHAR(75) | YES | - | Username for online access (unique) |
| `password` | VARCHAR(255) | YES | - | Hashed password for authentication |
| `staff_notes` | TEXT | YES | - | Internal staff comments about patron |
| `lastseen` | TIMESTAMP WITH TIME ZONE | YES | - | Last activity/interaction timestamp |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Foreign Keys**:
- `categorycode` → `categories(categorycode)`

**Constraints**:
- `UNIQUE(cardnumber)` - Each card number unique
- `UNIQUE(userid)` - Each username unique (if provided)
- `CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')` - Valid email format
- `CHECK (dateofbirth IS NULL OR dateofbirth <= CURRENT_DATE)` - Can't be born in future
- `CHECK (dateexpiry IS NULL OR dateenrolled IS NULL OR dateexpiry >= dateenrolled)` - Expiry after enrollment
- `CHECK (phone IS NULL OR phone ~ '^[0-9+\-() ]{7,20}$')` - Valid phone format

**Indexes**:
- `idx_borrowers_full_name` - Name searches
- `idx_borrowers_cardnumber` - Card lookup
- `idx_borrowers_userid` - Login lookups (partial index)
- `idx_borrowers_email` - Email lookups
- `idx_borrowers_categorycode` - Category filtering
- `idx_borrowers_dateexpiry` - Find expiring memberships
- `idx_borrowers_debarred` - Find restricted patrons (partial index)

**Triggers**:
- `update_borrowers_timestamp` - Auto-updates `updated_at`

**Address JSONB Structure**:
```json
{
  "street": "123 Main Street",
  "city": "Springfield",
  "state": "IL",
  "zipcode": "62701",
  "country": "USA"
}
```

**Why JSONB for Address?**
- Flexible: No need to add columns for international addresses
- Queryable: Can still search within JSON fields
- Space-efficient: NULL fields don't take space
- Future-proof: Easy to add fields without schema changes

**Debarred Status**:
- `NULL` = Not restricted, can checkout normally
- `Future date` = Restricted until that date
- `Past date` = Restriction expired, can checkout again

**Example**:
```sql
borrowernumber: 1
cardnumber: "LIB000001"
full_name: "John Smith"
email: "john@example.com"
categorycode: "ADULT"
dateenrolled: 2024-01-15
dateexpiry: 2025-01-15
debarred: NULL  -- Not restricted
```

---

## 🔄 Circulation Tables

### Table: `issues`

**Purpose**: Active checkouts - items currently on loan to patrons. This is a **hot table** (frequently updated).

**Primary Key**: `issue_id` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `issue_id` | SERIAL | NO | auto | Unique identifier for this checkout |
| `borrowernumber` | INTEGER | NO | - | Who borrowed the item (FK) |
| `itemnumber` | INTEGER | NO | - | Which item was borrowed (FK) |
| `issuedate` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | When item was checked out |
| `date_due` | TIMESTAMP WITH TIME ZONE | NO | - | When item must be returned |
| `returndate` | TIMESTAMP WITH TIME ZONE | YES | - | When item was actually returned (NULL = still out) |
| `lastreneweddate` | TIMESTAMP WITH TIME ZONE | YES | - | Most recent renewal timestamp |
| `renewals_count` | INTEGER | YES | 0 | Number of times renewed |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |

**Foreign Keys**:
- `borrowernumber` → `borrowers(borrowernumber)` ON DELETE RESTRICT (can't delete patron with active checkouts)
- `itemnumber` → `items(itemnumber)` ON DELETE RESTRICT (can't delete item that's checked out)

**Constraints**:
- `UNIQUE(itemnumber)` - Each item can only be checked out to one patron at a time
- `CHECK (date_due >= issuedate)` - Due date must be after checkout date
- `CHECK (renewals_count >= 0)` - Renewal count cannot be negative

**Indexes**:
- `idx_issues_borrowernumber` - Find all checkouts by patron
- `idx_issues_itemnumber` - Find checkout record by item
- `idx_issues_date_due` - Sort/filter by due date
- `idx_issues_returndate` - Find unreturned items (partial index, WHERE returndate IS NULL)
- `idx_issues_issuedate` - Chronological sorting

**Triggers** (many!):
- `auto_set_due_date` - Calculates `date_due` if not provided
- `set_item_onloan` - Updates item status to 'checked_out'
- `check_checkout_limit` - Prevents checkout if patron at limit
- `prevent_checkout_if_reserved` - Blocks checkout if item held for someone else
- `check_renewal_limit` - Prevents renewal beyond max
- `increment_renewal_count` - Tracks renewals
- `move_to_old_issues` - Archives to old_issues when returned
- `calculate_overdue_fine` - Generates fine if returned late

**Lifecycle**:
```
1. INSERT into issues → Item checked out
2. UPDATE renewals/date_due → Item renewed
3. UPDATE returndate → Item returned → Moved to old_issues → Deleted from issues
```

**Key Field: returndate**:
- `NULL` = Item still out (active checkout)
- `NOT NULL` = Item returned (triggers archival process)

**Example**:
```sql
issue_id: 1
borrowernumber: 1
itemnumber: 2
issuedate: 2024-10-01 10:00:00
date_due: 2024-10-15 10:00:00
returndate: NULL  -- Still checked out
renewals_count: 0
```

---

### Table: `old_issues`

**Purpose**: Historical record of completed checkouts. Data is **moved here** from `issues` when items are returned.

**Primary Key**: `issue_id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `issue_id` | INTEGER | NO | - | Original issue_id from issues table |
| `borrowernumber` | INTEGER | YES | - | Who borrowed (FK, nullable for deleted patrons) |
| `itemnumber` | INTEGER | YES | - | Which item (FK, nullable for deleted items) |
| `issuedate` | TIMESTAMP WITH TIME ZONE | YES | - | When checked out |
| `date_due` | TIMESTAMP WITH TIME ZONE | NO | - | When it was due |
| `returndate` | TIMESTAMP WITH TIME ZONE | YES | - | When actually returned |
| `lastreneweddate` | TIMESTAMP WITH TIME ZONE | YES | - | Last renewal date |
| `renewals_count` | INTEGER | YES | 0 | Number of renewals |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | - | Original creation timestamp |

**Foreign Keys**:
- `borrowernumber` → `borrowers(borrowernumber)` ON DELETE SET NULL (preserve history even if patron deleted)
- `itemnumber` → `items(itemnumber)` ON DELETE SET NULL (preserve history even if item deleted)

**No Constraints**: Historical data, preserved as-is

**Indexes**:
- `idx_old_issues_borrowernumber` - Patron history lookup
- `idx_old_issues_itemnumber` - Item circulation history
- `idx_old_issues_returndate` - Chronological analysis
- `idx_old_issues_issuedate` - Circulation trends over time

**No Triggers**: Read-only historical archive

**Usage**:
- Statistical reports (circulation trends)
- Patron borrowing history
- Item usage statistics
- Compliance/audit requirements

**Data Retention**:
```sql
-- Example: Keep 3 years of history
DELETE FROM old_issues 
WHERE returndate < CURRENT_DATE - INTERVAL '3 years';
```

---

## 📌 Holds/Reserves Tables

### Table: `reserves`

**Purpose**: Active holds/requests - patrons waiting for items. Implements priority queue system.

**Primary Key**: `reserve_id` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `reserve_id` | SERIAL | NO | auto | Unique identifier for this hold |
| `borrowernumber` | INTEGER | NO | - | Who placed the hold (FK) |
| `biblionumber` | INTEGER | NO | - | Which work they want (FK) |
| `itemnumber` | INTEGER | YES | - | Specific item if targeting one copy (FK) |
| `reservedate` | DATE | NO | CURRENT_DATE | When hold was placed |
| `expirationdate` | DATE | YES | - | When hold expires if not fulfilled |
| `cancellationdate` | DATE | YES | - | When hold was cancelled (NULL = active) |
| `waitingdate` | DATE | YES | - | When item became available for pickup |
| `priority` | INTEGER | NO | 1 | Position in queue (1 = first in line) |
| `found` | VARCHAR(1) | YES | - | Status: 'W'=Waiting for pickup, 'T'=In transit, 'P'=Processing |
| `notes` | TEXT | YES | - | Notes about this hold |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation timestamp |

**Foreign Keys**:
- `borrowernumber` → `borrowers(borrowernumber)` ON DELETE CASCADE
- `biblionumber` → `biblio(biblionumber)` ON DELETE CASCADE
- `itemnumber` → `items(itemnumber)` ON DELETE CASCADE (optional)

**Constraints**:
- `CHECK (found IS NULL OR found IN ('W', 'T', 'P'))` - Only valid status codes

**Indexes**:
- `idx_reserves_borrowernumber` - Find patron's holds
- `idx_reserves_biblionumber` - Find all holds on a work
- `idx_reserves_itemnumber` - Holds on specific item (partial)
- `idx_reserves_priority` - Process holds in order
- `idx_reserves_found` - Filter by status (partial)
- `idx_reserves_cancellationdate` - Separate active from cancelled

**Found Status Values**:
- `NULL` = Hold active, waiting for item to become available
- `'W'` = Waiting for patron pickup (item ready at desk)
- `'T'` = In transit to patron's pickup location (multi-branch feature)
- `'P'` = Processing (staff preparing item for patron)

**Priority System**:
```
Priority 1 = First in queue
Priority 2 = Second in queue
Priority 3 = Third in queue
... etc
```

When an item is returned, the person with Priority 1 is notified. After they check out (or hold expires), everyone else's priority decrements.

**Hold on Biblio vs Item**:
- `biblionumber` + `itemnumber = NULL` = "Any copy of this book"
- `biblionumber` + `itemnumber = 123` = "This specific copy only"

**Example**:
```sql
-- Three patrons want "The Great Gatsby"
reserve_id: 1, borrowernumber: 5, biblionumber: 1, priority: 1, found: NULL  -- First in line
reserve_id: 2, borrowernumber: 8, biblionumber: 1, priority: 2, found: NULL  -- Second
reserve_id: 3, borrowernumber: 12, biblionumber: 1, priority: 3, found: NULL -- Third
```

**Hold Lifecycle**:
```
1. Patron places hold → found = NULL, priority assigned
2. Item returned → found = 'W', waitingdate set, patron notified
3. Patron picks up → Hold deleted or moved to old_reserves
4. OR Hold expires after 7 days → cancellationdate set
```

---

### Table: `old_reserves`

**Purpose**: Historical record of holds (fulfilled, cancelled, or expired).

**Primary Key**: `reserve_id`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `reserve_id` | INTEGER | NO | - | Original reserve_id |
| `borrowernumber` | INTEGER | YES | - | Who placed hold (nullable for deleted patrons) |
| `biblionumber` | INTEGER | YES | - | Which work (nullable for deleted biblio) |
| `itemnumber` | INTEGER | YES | - | Specific item if any |
| `reservedate` | DATE | YES | - | When placed |
| `expirationdate` | DATE | YES | - | When expired |
| `cancellationdate` | DATE | YES | - | When cancelled |
| `waitingdate` | DATE | YES | - | When became available |
| `priority` | INTEGER | YES | - | Original priority |
| `found` | VARCHAR(1) | YES | - | Final status |
| `notes` | TEXT | YES | - | Notes |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | - | Original timestamp |

**Foreign Keys**:
- All FKs nullable with ON DELETE SET NULL (preserve history)

**No Active Constraints**: Historical data

**Indexes**:
- `idx_old_reserves_borrowernumber` - Patron hold history
- `idx_old_reserves_biblionumber` - Item demand history

**Usage**:
- Analyze demand for popular titles
- Patron service history
- Calculate average wait times

---

## 💰 Financial Tables

### Table: `accountlines`

**Purpose**: Financial transactions - fines, fees, and payments. Handles all money-related patron interactions.

**Primary Key**: `accountlines_id` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `accountlines_id` | SERIAL | NO | auto | Unique transaction identifier |
| `borrowernumber` | INTEGER | YES | - | Which patron (FK, nullable for anonymous payments) |
| `itemnumber` | INTEGER | YES | - | Related item if applicable (FK) |
| `issue_id` | INTEGER | YES | - | Related checkout if applicable (no FK) |
| `date` | TIMESTAMP WITH TIME ZONE | NO | CURRENT_TIMESTAMP | Transaction date |
| `amount` | DECIMAL(10,2) | NO | 0.00 | Original amount charged |
| `amountoutstanding` | DECIMAL(10,2) | NO | 0.00 | Amount still owed |
| `description` | TEXT | YES | - | Human-readable description |
| `accounttype` | VARCHAR(50) | YES | - | Type of transaction |
| `payment_type` | VARCHAR(50) | YES | - | Payment method if payment |
| `status` | VARCHAR(20) | YES | - | Current status |
| `manager_id` | INTEGER | YES | - | Staff member who processed (FK to borrowers) |
| `note` | TEXT | YES | - | Additional notes |
| `created_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Record creation |

**Foreign Keys**:
- `borrowernumber` → `borrowers(borrowernumber)` ON DELETE SET NULL
- `itemnumber` → `items(itemnumber)` ON DELETE SET NULL
- `manager_id` → `borrowers(borrowernumber)` ON DELETE SET NULL
- NOTE: No FK on `issue_id` (may reference issues OR old_issues)

**Constraints**:
- `CHECK (amount >= 0)` - No negative charges
- `CHECK (amountoutstanding >= 0)` - Can't owe negative money

**Indexes**:
- `idx_accountlines_borrowernumber` - Find patron's account
- `idx_accountlines_itemnumber` - Charges by item
- `idx_accountlines_issue_id` - Charges by checkout
- `idx_accountlines_status` - Filter by status
- `idx_accountlines_amountoutstanding` - Find unpaid balances (partial, >0)

**Account Types**:
- `'FINE'` - Generic fine
- `'OVERDUE'` - Overdue fine (auto-generated)
- `'LOST_ITEM'` - Replacement charge for lost item
- `'DAMAGED'` - Repair/replacement for damaged item
- `'RENTAL'` - Rental fee for special items
- `'PAYMENT'` - Payment received (negative amountoutstanding)
- `'CREDIT'` - Credit/refund

**Status Values**:
- `'open'` - Unpaid, still owed
- `'paid'` - Fully paid
- `'forgiven'` - Waived by staff
- `'refunded'` - Money returned to patron

**Payment Types** (when accounttype='PAYMENT'):
- `'CASH'`
- `'CREDIT_CARD'`
- `'DEBIT_CARD'`
- `'CHECK'`
- `'ONLINE'`

**Double-Entry Example**:
```sql
-- Patron owes $5.00 fine
INSERT INTO accountlines (borrowernumber, amount, amountoutstanding, accounttype, status)
VALUES (1, 5.00, 5.00, 'OVERDUE', 'open');

-- Patron pays $5.00
INSERT INTO accountlines (borrowernumber, amount, amountoutstanding, accounttype, payment_type, status)
VALUES (1, -5.00, 0.00, 'PAYMENT', 'CASH', 'paid');

-- Update original fine
UPDATE accountlines 
SET amountoutstanding = 0, status = 'paid'
WHERE accountlines_id = [fine_id];
```

**Calculation Logic**:
- `amount` = Original charge (never changes)
- `amountoutstanding` = Current balance (updated when payments made)
- When `amountoutstanding` reaches 0, `status` = 'paid'

---

## ⚙️ System Tables

### Table: `systempreferences`

**Purpose**: System-wide configuration settings. Key-value store for operational parameters.

**Primary Key**: `variable`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `variable` | VARCHAR(50) | NO | - | Configuration key (unique) |
| `value` | TEXT | YES | - | Configuration value |
| `explanation` | TEXT | YES | - | What this setting controls |
| `type` | VARCHAR(20) | YES | - | Data type hint ('Currency', 'Integer', 'Boolean', etc.) |
| `updated_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | Last modified |

**No Foreign Keys**

**No Special Indexes** (small table, PK sufficient)

**Configured Values**:
```sql
'version'              | '2.0.0'  | 'Database schema version'
'max_fine_allowed'     | '5.00'   | 'Block checkouts if fines exceed this'
'fine_per_day'         | '0.25'   | 'Daily overdue fine rate'
'max_renewals'         | '3'      | 'Max renewals per checkout'
'hold_expiry_days'     | '7'      | 'Days to pickup before hold expires'
```

**Usage in Code**:
```sql
-- Get fine rate
SELECT value::DECIMAL FROM systempreferences WHERE variable = 'fine_per_day';

-- Update setting
UPDATE systempreferences SET value = '0.50' WHERE variable = 'fine_per_day';
```

**Benefits**:
- Change behavior without code changes
- Different libraries can customize rules
- Easy to manage via admin interface
- Audit trail of changes (updated_at)

---

### Table: `action_logs`

**Purpose**: Audit trail for critical operations. Tracks who changed what, when, and from where.

**Primary Key**: `log_id` (auto-increment)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `log_id` | BIGSERIAL | NO | auto | Unique log entry identifier |
| `table_name` | VARCHAR(50) | NO | - | Which table was modified |
| `action` | VARCHAR(10) | NO | - | Type of action: INSERT, UPDATE, DELETE |
| `record_id` | INTEGER | YES | - | Primary key of affected record |
| `old_data` | JSONB | YES | - | Record state before change |
| `new_data` | JSONB | YES | - | Record state after change |
| `changed_by` | INTEGER | YES | - | Staff member who made change (FK) |
| `changed_at` | TIMESTAMP WITH TIME ZONE | YES | CURRENT_TIMESTAMP | When change occurred |
| `ip_address` | INET | YES | - | IP address of client |
| `user_agent` | TEXT | YES | - | Browser/client information |

**Foreign Keys**:
- `changed_by` → `borrowers(borrowernumber)` ON DELETE SET NULL

**Constraints**:
- `CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))` - Only valid actions

**Indexes**:
- `idx_action_logs_table_action` - Filter by table and action type
- `idx_action_logs_timestamp` - Chronological queries
- `idx_action_logs_changed_by` - Audit by user
- `idx_action_logs_record_id` - Find all changes to specific record

**Example Log Entry**:
```json
{
  "log_id": 1,
  "table_name": "borrowers",
  "action": "UPDATE",
  "record_id": 5,
  "old_data": {"debarred": null},
  "new_data": {"debarred": "2024-12-31", "debarred_comment": "Multiple overdue items"},
  "changed_by": 1,
  "changed_at": "2024-10-09 14:30:00",
  "ip_address": "192.168.1.100"
}
```

**Use Cases**:
- Security auditing
- Compliance requirements
- Troubleshooting data issues
- Undoing accidental changes
- Staff accountability

**JSONB Benefits**:
- Flexible structure per table
- Can store full record or just changes
- Queryable with PostgreSQL JSON operators
- Efficient storage (compressed)

---

## 📊 Summary Statistics

| Category | Count |
|----------|-------|
| **Total Tables** | 13 |
| **Reference Tables** | 2 |
| **Core Tables** | 7 |
| **System Tables** | 2 |
| **Financial Tables** | 1 |
| **Audit Tables** | 1 |
| **Total Columns** | ~140 |
| **Foreign Keys** | 23 |
| **Check Constraints** | 35+ |
| **Unique Constraints** | 8 |

---

## 🔗 Relationship Summary

**One-to-Many Relationships**:
- categories → borrowers (1:M)
- itemtypes → biblio (1:M)
- biblio → items (1:M) - One book, many copies
- biblio → reserves (1:M)
- borrowers → issues (1:M) - One patron, many checkouts
- borrowers → reserves (1:M)
- borrowers → accountlines (1:M)
- items → issues (1:1) - One item, one active checkout

**Many-to-Many Relationships** (via junction tables):
- borrowers ↔ biblio (via reserves) - Patrons request books
- borrowers ↔ items (via issues) - Patrons borrow items

This comprehensive documentation covers every table in exhaustive detail. Each table is explained with purpose, structure, constraints, indexes, and usage examples.
