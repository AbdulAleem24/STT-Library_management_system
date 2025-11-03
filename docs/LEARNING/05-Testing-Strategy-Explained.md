# Level 5: Testing Strategy Explained

## 🧪 Understanding Testing

Testing ensures your code works correctly and continues working as you make changes. Your project includes comprehensive automated tests!

---

## 🎯 Why Test?

### Without Tests
```
You make a change → Hope it works → Deploy → 💥 Production breaks!
```

### With Tests
```
You make a change → Run tests → Tests pass ✓ → Deploy with confidence!
```

### Benefits of Testing

1. **Catch bugs early** - Before users see them
2. **Document behavior** - Tests show how code should work
3. **Enable refactoring** - Change code without fear
4. **Build confidence** - Know your code works
5. **Save time** - Automated testing faster than manual

---

## 📊 Types of Tests in Your Project

```
┌─────────────────────────────────────────────────────┐
│              TESTING PYRAMID                         │
└─────────────────────────────────────────────────────┘

                    ▲
                   ╱│╲
                  ╱ │ ╲
                 ╱  │  ╲
                ╱   │   ╲
               ╱ E2E│    ╲           ← Manual testing
              ╱─────┴─────╲          (would use Postman/Swagger)
             ╱             ╲
            ╱  Integration  ╲        ← API endpoint tests
           ╱─────────────────╲       (your project has these)
          ╱                   ╲
         ╱      Unit Tests     ╲     ← Function tests
        ╱───────────────────────╲    (your project has these)
       ────────────────────────────

BOTTOM (Many tests): Fast, isolated, test one thing
TOP (Few tests): Slow, test whole system
```

---

## 🧩 Unit Tests

### What Are Unit Tests?

Tests for **individual functions** in isolation (no database, no HTTP).

**Analogy:** Testing a car's engine separately from the wheels.

### Your Unit Tests

Located in: `api/tests/unit/`

**Example: Token Generation Test**

```javascript
// tests/unit/utils/token.test.js
import { generateToken, verifyToken } from '../../../src/utils/token.js';

describe('generateToken', () => {
  it('should generate a valid JWT token', () => {
    const payload = { id: 1, role: 'MEMBER' };
    const token = generateToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);  // header.payload.signature
  });
});

describe('verifyToken', () => {
  it('should verify and decode a valid token', () => {
    const payload = { id: 1, role: 'MEMBER' };
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded.id).toBe(1);
    expect(decoded.role).toBe('MEMBER');
  });

  it('should throw error for invalid token', () => {
    const invalidToken = 'invalid.token.here';
    
    expect(() => {
      verifyToken(invalidToken);
    }).toThrow('Invalid or expired token');
  });
});
```

**What's Being Tested:**
- ✅ Token is generated
- ✅ Token has correct format (3 parts)
- ✅ Token can be verified
- ✅ Decoded data matches input
- ✅ Invalid tokens are rejected

---

## 🔗 Integration Tests

### What Are Integration Tests?

Tests for **complete API endpoints** (including database).

**Analogy:** Testing the whole car by driving it.

### Your Integration Tests

Located in: `api/tests/integration/`

**Example: Auth API Test**

```javascript
// tests/integration/auth.test.js
import request from 'supertest';
import app from '../../src/app.js';
import { resetDatabase, seedBaseData, createBorrower } from '../utils/testUtils.js';

describe('Auth API', () => {
  // Reset database before each test
  beforeEach(async () => {
    await resetDatabase();
    await seedBaseData();  // Add categories, item types, etc.
  });

  it('registers a new member and returns token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        cardnumber: 'CARD-NEW',
        fullName: 'New Patron',
        email: 'new.patron@example.com',
        password: 'StrongPass123!',
        categorycode: 'ADULT'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      cardnumber: 'CARD-NEW',
      full_name: 'New Patron',
      email: 'new.patron@example.com',
      role: 'MEMBER'
    });
    expect(response.body.data.token).toBeDefined();
  });

  it('rejects duplicate email registrations', async () => {
    // Create first user
    await createBorrower({ email: 'duplicate@example.com' });

    // Try to create second user with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        cardnumber: 'CARD-DUP',
        fullName: 'Duplicate Email',
        email: 'duplicate@example.com',
        password: 'StrongPass123!',
        categorycode: 'ADULT'
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('already registered');
  });

  it('authenticates existing user and returns token', async () => {
    // Create user
    const { borrower } = await createBorrower({
      email: 'test@example.com',
      password: 'TestPass123!'
    });

    // Login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123!'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    await createBorrower({
      email: 'test@example.com',
      password: 'CorrectPass123!'
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid credentials');
  });
});
```

