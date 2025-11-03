# Level 1: Database Schema Explained

## 📊 Understanding Your Database Structure

Your library management system stores data in **9 main tables**. Let's understand each one and how they work together!

---

## 🗃️ The Big Picture: Entity Relationship Overview

```
┌──────────────┐         ┌──────────────┐
│  Categories  │────1:N──│  Borrowers   │
└──────────────┘         └──────┬───────┘
                                │ 1
                                │
                         ┌──────┴───────┐
                         │              │
                      N  │              │ N
                ┌────────▼─────┐   ┌───▼────────┐
                │   Issues     │   │  Reserves  │
                └────┬─────────┘   └───┬────────┘
                     │ 1               │ N
                     │                 │
                     │ N               │
                ┌────▼─────────────────▼──┐
                │        Items            │
                └────┬────────────────────┘
                     │ N
                     │
                     │ 1
                ┌────▼──────┐        ┌────────────┐
                │  Biblio   │───1:N──│ ItemTypes  │
                └───────────┘        └────────────┘

        ┌────────────────────┐
        │ SystemPreferences  │  (Standalone)
        └────────────────────┘

        ┌────────────────────┐
        │   AccountLines     │  (Links to Borrowers, Items, Issues)
        └────────────────────┘
```

**Legend:**
- `1:N` = One-to-Many relationship (one category has many borrowers)
- `N` = Many side of relationship

---

## 📚 Table-by-Table Breakdown

### 1. Categories (Patron/Borrower Types)

**What is it?**
Defines different types of library members (Adult, Child, Staff).

**Real-World Example:**
- Adults can borrow 10 books for 21 days
- Children can borrow 5 books for 14 days
- Staff can borrow 20 books for 30 days

**Table Structure:**
```prisma
model Category {
  categorycode       String     @id
  description        String
  category_type      String     @default("A")
  max_checkout_count Int        @default(5)
  loan_period_days   Int        @default(14)
  created_at         DateTime   @default(now())
  borrowers          Borrower[]  // One category has many borrowers
}
```

**Key Fields:**
- `categorycode`: Unique identifier (e.g., "ADULT", "CHILD", "STAFF")
- `max_checkout_count`: Maximum items this type can borrow at once
- `loan_period_days`: How many days they can keep items
- `borrowers`: List of all members in this category

**Sample Data:**
```javascript
{
  categorycode: "ADULT",
  description: "Adult Patron",
  category_type: "A",
  max_checkout_count: 10,
  loan_period_days: 21
}
```

---

### 2. ItemTypes (Material Types)

**What is it?**
Defines types of materials in the library (Books, DVDs, Magazines).

**Real-World Example:**
- Regular books are free to borrow
- DVDs have a $2/day rental charge
- Reference books cannot be checked out

**Table Structure:**
```prisma
model ItemType {
  itemtype           String   @id
  description        String
  rentalcharge       Decimal  @default(0)
  defaultreplacecost Decimal  @default(0)
  notforloan         Boolean  @default(false)
  created_at         DateTime @default(now())
  biblios            Biblio[]  // One item type has many biblio records
}
```

**Key Fields:**
- `itemtype`: Unique identifier (e.g., "BOOK", "DVD", "MAGAZINE")
- `rentalcharge`: Cost per day to rent (if any)
- `defaultreplacecost`: How much to charge if item is lost
- `notforloan`: True if item can't be checked out (reference only)

**Sample Data:**
```javascript
{
  itemtype: "DVD",
  description: "DVD/Blu-ray",
  rentalcharge: 2.00,
  defaultreplacecost: 25.00,
  notforloan: false
}
```

---

### 3. Biblio (Catalog Records)

**What is it?**
Represents a title/work in the library catalog (the book itself, not physical copies).

**Real-World Example:**
- One Biblio record for "Harry Potter and the Sorcerer's Stone"
- Library might have 5 physical copies (5 Item records linked to this one Biblio)

**Table Structure:**
```prisma
model Biblio {
  biblionumber    Int       @id @default(autoincrement())
  title           String
  subtitle        String?
  author          String?
  isbn            String?   @unique
  publisher       String?
  publicationyear Int?
  itemtype        String?
  notes           String?
  abstract        String?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @default(now())
  
  itemType        ItemType? @relation(fields: [itemtype], references: [itemtype])
  items           Item[]     // One biblio can have many physical copies
  reserves        Reserve[]  // Many members can reserve this title
}
```

