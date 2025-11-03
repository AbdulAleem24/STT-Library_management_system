# Database Normalization & 4NF Explained

## 📖 What is Database Normalization?

**Database normalization** is the process of organizing data to:
1. **Eliminate redundancy** (don't store the same data in multiple places)
2. **Ensure data integrity** (prevent inconsistent data)
3. **Minimize update anomalies** (avoid problems when updating data)

Think of it like organizing a library:
- ❌ **Bad**: Write the author's biography on every copy of every book
- ✅ **Good**: Store author information once, reference it from books

---

## 🎯 What is 4NF (Fourth Normal Form)?

**Fourth Normal Form (4NF)** is a high level of database normalization that eliminates **multi-valued dependencies**.

### Normal Form Progression

| Form | Eliminates | Example Problem |
|------|------------|-----------------|
| **1NF** | Repeating groups | Storing multiple phone numbers in one column: "555-1234, 555-5678" |
| **2NF** | Partial dependencies | Order details storing customer address (depends on customer, not order line) |
| **3NF** | Transitive dependencies | Storing both city and state, when state can be derived from zip code |
| **BCNF** | Special dependency cases | Rare edge cases in 3NF |
| **4NF** | Multi-valued dependencies | One entity with two independent multi-valued attributes |

---

## 🔍 4NF in Detail

### What is a Multi-Valued Dependency?

A **multi-valued dependency** exists when:
1. One attribute determines **multiple independent sets** of values
2. Those sets have no relationship to each other

### Example of 4NF Violation

**❌ BAD DESIGN** (Not 4NF):
```
Employee Table:
┌────────────┬───────────────┬─────────────────┐
│ EmployeeID │ Skill         │ Language        │
├────────────┼───────────────┼─────────────────┤
│ 1          │ SQL           │ English         │
│ 1          │ SQL           │ Spanish         │
│ 1          │ Python        │ English         │
│ 1          │ Python        │ Spanish         │
│ 2          │ Java          │ French          │
│ 2          │ Java          │ German          │
│ 2          │ JavaScript    │ French          │
│ 2          │ JavaScript    │ German          │
└────────────┴───────────────┴─────────────────┘
```

**Problem**: Skills and Languages are independent! Employee 1 speaks 2 languages and has 2 skills, creating 2×2=4 rows. This causes:
- **Redundancy**: Data repeated unnecessarily
- **Update anomalies**: Adding a language requires adding rows for each skill
- **Insertion anomalies**: Can't add a language without adding a skill

**✅ GOOD DESIGN** (4NF Compliant):
```
EmployeeSkills Table:          EmployeeLanguages Table:
┌────────────┬───────────┐    ┌────────────┬──────────┐
│ EmployeeID │ Skill     │    │ EmployeeID │ Language │
├────────────┼───────────┤    ├────────────┼──────────┤
│ 1          │ SQL       │    │ 1          │ English  │
│ 1          │ Python    │    │ 1          │ Spanish  │
│ 2          │ Java      │    │ 2          │ French   │
│ 2          │ JavaScript│    │ 2          │ German   │
└────────────┴───────────┘    └────────────┴──────────┘
```

**Solution**: Separate independent multi-valued attributes into different tables.

---

## ✅ How Our Library Schema Achieves 4NF

### 1. **No Multi-Valued Dependencies**

Each table represents **one entity** with **single-valued attributes** or properly separated multi-valued attributes.

#### Example: Books and Authors
```
❌ BAD (Violates 1NF):
biblio table with authors column: "F. Scott Fitzgerald, John Doe, Jane Smith"

✅ GOOD (Our Design):
biblio table:
- biblionumber: 1
- title: "The Great Gatsby"
- author: "F. Scott Fitzgerald"  -- Single main author

-- If we needed multiple authors, we'd create:
biblio_authors table:
- biblionumber (FK)
- author_name
- author_role (primary, secondary, editor)
```

### 2. **Separate Tables for Independent Entities**

Our schema properly separates:

**Bibliographic vs Physical Items**:
- `biblio` = Abstract work (the idea of "The Great Gatsby")
- `items` = Physical copies (Copy #1, Copy #2, Copy #3)
- **No multi-valued dependency**: One biblio can have many items (one-to-many, not multi-valued)

**Active vs Historical Data**:
- `issues` = Current checkouts
- `old_issues` = Completed checkouts
- **No multi-valued dependency**: Separate lifecycle stages, not independent attributes

**Patrons vs Transactions**:
- `borrowers` = Person identity
- `issues` = Borrowing transactions
- `accountlines` = Financial transactions
- **No multi-valued dependency**: Each transaction references one patron (one-to-many)

### 3. **JSONB for Truly Independent Attributes**

The `address` field in `borrowers` uses JSONB:
```json
{
  "street": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipcode": "62701"
}
```

This is **4NF compliant** because:
- Address components are **dependent** on each other (city, state, zip are related)
- JSONB is a **single column** (not multiple independent columns)
- If we needed multiple addresses (work, home), we'd create a separate `addresses` table

---

## 🔗 Complete Relationship Map

### Entity Relationship Diagram

```
                          ┌──────────────┐
                          │  categories  │
                          │ (categorycode)│
                          └──────┬───────┘
                                 │ 1
                                 │
                                 │ M
                          ┌──────▼───────┐
                ┌─────────┤  borrowers   │
                │         │(borrowernumber)
                │         └──────┬───────┘
                │                │
                │ M         M ┌──┘
                │             │
         ┌──────▼──────┐  ┌──▼──────────┐
         │   issues    │  │  reserves   │
         │  (issue_id) │  │(reserve_id) │
         └──────┬──────┘  └──────┬──────┘
                │ 1              │ M
                │                │
                │ 1              │ 1
         ┌──────▼──────┐  ┌──────▼──────┐
         │    items    ├──┤    biblio   │
         │(itemnumber) │  │(biblionumber)│
         └──────┬──────┘  └──────┬──────┘
                │ M              │ M
                └────────┬───────┘
                         │ 1
                  ┌──────▼─────┐
                  │  itemtypes │
                  │ (itemtype) │
                  └────────────┘
```

---

## 🔑 Foreign Key Relationships

### Complete FK Inventory

#### **1. Reference Data FKs**
```sql
-- Borrowers categorized by type
borrowers.categorycode → categories.categorycode
  Purpose: Enforce valid patron categories
  Cascade: RESTRICT (can't delete category in use)

-- Biblio typed by material format
biblio.itemtype → itemtypes.itemtype
  Purpose: Categorize materials (book, DVD, etc.)
  Cascade: RESTRICT (can't delete type in use)
```

#### **2. Bibliographic FKs**
```sql
-- Items are copies of biblio records
items.biblionumber → biblio.biblionumber
  Purpose: Link physical items to catalog records
  Cascade: CASCADE (delete items if biblio deleted)
```

#### **3. Circulation FKs**
```sql
-- Active checkouts
issues.borrowernumber → borrowers.borrowernumber
  Purpose: Who has the item
  Cascade: RESTRICT (can't delete patron with active checkouts)

issues.itemnumber → items.itemnumber
  Purpose: Which item is checked out
  Cascade: RESTRICT (can't delete checked-out item)

-- Historical checkouts
old_issues.borrowernumber → borrowers.borrowernumber
  Purpose: Preserve history
  Cascade: SET NULL (keep record even if patron deleted)

old_issues.itemnumber → items.itemnumber
  Purpose: Preserve history
  Cascade: SET NULL (keep record even if item deleted)
```

#### **4. Holds/Reserves FKs**
```sql
-- Active holds
reserves.borrowernumber → borrowers.borrowernumber
  Purpose: Who placed the hold
  Cascade: CASCADE (delete holds if patron deleted)

reserves.biblionumber → biblio.biblionumber
  Purpose: Which work is requested
  Cascade: CASCADE (delete holds if biblio deleted)

reserves.itemnumber → items.itemnumber (OPTIONAL)
  Purpose: Specific item if requested
  Cascade: CASCADE

-- Historical holds
old_reserves.* → Similar to old_issues (all SET NULL)
```

#### **5. Financial FKs**
```sql
accountlines.borrowernumber → borrowers.borrowernumber
  Purpose: Patron's financial account
  Cascade: SET NULL (preserve financial records)

accountlines.itemnumber → items.itemnumber
  Purpose: Item that incurred fine
  Cascade: SET NULL (preserve record even if item deleted)

accountlines.manager_id → borrowers.borrowernumber
  Purpose: Staff member who processed transaction
  Cascade: SET NULL (keep record even if staff leaves)
```

#### **6. Audit FKs**
```sql
action_logs.changed_by → borrowers.borrowernumber
  Purpose: Track who made changes
  Cascade: SET NULL (preserve logs)
```

---

## 🔐 Referential Integrity Strategies

### CASCADE vs RESTRICT vs SET NULL

#### **CASCADE** - "Take them with you"
```sql
items.biblionumber → biblio.biblionumber ON DELETE CASCADE
```
**When**: Child records are meaningless without parent
**Example**: If you delete "The Great Gatsby" biblio record, delete all its physical copies too

#### **RESTRICT** - "Can't delete while in use"
```sql
issues.itemnumber → items.itemnumber ON DELETE RESTRICT
```
**When**: Deletion would cause operational problems
**Example**: Can't delete an item that's currently checked out

#### **SET NULL** - "Keep the record, forget the reference"
```sql
old_issues.borrowernumber → borrowers.borrowernumber ON DELETE SET NULL
```
**When**: Historical data must be preserved
**Example**: If patron account deleted, keep their checkout history but clear the patron link

---

## 🎯 Normalization Benefits in Our Schema

### 1. **No Data Redundancy**
```sql
-- ✅ GOOD: Author stored once per book
biblio:
- biblionumber: 1, title: "The Great Gatsby", author: "F. Scott Fitzgerald"

items:
- itemnumber: 1, biblionumber: 1  -- References author via biblio
- itemnumber: 2, biblionumber: 1  -- References author via biblio
- itemnumber: 3, biblionumber: 1  -- References author via biblio

-- ❌ BAD: Would be storing "F. Scott Fitzgerald" 3 times
```

### 2. **Update Anomalies Prevented**
```sql
-- ✅ GOOD: Change author once
UPDATE biblio SET author = 'Francis Scott Fitzgerald' WHERE biblionumber = 1;
-- All 3 items automatically reflect the change

-- ❌ BAD: Would need to update 3 item records
-- Risk of inconsistency if you miss one
```

### 3. **Insertion Anomalies Prevented**
```sql
-- ✅ GOOD: Can add a biblio without items
INSERT INTO biblio (title, author) VALUES ('New Book', 'New Author');
-- Add items later when they arrive

-- ❌ BAD: If author was in items table, you'd need an item to add an author
```

### 4. **Deletion Anomalies Prevented**
```sql
-- ✅ GOOD: Can delete last item without losing biblio info
DELETE FROM items WHERE itemnumber = 3;
-- Book info still exists in biblio

-- ❌ BAD: If biblio data was in items, deleting last copy loses all book info
```

---

## 📊 Dependency Diagram

### Functional Dependencies (what determines what)

```
categories.categorycode → {description, category_type, max_checkout_count, loan_period_days}
itemtypes.itemtype → {description, rentalcharge, defaultreplacecost, notforloan}

biblio.biblionumber → {title, subtitle, author, isbn, publisher, ...}
items.itemnumber → {biblionumber, barcode, location, status, ...}
items.biblionumber → biblio.* (via FK)

borrowers.borrowernumber → {cardnumber, full_name, email, categorycode, ...}
borrowers.categorycode → categories.* (via FK)

issues.issue_id → {borrowernumber, itemnumber, issuedate, date_due, ...}
issues.borrowernumber → borrowers.* (via FK)
issues.itemnumber → items.* (via FK)

reserves.reserve_id → {borrowernumber, biblionumber, priority, found, ...}

accountlines.accountlines_id → {borrowernumber, amount, accounttype, ...}
```

### No Circular Dependencies ✅
- Clean, directed dependency graph
- No tables that depend on themselves
- No circular reference chains

---

## 🧪 Testing Normalization

### How to Verify 4NF Compliance

#### Test 1: Can we store independent multi-valued facts separately?
```sql
-- ✅ PASS: Patron can have multiple checkouts (separate rows)
SELECT * FROM issues WHERE borrowernumber = 1;

-- ✅ PASS: Patron can have multiple holds (separate rows)
SELECT * FROM reserves WHERE borrowernumber = 1;

-- ✅ PASS: Checkouts and holds are independent (separate tables)
```

#### Test 2: Does updating one fact require updating others?
```sql
-- ✅ PASS: Adding a hold doesn't affect checkouts
INSERT INTO reserves (borrowernumber, biblionumber) VALUES (1, 5);

-- ✅ PASS: Returning a book doesn't affect other checkouts
UPDATE issues SET returndate = NOW() WHERE issue_id = 1;
```

#### Test 3: Are there any repeating groups?
```sql
-- ✅ PASS: No comma-separated values
-- ✅ PASS: No array columns for business data
-- ✅ PASS: Each cell contains single atomic value
```

#### Test 4: Can we lose data by deleting a row?
```sql
-- ✅ PASS: Deleting last item doesn't lose biblio info
DELETE FROM items WHERE biblionumber = 1;
-- biblio record still exists

-- ✅ PASS: Deleting patron doesn't lose historical checkouts
DELETE FROM borrowers WHERE borrowernumber = 1;
-- old_issues records preserved (borrowernumber SET NULL)
```

---

## 🎓 Normal Form Checklist

| Normal Form | Requirement | Our Schema Status |
|-------------|-------------|-------------------|
| **1NF** | Atomic values, no repeating groups | ✅ COMPLIANT |
| **2NF** | No partial dependencies (all non-key attributes fully depend on primary key) | ✅ COMPLIANT |
| **3NF** | No transitive dependencies (non-key attributes don't depend on other non-key attributes) | ✅ COMPLIANT |
| **BCNF** | Every determinant is a candidate key | ✅ COMPLIANT |
| **4NF** | No multi-valued dependencies | ✅ COMPLIANT |

---

## 🚀 Real-World 4NF Example from Our Schema

### Scenario: Patron with Multiple Contacts

**❌ WRONG WAY** (Violates 4NF):
```sql
CREATE TABLE borrowers_bad (
    borrowernumber INTEGER,
    full_name TEXT,
    email1 TEXT,
    email2 TEXT,
    email3 TEXT,
    phone1 TEXT,
    phone2 TEXT,
    phone3 TEXT
);

-- Problems:
-- 1. Limited to 3 of each (what if they have 4 emails?)
-- 2. Sparse data (most people don't have 3 emails)
-- 3. Hard to query "all contact methods"
```

**✅ RIGHT WAY** (4NF Compliant):
```sql
-- Main patron info
CREATE TABLE borrowers (
    borrowernumber INTEGER PRIMARY KEY,
    full_name TEXT,
    -- Single primary contact
    email TEXT,
    phone TEXT
);

-- Additional contacts if needed (currently not implemented, but would be)
CREATE TABLE patron_contacts (
    contact_id INTEGER PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers,
    contact_type TEXT,  -- 'email', 'phone', 'mobile'
    contact_value TEXT,
    is_primary BOOLEAN,
    UNIQUE(borrowernumber, contact_type, contact_value)
);
```

**Why Better**:
- No multi-valued dependency (each contact independent)
- No limit on number of contacts
- Easy to add/remove contacts
- Efficient storage (no empty columns)

---

## 📝 Summary

### Key Takeaways

1. **4NF eliminates multi-valued dependencies** - Independent attributes are stored in separate tables

2. **Our schema is 4NF compliant** - No violations detected

3. **Benefits achieved**:
   - ✅ No redundant data
   - ✅ No update anomalies
   - ✅ No insertion anomalies
   - ✅ No deletion anomalies
   - ✅ Clean referential integrity
   - ✅ Maintainable structure

4. **Proper FK cascades** ensure data integrity:
   - CASCADE for dependent data
   - RESTRICT for operational constraints
   - SET NULL for historical preservation

5. **One-to-many relationships** are properly implemented:
   - One biblio → Many items
   - One borrower → Many issues
   - One borrower → Many reserves

This normalization level provides a **solid foundation** for a **reliable, maintainable, and performant** library management system.