**What's Being Tested:**
- ✅ Complete HTTP request/response cycle
- ✅ Database operations (create user)
- ✅ Validation (duplicate email)
- ✅ Authentication (password verification)
- ✅ Response format (success/error structure)

---

## 🛠️ Test Utilities

### Test Helper Functions

Located in: `api/tests/utils/testUtils.js`

These make writing tests easier:

**1. Reset Database**
```javascript
export const resetDatabase = async () => {
  await prisma.accountLine.deleteMany();
  await prisma.reserve.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.item.deleteMany();
  await prisma.biblio.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.category.deleteMany();
  await prisma.itemType.deleteMany();
  await prisma.systemPreference.deleteMany();
};
```

**Why?** Each test starts with clean state. No leftover data from previous tests.

**2. Seed Base Data**
```javascript
export const seedBaseData = async () => {
  // Create categories
  await prisma.category.createMany({
    data: [
      { categorycode: 'ADULT', description: 'Adult Patron', max_checkout_count: 10, loan_period_days: 21 },
      { categorycode: 'CHILD', description: 'Child Patron', max_checkout_count: 5, loan_period_days: 14 }
    ]
  });

  // Create item types
  await prisma.itemType.createMany({
    data: [
      { itemtype: 'BOOK', description: 'Book', rentalcharge: 0, defaultreplacecost: 25 },
      { itemtype: 'DVD', description: 'DVD', rentalcharge: 2, defaultreplacecost: 20 }
    ]
  });

  // Create system preferences
  await prisma.systemPreference.createMany({
    data: [
      { variable: 'fine_per_day', value: '0.25', type: 'decimal' },
      { variable: 'max_renewals', value: '3', type: 'integer' }
    ]
  });
};
```

**Why?** Tests need reference data (categories, preferences) to work.

**3. Create Test Borrower**
```javascript
export const createBorrower = async ({
  cardnumber = 'TEST-CARD',
  fullName = 'Test User',
  email = 'test@example.com',
  password = 'TestPass123!',
  categorycode = 'ADULT',
  role = 'MEMBER'
}) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const borrower = await prisma.borrower.create({
    data: {
      cardnumber,
      full_name: fullName,
      email,
      password: hashedPassword,
      categorycode,
      role
    }
  });

  return { borrower, plainPassword: password };
};
```

**Why?** Tests often need users. This creates them quickly with sensible defaults.

**4. Create Borrower With Token**
```javascript
export const createBorrowerWithToken = async (options = {}) => {
  const { borrower, plainPassword } = await createBorrower(options);
  const token = generateToken({ id: borrower.borrowernumber, role: borrower.role });
  
  return { borrower, token, plainPassword };
};
```

**Why?** Most API tests need authentication. This creates user + token in one step.

---

## 🧪 Test Structure

### Anatomy of a Test

```javascript
describe('Feature Name', () => {              // Group of related tests
  
  beforeEach(async () => {                    // Runs before EACH test
    await resetDatabase();
    await seedBaseData();
  });

  it('should do something specific', async () => {  // Individual test
    // ARRANGE: Set up test data
    const testData = { ... };
    
    // ACT: Perform the action
    const response = await request(app)
      .post('/api/endpoint')
      .send(testData);
    
    // ASSERT: Check the results
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should handle error case', async () => {
    // Test error scenario
  });
});
```

### Test Lifecycle

```
describe() starts
   │
   ├─ beforeEach() runs
   │     │
   │     └─ it('test 1') runs
   │           ├─ Arrange
   │           ├─ Act
   │           └─ Assert
   │
   ├─ beforeEach() runs again
   │     │
   │     └─ it('test 2') runs
   │           ├─ Arrange
   │           ├─ Act
   │           └─ Assert
   │
   └─ describe() ends
```

---

## 🎯 Integration Test Examples

### Example 1: Checkout Item Test