**Key Fields:**
- `biblionumber`: Auto-generated unique ID
- `title`: Name of the book/material
- `isbn`: Unique book identifier (like a barcode)
- `itemtype`: What type of material (links to ItemType)
- `items`: All physical copies of this title

**Sample Data:**
```javascript
{
  biblionumber: 1,
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  isbn: "9780743273565",
  publisher: "Scribner",
  publicationyear: 2004,
  itemtype: "BOOK"
}
```

---

### 4. Items (Physical Copies)

**What is it?**
Represents an actual physical item you can hold (a specific copy).

**Real-World Example:**
- Biblio #1 is "The Great Gatsby"
- Item #101 is copy 1 (barcode: BOOK001, on shelf A)
- Item #102 is copy 2 (barcode: BOOK002, currently checked out)

**Table Structure:**
```prisma
model Item {
  itemnumber       Int           @id @default(autoincrement())
  biblionumber     Int
  barcode          String        @unique
  itemcallnumber   String?       // Dewey decimal / call number
  location         String?       // Which shelf/room
  price            Decimal?
  replacementprice Decimal?
  status           String        @default("available")
  status_date      DateTime?
  notforloan       Boolean       @default(false)
  issues           Int           @default(0)    // Times checked out
  renewals         Int           @default(0)    // Times renewed
  reserves_count   Int           @default(0)    // Active holds
  onloan           DateTime?     // Currently checked out?
  datelastborrowed DateTime?
  datelastseen     DateTime      @default(now())
  notes            String?
  created_at       DateTime      @default(now())
  updated_at       DateTime      @default(now())
  
  biblio           Biblio        @relation(fields: [biblionumber], references: [biblionumber])
  issuesRecords    Issue?        // Current checkout record
  reservesRecords  Reserve[]     // Hold requests for this copy
  accountLines     AccountLine[] // Fines related to this item
}
```

**Key Fields:**
- `itemnumber`: Auto-generated unique ID
- `barcode`: Scanned when checking out (like BOOK001)
- `biblionumber`: Which title this is a copy of
- `status`: Current state (available, checked_out, lost, damaged)
- `onloan`: If checked out, when was it checked out?
- `issues`: Lifetime checkout count (popularity metric)

**Status Values:**
- `available` - On shelf, ready to check out
- `checked_out` - Currently borrowed
- `on_hold` - Reserved for someone
- `in_transit` - Being moved
- `lost` - Missing
- `damaged` - Needs repair

**Sample Data:**
```javascript
{
  itemnumber: 101,
  biblionumber: 1,
  barcode: "BOOK001",
  itemcallnumber: "813.52",
  location: "Fiction - Floor 2, Shelf A",
  status: "available",
  issues: 47,  // Been checked out 47 times
  renewals: 12
}
```

---

### 5. Borrowers (Library Members)

**What is it?**
Represents a library member or staff person.

**Real-World Example:**
- John Doe, card #12345, Adult category, can borrow 10 books

**Table Structure:**
```prisma
model Borrower {
  borrowernumber      Int           @id @default(autoincrement())
  cardnumber          String        @unique
  full_name           String
  preferred_name      String?
  dateofbirth         DateTime?
  email               String?       @unique
  phone               String?
  address             Json?         // Flexible address structure
  categorycode        String
  dateenrolled        DateTime?
  dateexpiry          DateTime?
  debarred            DateTime?     // Suspended until this date
  debarred_comment    String?       // Why suspended
  userid              String?       @unique
  password            String        // Bcrypt hashed
  staff_notes         String?
  lastseen            DateTime?
  created_at          DateTime      @default(now())
  updated_at          DateTime      @default(now())
  role                Role          @default(MEMBER)  // ADMIN or MEMBER
  
  category            Category      @relation(fields: [categorycode], references: [categorycode])
  issuesRecords       Issue[]       // Current checkouts
  reservesRecords     Reserve[]     // Active holds
  accountLines        AccountLine[] // Fines and fees
  managedAccountLines AccountLine[] // If staff, payments they processed
}

enum Role {
  ADMIN
  MEMBER
}
```

**Key Fields:**
- `borrowernumber`: Auto-generated unique ID
- `cardnumber`: Library card number (user-facing)
- `email`: For login and notifications
- `password`: Encrypted with bcrypt
- `role`: ADMIN (staff) or MEMBER (patron)
- `categorycode`: Which category they belong to
- `debarred`: If set, they're suspended until this date

