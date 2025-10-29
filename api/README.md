# Library Management API

Express + Prisma REST API for the Library Management System schema. Provides JWT authentication, role-based access control, validation, Swagger documentation, and business logic for circulation, holds, and fines.

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL running locally (default connection: `postgres://postgres:suhail123@localhost:5433`)

## Quick Start

1. **Clone / open** this repository and enter the `api` folder:
   ```cmd
   cd api
   ```
2. **Install dependencies**:
   ```cmd
   npm install
   ```
3. **Create a database** (run once in `psql`):
   ```sql
   CREATE DATABASE library_management;
   ```
4. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Adjust `DATABASE_URL`, `JWT_SECRET`, etc. if needed
5. **Generate Prisma client & run migrations**:
   ```cmd
   npx prisma migrate dev --name init
   ```
6. **Seed reference data** (categories, item types, system preferences):
   ```cmd
   npx prisma db seed
   ```
7. **Run the API**:
   ```cmd
   npm run dev
   ```
   The server listens on `http://localhost:4000` (configurable via `PORT`).

## Documentation

- Swagger UI is hosted at `http://localhost:4000/docs`
- OpenAPI schema is generated from the route annotations in `src/routes`

## Default Data

`prisma/seed.js` inserts:
- Patron categories: ADULT, CHILD, STAFF
- Item types: BOOK, EBOOK, DVD, MAGAZINE, AUDIO
- System preferences: version, fine amounts, renewal limits, hold expiry

> **Note:** No users are seeded. Use `POST /api/auth/register` to create the first admin, then promote others via `PUT /api/borrowers/:id` (admin only).

Example admin registration payload:
```json
{
  "cardnumber": "ADMIN001",
  "fullName": "Library Admin",
  "email": "admin@example.com",
  "password": "ChangeMe123!",
  "categorycode": "STAFF",
  "role": "ADMIN"
}
```

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development server with auto-reload |
| `npm start` | Start server in production mode |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run interactive migration workflow |
| `npm run prisma:studio` | Open Prisma Studio database browser |

## Project Structure

```
api/
├── prisma/
│   ├── schema.prisma        # ORM schema definition
│   └── seed.js              # Seeds categories, item types, system prefs
├── src/
│   ├── app.js               # Express app configuration
│   ├── server.js            # Entry point
│   ├── config/              # Environment configuration
│   ├── controllers/         # Route handlers (thin)
│   ├── services/            # Business logic & Prisma queries
│   ├── routes/              # Express routers + Swagger annotations
│   ├── middleware/          # Auth, validation, error handling
│   ├── validators/          # express-validator schemas
│   ├── docs/                # Swagger generator
│   └── utils/               # Helpers (tokens, pagination, responses)
└── README.md
```

## Testing the API

- Import the Swagger JSON into Postman/Insomnia or interact directly via Swagger UI
- Each request must include `Authorization: Bearer <token>` header after login/register
- Example flow for a member:
  1. Register via `POST /api/auth/register`
  2. Login via `POST /api/auth/login`
  3. Browse catalog via `GET /api/biblio`
  4. Place hold via `POST /api/reserves`
  5. Checkout via `POST /api/circulation/checkout`

## Next Steps / Enhancements

- Add automated tests (Jest + supertest)
- Implement background jobs (e.g., hold expiry) using `node-cron`
- Add email/SMS notifications for holds and overdue notices
- Containerize the service with Docker for consistent deployments