```javascript
// tests/integration/circulation.test.js
describe('POST /api/circulation/checkout', () => {
  it('allows member to checkout available item', async () => {
    // ARRANGE: Create test data
    const { borrower, token } = await createMemberWithToken();
    const biblio = await createBiblioRecord({ title: 'Test Book' });
    const item = await createItemRecord({ 
      biblionumber: biblio.biblionumber,
      barcode: 'BOOK001',
      status: 'available'
    });

    // ACT: Make request
    const response = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        borrowernumber: borrower.borrowernumber,
        barcode: 'BOOK001'
      });

    // ASSERT: Check response
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.itemnumber).toBe(item.itemnumber);
    expect(response.body.data.date_due).toBeDefined();

    // ASSERT: Check database state
    const updatedItem = await prisma.item.findUnique({
      where: { itemnumber: item.itemnumber }
    });
    expect(updatedItem.status).toBe('checked_out');
  });

  it('prevents checkout when member has too many items', async () => {
    // ARRANGE: Create member with max checkouts
    const { borrower, token } = await createMemberWithToken();
    const category = await prisma.category.findUnique({ where: { categorycode: 'ADULT' } });
    
    // Check out max items (10 for ADULT category)
    for (let i = 0; i < category.max_checkout_count; i++) {
      const biblio = await createBiblioRecord({ title: `Book ${i}` });
      const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: `BOOK${i}` });
      await checkoutItem({ borrowernumber: borrower.borrowernumber, itemnumber: item.itemnumber });
    }

    // Try to checkout one more
    const extraBiblio = await createBiblioRecord({ title: 'Extra Book' });
    const extraItem = await createItemRecord({ biblionumber: extraBiblio.biblionumber, barcode: 'EXTRA001' });

    // ACT
    const response = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        borrowernumber: borrower.borrowernumber,
        barcode: 'EXTRA001'
      });

    // ASSERT
    expect(response.status).toBe(403);
    expect(response.body.error.message).toContain('maximum checkout limit');
  });
});
```

### Example 2: Return With Fine Test

```javascript
describe('POST /api/circulation/return', () => {
  it('calculates fine for overdue return', async () => {
    // ARRANGE: Create overdue checkout
    const { borrower, token } = await createMemberWithToken();
    const biblio = await createBiblioRecord({ title: 'Late Book' });
    const item = await createItemRecord({ biblionumber: biblio.biblionumber, barcode: 'LATE001' });
    
    // Create checkout with due date 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const issue = await prisma.issue.create({
      data: {
        borrowernumber: borrower.borrowernumber,
        itemnumber: item.itemnumber,
        issuedate: new Date(fiveDaysAgo.getTime() - 14 * 24 * 60 * 60 * 1000),  // 14 days before due
        date_due: fiveDaysAgo
      }
    });

    await prisma.item.update({
      where: { itemnumber: item.itemnumber },
      data: { status: 'checked_out' }
    });

    // ACT: Return the item
    const response = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${token}`)
      .send({ barcode: 'LATE001' });

    // ASSERT: Check response
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // ASSERT: Check fine was created
    const fines = await prisma.accountLine.findMany({
      where: {
        borrowernumber: borrower.borrowernumber,
        accounttype: 'OVERDUE'
      }
    });

    expect(fines).toHaveLength(1);
    expect(fines[0].amount).toBe(1.25);  // 5 days × $0.25 = $1.25
    expect(fines[0].description).toContain('5 days late');
  });
});
```

---

## 📝 Test Commands

### Run All Tests
```cmd
cd api
npm test
```

This runs:
1. Unit tests
2. Integration tests
3. Shows summary

### Run Only Unit Tests
```cmd
npm run test:unit
```

### Run Only Integration Tests
```cmd
npm run test:integration
```

### Run Tests in Watch Mode
```cmd
npm run test:watch
```
- Watches for file changes
- Reruns tests automatically
- Great for development!

### Run Tests with Coverage
```cmd
npm run test:coverage
```

Shows:
- Which lines of code are tested
- Percentage covered
- Untested code highlighted

**Example Coverage Output:**
```
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.23 |    78.45 |   90.12 |   86.34 |
 controllers          |   92.15 |    85.33 |   95.00 |   93.21 |
  authController.js   |   95.00 |    90.00 |  100.00 |   96.00 |
  biblioController.js |   88.50 |    80.00 |   90.00 |   89.00 |
 services             |   88.76 |    82.14 |   92.45 |   89.23 |
  authService.js      |   91.20 |    85.50 |   95.00 |   92.10 |
  biblioService.js    |   86.30 |    78.90 |   89.90 |   86.40 |
