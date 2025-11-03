# Library Management System API

A RESTful API for library management built with Node.js, Express, Prisma ORM, and PostgreSQL. Features JWT authentication, role-based access control, circulation management, reservations, and fine tracking.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Quick Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd STT-Library_Management_System/api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your database credentials and JWT secret.

4. **Create database**
   ```sql
   CREATE DATABASE library_management;
   ```

5. **Run migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Seed database**
   ```bash
   npx prisma db seed
   ```

7. **Start server**
   ```bash
   npm run dev
   ```
   API runs at `http://localhost:4000`

## API Documentation

Interactive Swagger documentation: `http://localhost:4000/docs`

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile

### Core Endpoints

#### Borrowers (Members)
- `GET /api/borrowers` - List all borrowers (Admin)
- `GET /api/borrowers/:id` - Get borrower details
- `POST /api/borrowers` - Create borrower (Admin)
- `PUT /api/borrowers/:id` - Update borrower
- `DELETE /api/borrowers/:id` - Delete borrower (Admin)

#### Biblio (Catalog)
- `GET /api/biblio` - Search catalog (pagination, filters)
- `GET /api/biblio/:id` - Get biblio details
- `POST /api/biblio` - Create biblio record (Admin)
- `PUT /api/biblio/:id` - Update biblio (Admin)
- `DELETE /api/biblio/:id` - Delete biblio (Admin)

#### Items (Physical copies)
- `GET /api/items` - List items
- `GET /api/items/:id` - Get item details
- `POST /api/items` - Add item (Admin)
- `PUT /api/items/:id` - Update item (Admin)
- `DELETE /api/items/:id` - Delete item (Admin)

#### Circulation (Checkout/Return)
- `POST /api/circulation/checkout` - Checkout item
- `POST /api/circulation/return` - Return item
- `POST /api/circulation/renew` - Renew checkout
- `GET /api/circulation/history` - Checkout history (Admin)

#### Reserves (Holds)
- `GET /api/reserves` - List reserves
- `GET /api/reserves/:id` - Get reserve details
- `POST /api/reserves` - Place hold on item
- `PUT /api/reserves/:id` - Update reserve
- `DELETE /api/reserves/:id` - Cancel reserve

#### Accounts (Fines)
- `GET /api/accounts` - List account lines
- `GET /api/accounts/:id` - Get account details
- `POST /api/accounts/:id/pay` - Pay fine
- `PUT /api/accounts/:id/waive` - Waive fine (Admin)

#### System Preferences
- `GET /api/system-preferences` - List settings (Admin)
- `PUT /api/system-preferences/:variable` - Update setting (Admin)

### Request Format

All authenticated requests require JWT token:
```
Authorization: Bearer <your-jwt-token>
```

Example registration:
```json
POST /api/auth/register
{
  "cardnumber": "LIB001",
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "categorycode": "ADULT",
  "role": "MEMBER"
}
```

## Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT + bcrypt
- **Validation:** express-validator
- **Documentation:** Swagger/OpenAPI

## Project Structure

```
api/
├── prisma/              # Database schema and migrations
├── src/
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, validation, error handling
│   ├── validators/      # Request validation schemas
│   └── utils/           # Helper functions
└── tests/               # Unit and integration tests
```

## Roles & Permissions

- **MEMBER:** View catalog, checkout, place holds, view own records
- **ADMIN:** Full access to all endpoints and user management

## Additional Documentation

See `/docs` folder for:
- Complete API documentation
- Database schema details
- Development guides
- Testing documentation