**Address Structure (JSON):**
```javascript
{
  street: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  country: "USA"
}
```

**Sample Data:**
```javascript
{
  borrowernumber: 1,
  cardnumber: "CARD001",
  full_name: "John Doe",
  email: "john@example.com",
  password: "$2a$10$abc...xyz",  // Hashed
  categorycode: "ADULT",
  role: "MEMBER",
  dateenrolled: "2024-01-15"
}
```

---

### 6. Issues (Checkouts/Loans)

**What is it?**
Records when someone checks out an item (active loans).

**Real-World Example:**
- John checked out "The Great Gatsby" (Item #101) on Nov 1st, due Nov 15th

**Table Structure:**
```prisma
model Issue {
  issue_id        Int           @id @default(autoincrement())
  borrowernumber  Int
  itemnumber      Int           @unique  // One item can only be checked out once at a time
  issuedate       DateTime      @default(now())
  date_due        DateTime
  returndate      DateTime?     // NULL if still checked out
  lastreneweddate DateTime?
  renewals_count  Int           @default(0)
  created_at      DateTime      @default(now())
  
  borrower        Borrower      @relation(fields: [borrowernumber], references: [borrowernumber])
  item            Item          @relation(fields: [itemnumber], references: [itemnumber])
  fines           AccountLine[] // Late fees for this checkout
}
```

**Key Fields:**
- `issue_id`: Unique checkout ID
- `borrowernumber`: Who borrowed it
- `itemnumber`: What was borrowed (UNIQUE - can't be checked out twice)
- `issuedate`: When checked out
- `date_due`: When it must be returned
- `returndate`: When actually returned (NULL if still out)
- `renewals_count`: How many times renewal was extended

**Lifecycle:**
1. **Checkout**: Record created with `returndate = NULL`
2. **Renewal**: `renewals_count++`, `date_due` updated
3. **Return**: `returndate` set to current date
4. **If Overdue**: Fines calculated and added to AccountLines

**Sample Data:**
```javascript
{
  issue_id: 1,
  borrowernumber: 1,
  itemnumber: 101,
  issuedate: "2024-11-01T10:00:00Z",
  date_due: "2024-11-15T23:59:59Z",
  returndate: null,  // Still checked out
  renewals_count: 1
}
```

---

### 7. Reserves (Holds/Reservations)

**What is it?**
Records when someone places a hold on an item that's currently checked out.

**Real-World Example:**
- Jane wants "The Great Gatsby" but it's checked out
- She places a hold - when returned, it's held for her for 3 days

**Table Structure:**
```prisma
model Reserve {
  reserve_id       Int       @id @default(autoincrement())
  borrowernumber   Int
  biblionumber     Int       // Hold on ANY copy of this title
  itemnumber       Int?      // Specific copy (optional)
  reservedate      DateTime  @default(now())
  expirationdate   DateTime? // Hold expires if not picked up by this date
  cancellationdate DateTime? // If cancelled
  waitingdate      DateTime? // When item became available for pickup
  priority         Int       @default(1)  // Position in queue
  found            String?   // "W" = waiting, "T" = in transit, etc.
  notes            String?
  created_at       DateTime  @default(now())
  
  biblio           Biblio    @relation(fields: [biblionumber], references: [biblionumber])
  borrower         Borrower  @relation(fields: [borrowernumber], references: [borrowernumber])
  item             Item?     @relation(fields: [itemnumber], references: [itemnumber])
}
```

**Key Fields:**
- `reserve_id`: Unique hold ID
- `borrowernumber`: Who placed the hold
- `biblionumber`: Which title they want
- `itemnumber`: Specific copy (set when item becomes available)
- `priority`: Position in queue (1 = first, 2 = second, etc.)
- `found`: Status code (W = waiting for pickup, T = in transit, etc.)
- `waitingdate`: When item became ready for pickup

**Hold Lifecycle:**
1. **Placed**: `reservedate` set, `priority` assigned
2. **Available**: Item returned, `waitingdate` set, `found = "W"`
3. **Picked Up**: Converted to checkout (Issue), reserve deleted/marked
4. **Expired**: Past `expirationdate`, reserve cancelled
5. **Cancelled**: User cancels, `cancellationdate` set

**Sample Data:**
```javascript
{
  reserve_id: 1,
  borrowernumber: 2,
  biblionumber: 1,
  itemnumber: null,  // Any copy is fine
  reservedate: "2024-11-01",
  priority: 1,  // First in line
  found: "W",  // Waiting for pickup
  waitingdate: "2024-11-10"
}
```

---

### 8. AccountLines (Fines, Fees, Payments)

**What is it?**
Financial transactions - fines for late returns, rental fees, payments.

**Real-World Example:**
- John returned a book 5 days late: $2.50 fine
- John paid $10 cash: $7.50 remaining balance

**Table Structure:**
```prisma
model AccountLine {
  accountlines_id   Int       @id @default(autoincrement())
  borrowernumber    Int?
  itemnumber        Int?
  issue_id          Int?      // Which checkout caused this (if fine)
  date              DateTime  @default(now())
  amount            Decimal   @default(0)
  amountoutstanding Decimal   @default(0)  // Remaining balance
  description       String?
  accounttype       String?   // "FINE", "RENTAL", "LOST", etc.
  payment_type      String?   // "CASH", "CARD", "WAIVED"
  status            String?   // "UNPAID", "PAID", "PARTIAL"
  manager_id        Int?      // Staff member who processed payment
  note              String?
  created_at        DateTime  @default(now())
  
  borrower          Borrower? @relation("BorrowerAccountLines", fields: [borrowernumber], references: [borrowernumber])
  item              Item?     @relation(fields: [itemnumber], references: [itemnumber])
  issue             Issue?    @relation(fields: [issue_id], references: [issue_id])
  manager           Borrower? @relation("ManagerAccountLines", fields: [manager_id], references: [borrowernumber])
}
```

**Key Fields:**
- `accountlines_id`: Unique transaction ID
- `borrowernumber`: Whose account
- `amount`: Original amount charged
- `amountoutstanding`: How much still owed
- `accounttype`: What kind of charge (FINE, RENTAL, LOST, PAYMENT)
- `payment_type`: How they paid (CASH, CARD, WAIVED)
- `status`: UNPAID, PAID, PARTIAL

**Transaction Types:**

**Fine/Fee (Charge):**
```javascript
{
  accountlines_id: 1,
  borrowernumber: 1,
  itemnumber: 101,
  issue_id: 1,
  date: "2024-11-16",
  amount: 2.50,
  amountoutstanding: 2.50,
  accounttype: "FINE",
  description: "Late return: 5 days overdue",
  status: "UNPAID"
}
```

**Payment:**
```javascript
{
  accountlines_id: 2,
  borrowernumber: 1,
  date: "2024-11-17",
  amount: -2.50,  // Negative = payment/credit
  amountoutstanding: 0,
  accounttype: "PAYMENT",
  payment_type: "CASH",
  description: "Payment received",
  status: "PAID",
  manager_id: 5  // Staff member who processed it
}
```

**How Balance Works:**
- Fine added: `amount = 2.50`, `amountoutstanding = 2.50`
- Partial payment of $1: `amountoutstanding = 1.50`
- Full payment: `amountoutstanding = 0`, `status = PAID`

---

### 9. SystemPreferences (Configuration)

**What is it?**
System-wide settings and configuration values.

**Real-World Example:**
- Late fine per day: $0.50
- Max renewals allowed: 3
- Hold pickup window: 7 days

**Table Structure:**
```prisma
model SystemPreference {
  variable    String   @id
  value       String?
  explanation String?
  type        String?  // "string", "number", "boolean"
  updated_at  DateTime @default(now())
}
```

**Key Fields:**
- `variable`: Setting name (unique)
- `value`: Setting value (stored as string)
- `type`: Data type hint
- `explanation`: Human-readable description

**Sample Data:**
```javascript
[
  {
    variable: "fine_per_day",
    value: "0.50",
    type: "decimal",
    explanation: "Daily overdue fine amount in dollars"
  },
  {
    variable: "max_renewals",
    value: "3",
    type: "integer",
    explanation: "Maximum times an item can be renewed"
  },
  {
    variable: "hold_expiry_days",
    value: "7",
    type: "integer",
    explanation: "Days to pick up held item before it expires"
  }
]
```

---

## 🔗 How Tables Work Together: Real-World Scenario

Let's trace a complete workflow:

### Scenario: Jane wants to borrow "The Great Gatsby"

**Step 1: Find the Book**
```javascript
// Query Biblio table
SELECT * FROM biblio WHERE title LIKE '%Great Gatsby%';
// Result: biblionumber = 1
```

**Step 2: Check Availability**
```javascript
// Query Items table
SELECT * FROM items WHERE biblionumber = 1 AND status = 'available';
// Result: itemnumber = 101, barcode = 'BOOK001'
```

**Step 3: Verify Member Status**
```javascript
// Query Borrower + Category
SELECT b.*, c.max_checkout_count, c.loan_period_days 
FROM borrowers b
JOIN categories c ON b.categorycode = c.categorycode
WHERE b.borrowernumber = 2;
// Result: Jane, ADULT category, can borrow 10 items for 21 days
```

**Step 4: Check Current Checkouts**
```javascript
// Count active issues
SELECT COUNT(*) FROM issues 
WHERE borrowernumber = 2 AND returndate IS NULL;
// Result: 3 items (can borrow 7 more)
```

**Step 5: Create Checkout**
```javascript
// Insert into Issues table
INSERT INTO issues (borrowernumber, itemnumber, issuedate, date_due)
VALUES (2, 101, NOW(), NOW() + INTERVAL '21 days');

// Update Item status
UPDATE items 
SET status = 'checked_out', onloan = NOW() 
WHERE itemnumber = 101;
```

**Step 6: 25 Days Later - Return (5 Days Late)**
```javascript
// Calculate fine
days_late = 5
fine_per_day = 0.50 (from SystemPreferences)
total_fine = 5 * 0.50 = 2.50

// Update Issue record
UPDATE issues 
SET returndate = NOW() 
WHERE issue_id = 1;

// Add fine to AccountLines
INSERT INTO accountlines (
  borrowernumber, itemnumber, issue_id, 
  amount, amountoutstanding, accounttype, description
) VALUES (
  2, 101, 1, 
  2.50, 2.50, 'FINE', 'Late return: 5 days overdue'
);

// Update Item
UPDATE items 
SET status = 'available', onloan = NULL 
WHERE itemnumber = 101;
```

---

## 🎓 Key Relationships Explained

### One-to-Many Relationships

**1. Category → Borrowers**
- One category (ADULT) has many borrowers
- Each borrower belongs to exactly one category

**2. ItemType → Biblios**
- One item type (BOOK) has many biblio records
- Each biblio belongs to one item type

**3. Biblio → Items**
- One biblio (title) has many items (copies)
- Each item belongs to exactly one biblio

**4. Borrower → Issues**
- One borrower has many checkouts (over time)
- Each checkout belongs to one borrower

**5. Borrower → Reserves**
- One borrower has many holds
- Each hold belongs to one borrower

### One-to-One Relationships

**Item ↔ Issue (Current Checkout)**
- One item can have at most ONE active checkout
- When returned, the relationship breaks
- New checkout creates new relationship

### Many-to-Many (Through Tables)

**Borrowers ↔ Biblios (through Reserves)**
- Many borrowers can reserve many biblios
- Reserve table connects them

**Borrowers ↔ Items (through Issues)**
- Many borrowers can checkout many items (over time)
- Issue table tracks each relationship

---

## 🔍 Database Constraints & Rules

### Unique Constraints
- `borrowers.cardnumber` - No duplicate cards
- `borrowers.email` - No duplicate emails
- `items.barcode` - Each physical item has unique barcode
- `biblio.isbn` - No duplicate ISBN numbers
- `issues.itemnumber` - Item can only be checked out once

### Foreign Key Constraints
- If you delete a Borrower, all their Issues are deleted (CASCADE)
- If you delete a Biblio, all its Items are deleted (CASCADE)
- If you delete an Item, its Issue is deleted (CASCADE)

### Default Values
- `items.status` defaults to "available"
- `borrowers.role` defaults to "MEMBER"
- Timestamps (`created_at`, `updated_at`) auto-set

### Check Constraints (Enforced in Application)
- `amount` should be positive for fines
- `date_due` should be after `issuedate`
- `renewals_count` shouldn't exceed max from SystemPreferences

---

## ❓ Q&A: Database Questions

### Q1: Why separate Biblio and Items?
**A:** 
- **Biblio** = The concept of the book (abstract)
- **Item** = Physical copy you can hold (concrete)
- Library might have 10 copies of same book - 1 Biblio, 10 Items

### Q2: Why is itemnumber unique in Issues?
**A:** An item can only be checked out by one person at a time. The `UNIQUE` constraint prevents double-checkouts.

### Q3: What happens when an item is returned?
**A:** 
1. `issues.returndate` is set
2. `items.status` changes to "available"
3. If overdue, fine is added to AccountLines
4. If someone has a hold, status changes to "on_hold"

### Q4: How are fines calculated?
**A:**
```javascript
days_overdue = (return_date - due_date).days;
if (days_overdue > 0) {
  fine = days_overdue * fine_per_day;
  // Create AccountLine record
}
```

### Q5: Can someone reserve a specific copy or any copy?
**A:** Both!
- Reserve with only `biblionumber` = any copy is fine
- Reserve with `biblionumber` + `itemnumber` = specific copy only

### Q6: What is the priority field in Reserves?
**A:** Queue position:
- Person who reserved first gets `priority = 1`
- Next person gets `priority = 2`
- When someone cancels, priorities shift down

### Q7: How does the address JSON field work?
**A:** It's flexible - you can store any structure:
```javascript
// Simple
{ street: "123 Main", city: "Springfield" }

// Complex
{
  line1: "Apt 4B",
  line2: "123 Main St",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  country: "USA"
}
```

### Q8: What's the difference between accounttype and payment_type?
**A:**
- `accounttype`: WHAT it is (FINE, RENTAL, LOST, PAYMENT)
- `payment_type`: HOW they paid (CASH, CARD, WAIVED, CHECK)

### Q9: Why track renewals_count?
**A:** 
- Enforce renewal limits (max 3 renewals per SystemPreferences)
- Track popularity
- Prevent indefinite renewals if someone has a hold

### Q10: What does "debarred" mean?
**A:** Suspended/banned. If `debarred` date is in the future, they can't check out items until that date passes.

---

## 🎯 Database Design Principles Applied

### 1. **Normalization**
- No duplicate data (title stored once in Biblio, not in every Item)
- Clear relationships through foreign keys
- Reference data in separate tables (Categories, ItemTypes)

### 2. **Data Integrity**
- Foreign keys ensure orphan records can't exist
- Unique constraints prevent duplicates
- NOT NULL on critical fields

### 3. **Flexibility**
- JSON fields for complex data (addresses)
- SystemPreferences for configurable values
- Status enums for clear states

### 4. **Audit Trail**
- `created_at` / `updated_at` timestamps
- AccountLines track all financial history
- Issues track complete checkout history

### 5. **Performance**
- Indexed fields: email, cardnumber, barcode, ISBN
- Unique constraints create automatic indexes
- Foreign keys create indexes for joins

---

## 📊 Database Queries You'll Use Most

### Find Available Copies of a Book
```sql
SELECT i.* FROM items i
JOIN biblio b ON i.biblionumber = b.biblionumber
WHERE b.title = 'The Great Gatsby'
  AND i.status = 'available';
```

### Find All of a Member's Checkouts
```sql
SELECT b.title, i.barcode, iss.issuedate, iss.date_due
FROM issues iss
JOIN items i ON iss.itemnumber = i.itemnumber
JOIN biblio b ON i.biblionumber = b.biblionumber
WHERE iss.borrowernumber = 1
  AND iss.returndate IS NULL;
```

### Calculate Member's Total Outstanding Fines
```sql
SELECT SUM(amountoutstanding) as total_owed
FROM accountlines
WHERE borrowernumber = 1
  AND status != 'PAID';
```

### Find Overdue Items
```sql
SELECT b.full_name, bib.title, iss.date_due
FROM issues iss
JOIN borrowers b ON iss.borrowernumber = b.borrowernumber
JOIN items i ON iss.itemnumber = i.itemnumber
JOIN biblio bib ON i.biblionumber = bib.biblionumber
WHERE iss.returndate IS NULL
  AND iss.date_due < NOW();
```

---

## 🎓 Practice Exercises

### Exercise 1: Data Relationship
If you have:
- Biblio #5: "Harry Potter"
- Items #20, #21, #22 (all copies of Biblio #5)
- Borrower #3 checked out Item #20

Draw the connections between these records.

### Exercise 2: Scenario
Member Jane (borrowernumber = 10) wants to check out "1984" (biblionumber = 15). Walk through every table involved and what data changes.

### Exercise 3: Query Writing
Write the logic (not SQL) to find:
1. All members with overdue items
2. The most popular book (most checkouts)
3. Members who owe more than $10 in fines

---

## 🚀 Next Steps

Now that you understand the database structure, move on to:
- **Level 2**: Authentication & Security (how login and JWT work)
- **Level 3**: API Architecture (how your code is organized)

---

**Key Takeaway:** Your database is well-designed, normalized, and follows library industry standards. It efficiently handles all aspects of library management from catalog to circulation to fines! 🎉