```

---

## 🎯 What's Being Tested

### Authentication & Authorization
- ✅ User registration
- ✅ Duplicate email/card prevention
- ✅ Login with correct credentials
- ✅ Login failure with wrong password
- ✅ JWT generation and verification
- ✅ Protected endpoint access
- ✅ Role-based permissions

### Circulation
- ✅ Checkout available items
- ✅ Prevent double checkout
- ✅ Enforce checkout limits
- ✅ Check membership status
- ✅ Respect holds/reserves
- ✅ Calculate due dates
- ✅ Return items
- ✅ Calculate overdue fines
- ✅ Renew items
- ✅ Enforce renewal limits

### Catalog Management
- ✅ Create biblio records
- ✅ Update biblio records
- ✅ Delete biblio records
- ✅ Search by title/author/ISBN
- ✅ Filter by item type
- ✅ Pagination

### Holds/Reserves
- ✅ Place holds
- ✅ Prevent duplicate holds
- ✅ Priority queue management
- ✅ Hold fulfillment
- ✅ Hold cancellation

### Fines & Payments
- ✅ Calculate overdue fines
- ✅ Record payments
- ✅ Apply payments to oldest fines
- ✅ Track outstanding balances
- ✅ Member vs admin access

---

## 🐛 Test-Driven Development (TDD)

### The TDD Cycle

```
┌─────────────────────────────────────────────┐
│              TDD CYCLE                       │
└─────────────────────────────────────────────┘

1. RED: Write failing test
   │
   ▼
2. GREEN: Write minimal code to pass
   │
   ▼
3. REFACTOR: Improve code
   │
   └──────▶ (Repeat)
```

### Example: Adding a Feature with TDD

**Feature:** Allow admins to waive fines

**Step 1: Write failing test (RED)**
```javascript
it('allows admin to waive fine', async () => {
  const { borrower } = await createMemberWithToken();
  const { token: adminToken } = await createAdminWithToken();
  
  // Create fine
  const fine = await prisma.accountLine.create({
    data: {
      borrowernumber: borrower.borrowernumber,
      amount: 5.00,
      amountoutstanding: 5.00,
      accounttype: 'OVERDUE'
    }
  });

  // Try to waive
  const response = await request(app)
    .post(`/api/accounts/${fine.accountlines_id}/waive`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(response.status).toBe(200);
  
  // Check fine was waived
  const updated = await prisma.accountLine.findUnique({
    where: { accountlines_id: fine.accountlines_id }
  });
  expect(updated.amountoutstanding).toBe(0);
  expect(updated.status).toBe('WAIVED');
});
```

Run test: ❌ FAILS (route doesn't exist)

**Step 2: Write code to pass (GREEN)**
```javascript
// Add route
router.post('/:id/waive', authenticate, authorize('ADMIN'), waiveFine);

// Add controller
export const waiveFine = async (req, res, next) => {
  try {
    await waiveFineService(Number(req.params.id), req.user.id);
    return successResponse(res, { message: 'Fine waived' });
  } catch (error) {
    return next(error);
  }
};

// Add service
export const waiveFineService = async (accountLineId, managerId) => {
  await prisma.accountLine.update({
    where: { accountlines_id: accountLineId },
    data: {
      amountoutstanding: 0,
      status: 'WAIVED',
      manager_id: managerId
    }
  });
};
```

Run test: ✅ PASSES

**Step 3: Refactor if needed**
- Code looks good!
- Move on to next feature

---

## ❓ Q&A: Testing Questions

### Q1: Why do tests need to reset the database?
**A:** Tests should be **isolated** and **repeatable**. If Test 1 creates a user, Test 2 shouldn't see it. Each test starts fresh.

### Q2: What if I want to keep test data to inspect?
**A:** Comment out `resetDatabase()` temporarily:
```javascript
beforeEach(async () => {
  // await resetDatabase();  // Commented out
  await seedBaseData();
});
```

### Q3: How do I run just one test?
**A:** Use `.only`:
```javascript
it.only('should do something', async () => {
  // This is the only test that will run
});
```

### Q4: How do I skip a test temporarily?
**A:** Use `.skip`:
```javascript
it.skip('should do something', async () => {
  // This test will be skipped
});
```

### Q5: What's the difference between toBe() and toEqual()?
**A:**
- `toBe()` - Checks exact reference (===)
- `toEqual()` - Checks value equality (deep comparison)

```javascript
const obj1 = { name: 'John' };
const obj2 = { name: 'John' };

expect(obj1).toBe(obj1);     // ✅ Same object
expect(obj1).toBe(obj2);     // ❌ Different objects
expect(obj1).toEqual(obj2);  // ✅ Same values
```

### Q6: How do I test error cases?
**A:**
```javascript
it('should throw error for invalid input', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send({ invalid: 'data' });

  expect(response.status).toBe(422);
  expect(response.body.success).toBe(false);
  expect(response.body.error.message).toContain('Validation failed');
});
```

### Q7: How do I test async code?
**A:** Use `async/await`:
```javascript
it('should handle async operation', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe('expected value');
});
```

### Q8: What's supertest?
**A:** Library for testing HTTP servers:
```javascript
import request from 'supertest';
import app from './app.js';

