# Database Views & Reporting Documentation

This document explains all **database views** in the library management system, their purposes, and how they simplify reporting and queries.

---

## 📑 Table of Contents

1. [What Are Views?](#what-are-views)
2. [View Inventory](#view-inventory)
3. [Available Items View](#available-items-view)
4. [Overdue Items View](#overdue-items-view)
5. [Patron Account Summary View](#patron-account-summary-view)
6. [Popular Items View](#popular-items-view)
7. [Performance Considerations](#performance-considerations)
8. [Reporting Examples](#reporting-examples)

---

## 🎯 What Are Views?

### Definition

A **database view** is a virtual table based on a SQL query. It:
- Doesn't store data itself (just the query definition)
- Runs the underlying query when accessed
- Acts like a regular table for SELECT operations
- Simplifies complex queries

### Benefits

1. **Simplification** - Complex joins become simple SELECT statements
2. **Reusability** - Define once, use everywhere
3. **Security** - Expose only specific columns/rows
4. **Consistency** - Same logic everywhere
5. **Abstraction** - Hide schema complexity

### View vs Table

| Aspect | View | Table |
|--------|------|-------|
| **Data Storage** | None (virtual) | Physical storage |
| **Updates** | Limited/complex | Direct |
| **Performance** | Runs query each time | Direct access |
| **Space** | Minimal (just definition) | Depends on data |
| **Use Case** | Reporting, simplification | Data storage |

---

## 📊 View Inventory

Our schema includes **4 views** for common reporting needs:

| # | View Name | Purpose | Complexity |
|---|-----------|---------|------------|
| 1 | `available_items` | Items ready to checkout | Simple |
| 2 | `overdue_items` | Late returns with patron info | Medium |
| 3 | `patron_account_summary` | Complete patron status | Complex |
| 4 | `popular_items` | Most circulated materials | Complex |

---

## 📚 Available Items View

### Purpose
Show all items currently available for checkout with full bibliographic information.

### SQL Definition
```sql
CREATE OR REPLACE VIEW available_items AS
SELECT 
    i.itemnumber,
    i.barcode,
    i.location,
    i.itemcallnumber,
    b.biblionumber,
    b.title,
    b.subtitle,
    b.author,
    b.isbn,
    b.publisher,
    b.publicationyear,
    b.itemtype,
    i.status,
    i.notforloan
FROM items i
JOIN biblio b ON i.biblionumber = b.biblionumber
WHERE i.status = 'available'
  AND i.notforloan = false;
```

### What It Shows

| Column | Description |
|--------|-------------|
| `itemnumber` | Physical item ID |
| `barcode` | Scannable barcode |
| `location` | Where item is shelved |
| `itemcallnumber` | Call number (e.g., "FIC FIT") |
| `biblionumber` | Catalog record ID |
| `title` | Book title |
| `subtitle` | Subtitle if any |
| `author` | Author name |
| `isbn` | ISBN number |
| `publisher` | Publisher name |
| `publicationyear` | Publication year |
| `itemtype` | Material type (BOOK, DVD, etc.) |
| `status` | Always 'available' |
| `notforloan` | Always false |

### Filtering Logic
- ✅ `status = 'available'` - Not checked out, lost, or damaged
- ✅ `notforloan = false` - Allowed to circulate

### Usage Examples

```sql
-- 1. Count available items
SELECT COUNT(*) FROM available_items;

-- 2. Find available copies of a specific book
SELECT * FROM available_items WHERE biblionumber = 1;

-- 3. Available items by location
SELECT location, COUNT(*) as available_count
FROM available_items
GROUP BY location
ORDER BY available_count DESC;

-- 4. Available books by author
SELECT author, COUNT(*) as count
FROM available_items
WHERE itemtype = 'BOOK'
GROUP BY author
ORDER BY count DESC
LIMIT 10;

-- 5. Search available items
SELECT title, author, barcode, location
FROM available_items
WHERE title ILIKE '%gatsby%'
   OR author ILIKE '%fitzgerald%';
```

### Application Integration

**JavaScript (Supabase)**:
```javascript
// Get all available items
const { data, error } = await supabase
    .from('available_items')
    .select('*')
    .order('title');

// Search available by title
const { data, error } = await supabase
    .from('available_items')
    .select('*')
    .ilike('title', '%gatsby%');
```

**Python**:
```python
# Find available copies
cursor.execute("""
    SELECT title, author, barcode, location
    FROM available_items
    WHERE biblionumber = %s
""", (biblio_id,))
```

### Use Cases
- 📖 Public catalog browsing
- 🔍 Search results (show only checkable items)
- 📊 Availability reports
- 🏢 Staff inventory checks

---

## ⏰ Overdue Items View

### Purpose
Show all currently overdue checkouts with patron and item details for follow-up.

### SQL Definition
```sql
CREATE OR REPLACE VIEW overdue_items AS
SELECT 
    iss.issue_id,
    iss.borrowernumber,
    b.full_name,
    b.preferred_name,
    b.cardnumber,
    b.email,
    b.phone,
    iss.itemnumber,
    i.barcode,
    bib.title,
    bib.author,
    iss.issuedate,
    iss.date_due,
    CURRENT_DATE - iss.date_due::date as days_overdue,
    iss.renewals_count
FROM issues iss
JOIN borrowers b ON iss.borrowernumber = b.borrowernumber
JOIN items i ON iss.itemnumber = i.itemnumber
JOIN biblio bib ON i.biblionumber = bib.biblionumber
WHERE iss.date_due < CURRENT_TIMESTAMP
  AND iss.returndate IS NULL;
```

### What It Shows

| Column | Description |
|--------|-------------|
| `issue_id` | Checkout record ID |
| `borrowernumber` | Patron ID |
| `full_name` | Patron's full name |
| `preferred_name` | Patron's preferred name |
| `cardnumber` | Library card number |
| `email` | Contact email |
| `phone` | Contact phone |
| `itemnumber` | Item ID |
| `barcode` | Item barcode |
| `title` | Book title |
| `author` | Book author |
| `issuedate` | When checked out |
| `date_due` | When it was due |
| `days_overdue` | **Calculated**: How many days late |
| `renewals_count` | Times renewed |

### Filtering Logic
- ✅ `date_due < CURRENT_TIMESTAMP` - Past due date
- ✅ `returndate IS NULL` - Not yet returned

### Usage Examples

```sql
-- 1. Count overdue items
SELECT COUNT(*) FROM overdue_items;

-- 2. Overdue items sorted by severity
SELECT full_name, title, days_overdue, email
FROM overdue_items
ORDER BY days_overdue DESC;

-- 3. Patrons with multiple overdue items
SELECT 
    full_name,
    email,
    COUNT(*) as overdue_count,
    MAX(days_overdue) as worst_overdue
FROM overdue_items
GROUP BY full_name, email
HAVING COUNT(*) > 1
ORDER BY overdue_count DESC;

-- 4. Overdue by severity levels
SELECT 
    CASE 
        WHEN days_overdue <= 3 THEN 'Mild (1-3 days)'
        WHEN days_overdue <= 7 THEN 'Moderate (4-7 days)'
        WHEN days_overdue <= 14 THEN 'Serious (8-14 days)'
        ELSE 'Critical (>14 days)'
    END as severity,
    COUNT(*) as count
FROM overdue_items
GROUP BY severity
ORDER BY MIN(days_overdue);

-- 5. Generate reminder emails
SELECT 
    email,
    full_name,
    title,
    days_overdue
FROM overdue_items
WHERE days_overdue = 3  -- First reminder at 3 days
  AND email IS NOT NULL;
```

### Application Integration

**Email Notification Script (Python)**:
```python
# Send overdue notices
overdues = db.execute("""
    SELECT email, full_name, title, days_overdue
    FROM overdue_items
    WHERE days_overdue IN (3, 7, 14)  -- Reminder schedule
      AND email IS NOT NULL
""")

for item in overdues:
    send_email(
        to=item['email'],
        subject=f"Overdue Notice: {item['title']}",
        body=f"Dear {item['full_name']}, your item is {item['days_overdue']} days overdue..."
    )
```

**Dashboard Display (React)**:
```javascript
// Show overdue count
const { count } = await supabase
    .from('overdue_items')
    .select('*', { count: 'exact', head: true });

return <Badge color="red">{ count } Overdue</Badge>;
```

### Use Cases
- 📧 Automated reminder emails
- 📞 Staff contact lists
- 📊 Circulation statistics
- 🚨 Problem patron identification

---

## 👤 Patron Account Summary View

### Purpose
Complete overview of each patron's account status including checkouts, holds, and fines.

### SQL Definition
```sql
CREATE OR REPLACE VIEW patron_account_summary AS
SELECT 
    b.borrowernumber,
    b.cardnumber,
    b.full_name,
    b.preferred_name,
    b.email,
    b.categorycode,
    b.dateexpiry,
    b.debarred,
    COUNT(DISTINCT iss.issue_id) as current_checkouts,
    COUNT(DISTINCT r.reserve_id) as active_holds,
    COALESCE(SUM(a.amountoutstanding), 0) as total_fines,
    COUNT(DISTINCT CASE WHEN iss.date_due < CURRENT_TIMESTAMP 
                        THEN iss.issue_id END) as overdue_count
FROM borrowers b
LEFT JOIN issues iss ON b.borrowernumber = iss.borrowernumber
LEFT JOIN reserves r ON b.borrowernumber = r.borrowernumber 
                     AND r.cancellationdate IS NULL
LEFT JOIN accountlines a ON b.borrowernumber = a.borrowernumber 
                         AND a.amountoutstanding > 0
GROUP BY b.borrowernumber, b.cardnumber, b.full_name, 
         b.preferred_name, b.email, b.categorycode, 
         b.dateexpiry, b.debarred;
```

### What It Shows

| Column | Description |
|--------|-------------|
| `borrowernumber` | Patron ID |
| `cardnumber` | Library card number |
| `full_name` | Patron's full name |
| `preferred_name` | Preferred name |
| `email` | Email address |
| `categorycode` | Patron category (ADULT, CHILD, STAFF) |
| `dateexpiry` | Membership expiration |
| `debarred` | Restriction date (NULL = not restricted) |
| `current_checkouts` | **Calculated**: Items currently out |
| `active_holds` | **Calculated**: Active holds/reserves |
| `total_fines` | **Calculated**: Total amount owed |
| `overdue_count` | **Calculated**: Overdue items |

### Aggregation Logic
- LEFT JOINs ensure all patrons shown (even with 0 activity)
- DISTINCT prevents double-counting
- COALESCE converts NULL to 0 for fines
- Conditional COUNT for overdue items

### Usage Examples

```sql
-- 1. Get patron's complete status
SELECT * FROM patron_account_summary 
WHERE borrowernumber = 5;

-- 2. Find patrons with problems
SELECT full_name, email, current_checkouts, overdue_count, total_fines
FROM patron_account_summary
WHERE overdue_count > 0 OR total_fines > 5.00
ORDER BY overdue_count DESC, total_fines DESC;

-- 3. Patrons at checkout limit
SELECT p.full_name, p.current_checkouts, c.max_checkout_count
FROM patron_account_summary p
JOIN categories c ON p.categorycode = c.categorycode
WHERE p.current_checkouts >= c.max_checkout_count;

-- 4. Expiring memberships
SELECT full_name, email, dateexpiry
FROM patron_account_summary
WHERE dateexpiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY dateexpiry;

-- 5. Patron activity report
SELECT 
    categorycode,
    COUNT(*) as total_patrons,
    AVG(current_checkouts) as avg_checkouts,
    SUM(active_holds) as total_holds,
    SUM(total_fines) as total_fines_owed
FROM patron_account_summary
GROUP BY categorycode;
```

### Application Integration

**Patron Dashboard (Vue.js)**:
```javascript
// Load patron summary
const { data: summary } = await supabase
    .from('patron_account_summary')
    .select('*')
    .eq('borrowernumber', userId)
    .single();

// Display:
// - "You have {current_checkouts} items checked out"
// - "You have {active_holds} items on hold"
// - "Your balance: ${total_fines}"
// - "{overdue_count} items are overdue"
```

**Staff Patron Lookup**:
```python
# Quick patron status
patron = db.query("""
    SELECT * FROM patron_account_summary 
    WHERE cardnumber = %s
""", (card_number,)).fetchone()

print(f"{patron['full_name']} has:")
print(f"  - {patron['current_checkouts']} items out")
print(f"  - {patron['overdue_count']} overdue")
print(f"  - ${patron['total_fines']} owed")
```

### Use Cases
- 👤 Patron self-service dashboard
- 🎫 Staff checkout screen
- 📊 Library statistics
- 📧 Account status reports

---

## 🌟 Popular Items View

### Purpose
Identify most circulated items for collection development and promotion.

### SQL Definition
```sql
CREATE OR REPLACE VIEW popular_items AS
SELECT 
    b.biblionumber,
    b.title,
    b.subtitle,
    b.author,
    b.isbn,
    b.itemtype,
    SUM(i.issues) as total_checkouts,
    SUM(i.renewals) as total_renewals,
    SUM(i.reserves) as total_holds,
    COUNT(DISTINCT i.itemnumber) as copy_count,
    MAX(i.datelastborrowed) as last_checkout_date
FROM items i
JOIN biblio b ON i.biblionumber = b.biblionumber
GROUP BY b.biblionumber, b.title, b.subtitle, b.author, b.isbn, b.itemtype
HAVING SUM(i.issues) > 0
ORDER BY total_checkouts DESC;
```

### What It Shows

| Column | Description |
|--------|-------------|
| `biblionumber` | Catalog record ID |
| `title` | Book title |
| `subtitle` | Subtitle if any |
| `author` | Author name |
| `isbn` | ISBN number |
| `itemtype` | Material type |
| `total_checkouts` | **Calculated**: Sum of all copies' checkout counts |
| `total_renewals` | **Calculated**: Sum of all renewal counts |
| `total_holds` | **Calculated**: Sum of all hold counts |
| `copy_count` | **Calculated**: Number of physical copies |
| `last_checkout_date` | Most recent checkout date |

### Aggregation Logic
- Groups by biblio (combines statistics from all copies)
- SUM aggregates across all copies
- HAVING filters to only circulated items
- ORDER BY shows most popular first

### Usage Examples

```sql
-- 1. Top 10 most popular books
SELECT title, author, total_checkouts, copy_count
FROM popular_items
WHERE itemtype = 'BOOK'
LIMIT 10;

-- 2. Items that need more copies
SELECT title, author, total_checkouts, copy_count,
       total_checkouts / copy_count as checkouts_per_copy
FROM popular_items
WHERE copy_count < 3
  AND total_checkouts / copy_count > 20
ORDER BY checkouts_per_copy DESC;

-- 3. Recent popularity trends
SELECT title, author, total_checkouts, last_checkout_date
FROM popular_items
WHERE last_checkout_date > CURRENT_DATE - INTERVAL '6 months'
ORDER BY total_checkouts DESC
LIMIT 20;

-- 4. High demand items (many holds)
SELECT title, author, total_holds, copy_count,
       total_holds / copy_count as holds_per_copy
FROM popular_items
WHERE total_holds > 0
ORDER BY holds_per_copy DESC
LIMIT 10;

-- 5. Popularity by type
SELECT 
    itemtype,
    COUNT(*) as unique_titles,
    SUM(total_checkouts) as total_circulations,
    AVG(total_checkouts) as avg_per_title
FROM popular_items
GROUP BY itemtype
ORDER BY total_circulations DESC;
```

### Application Integration

**Recommendation Engine**:
```python
# Suggest popular books to patron
popular = db.execute("""
    SELECT title, author, total_checkouts
    FROM popular_items
    WHERE itemtype = 'BOOK'
      AND last_checkout_date > NOW() - INTERVAL '3 months'
    ORDER BY total_checkouts DESC
    LIMIT 5
""")

print("Trending Now:")
for book in popular:
    print(f"📚 {book['title']} by {book['author']}")
```

**Collection Development Report**:
```sql
-- Items to purchase more copies of
SELECT 
    title,
    author,
    copy_count as current_copies,
    total_checkouts,
    CEIL(total_checkouts / 20.0) as recommended_copies
FROM popular_items
WHERE copy_count < CEIL(total_checkouts / 20.0)
ORDER BY (CEIL(total_checkouts / 20.0) - copy_count) DESC;
```

### Use Cases
- 📚 Collection development decisions
- 🛒 Purchase recommendations
- 📊 Annual reports
- 🏆 "Most Popular" displays
- 🔍 Patron recommendations

---

## ⚡ Performance Considerations

### View Performance

**Views are NOT materialized** - they run the underlying query each time accessed.

### Performance Tips

#### 1. **Indexed Columns**
Views benefit from indexes on underlying tables:
```sql
-- These indexes help views perform well:
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_issues_date_due ON issues(date_due);
CREATE INDEX idx_accountlines_amountoutstanding 
    ON accountlines(amountoutstanding) WHERE amountoutstanding > 0;
```

#### 2. **Selective Queries**
Filter views to reduce data:
```sql
-- ✅ GOOD: Filtered
SELECT * FROM overdue_items WHERE days_overdue > 7;

-- ❌ BAD: All rows
SELECT * FROM overdue_items;
```

#### 3. **Limit Results**
Use LIMIT for large result sets:
```sql
-- ✅ GOOD: Top 100
SELECT * FROM popular_items LIMIT 100;

-- ❌ BAD: All items
SELECT * FROM popular_items;
```

#### 4. **Count Efficiently**
```sql
-- ✅ GOOD: Count without fetching data
SELECT COUNT(*) FROM available_items;

-- ❌ BAD: Fetch then count
SELECT * FROM available_items;  -- Then count in application
```

### When Views Are Slow

If a view becomes slow:

**Option 1: Materialized View** (refreshed periodically)
```sql
CREATE MATERIALIZED VIEW popular_items_cached AS
SELECT * FROM popular_items;

-- Refresh daily
REFRESH MATERIALIZED VIEW popular_items_cached;
```

**Option 2: Denormalized Table** (updated by triggers)
```sql
CREATE TABLE patron_stats (
    borrowernumber INTEGER PRIMARY KEY,
    current_checkouts INTEGER,
    total_fines DECIMAL(10,2),
    updated_at TIMESTAMP
);

-- Update via triggers on issues/accountlines tables
```

**Option 3: Query Optimization**
- Add indexes
- Rewrite query
- Use EXPLAIN ANALYZE

---

## 📊 Reporting Examples

### Dashboard Queries

```sql
-- Library dashboard statistics
SELECT 
    (SELECT COUNT(*) FROM available_items) as items_available,
    (SELECT COUNT(*) FROM overdue_items) as items_overdue,
    (SELECT COUNT(*) FROM patron_account_summary 
     WHERE current_checkouts > 0) as active_patrons,
    (SELECT SUM(total_fines) FROM patron_account_summary) as total_fines_owed;
```

### Weekly Circulation Report

```sql
-- Items checked out this week by type
SELECT 
    b.itemtype,
    COUNT(*) as checkouts_this_week
FROM issues i
JOIN items it ON i.itemnumber = it.itemnumber
JOIN biblio b ON it.biblionumber = b.biblionumber
WHERE i.issuedate >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY b.itemtype
ORDER BY checkouts_this_week DESC;
```

### Monthly Activity Report

```sql
-- Combine multiple views for comprehensive report
SELECT 
    'Available Items' as metric,
    COUNT(*)::TEXT as value
FROM available_items
UNION ALL
SELECT 'Overdue Items', COUNT(*)::TEXT
FROM overdue_items
UNION ALL
SELECT 'Active Patrons', COUNT(*)::TEXT
FROM patron_account_summary WHERE current_checkouts > 0
UNION ALL
SELECT 'Total Fines Owed', '$' || SUM(total_fines)::TEXT
FROM patron_account_summary;
```

---

## 📝 Summary

### View Comparison

| View | Rows (Typical) | Complexity | Refresh Frequency |
|------|----------------|------------|-------------------|
| `available_items` | 1,000-10,000 | Simple | Real-time OK |
| `overdue_items` | 10-500 | Medium | Real-time OK |
| `patron_account_summary` | 1,000-50,000 | Complex | Cache recommended |
| `popular_items` | 100-5,000 | Complex | Cache recommended |

### Key Benefits

1. **Simplified Queries** - Complex joins become simple SELECTs
2. **Consistency** - Same logic everywhere
3. **Security** - Expose only what's needed
4. **Flexibility** - Change underlying schema without breaking apps
5. **Reporting** - Ready-made queries for common needs

### Best Practices

✅ **DO**:
- Use views for frequent, complex queries
- Add WHERE clauses when querying views
- Index underlying table columns
- Use LIMIT for large result sets

❌ **DON'T**:
- Update data through views (use base tables)
- Fetch unnecessary columns
- Nest views deeply (view of a view of a view)
- Ignore performance issues

These views provide **powerful, pre-built reports** that make building library applications much easier while maintaining consistent business logic across all interfaces.