// Makes actual HTTP request to your Express app
await request(app)
  .get('/api/endpoint')
  .expect(200);
```

### Q9: Why do we need test utilities?
**A:** DRY principle (Don't Repeat Yourself). Instead of:
```javascript
// In every test
const hashedPassword = await bcrypt.hash('password', 10);
const borrower = await prisma.borrower.create({...});
const token = generateToken({...});
```

We have:
```javascript
// In one place
const { borrower, token } = await createBorrowerWithToken();
```

### Q10: How much should I test?
**A:**
- ✅ Test happy paths (normal usage)
- ✅ Test error cases (invalid input)
- ✅ Test edge cases (boundary conditions)
- ✅ Test business rules (checkout limits, fines, etc.)
- ❌ Don't test framework code (Prisma, Express)
- ❌ Don't test trivial getters/setters

---

## 🎓 Testing Best Practices

### 1. Test Names Should Be Descriptive
```javascript
// ❌ Bad
it('works', async () => { ... });

// ✅ Good
it('allows member to checkout available item', async () => { ... });
it('prevents checkout when member has too many items', async () => { ... });
```

### 2. Each Test Should Test One Thing
```javascript
// ❌ Bad - Tests multiple things
it('should handle checkout and return', async () => {
  // Checkout logic
  // Return logic
  // Too much in one test!
});

// ✅ Good - Separate tests
it('should allow checkout', async () => { ... });
it('should allow return', async () => { ... });
```

### 3. Arrange-Act-Assert Pattern
```javascript
it('should do something', async () => {
  // ARRANGE: Set up test data
  const data = { ... };
  
  // ACT: Perform action
  const result = await doSomething(data);
  
  // ASSERT: Check results
  expect(result).toBe(expected);
});
```

### 4. Use Descriptive Variable Names
```javascript
// ❌ Bad
const u = await createUser();
const t = generateToken();

// ✅ Good
const borrower = await createBorrower();
const authToken = generateToken({ id: borrower.id });
```

### 5. Don't Test Implementation Details
```javascript
// ❌ Bad - Tests HOW it works
it('should call prisma.borrower.create', async () => {
  // Checking internal implementation
});

// ✅ Good - Tests WHAT it does
it('should create a new borrower', async () => {
  // Checking outcome
});
```

---

## 📊 Test Coverage Goals

Your project aims for:

- **80%+ statement coverage** - Most code executed by tests
- **70%+ branch coverage** - Most if/else paths tested
- **90%+ function coverage** - Most functions tested
- **100% critical path coverage** - All important features tested

**Critical paths:**
- Authentication
- Checkout/Return
- Fine calculation
- Authorization checks

---

## 🚀 Running Tests in CI/CD

In production, tests run automatically on every code change:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## 🎯 Key Takeaways

1. **Unit tests** test functions in isolation
2. **Integration tests** test complete API endpoints
3. **Test utilities** make tests easier to write
4. **beforeEach** resets state for each test
5. **Arrange-Act-Assert** pattern for clarity
6. **Tests document expected behavior**
7. **Tests catch regressions** when code changes
8. **Coverage** shows what's tested
9. **TDD** writes tests first, code second
10. **Your project has comprehensive test coverage!**

---

**Next: Final Guide - Submission Checklist** (How to submit your project)
