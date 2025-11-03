# API Documentation

## Overview

The Library Management System API provides RESTful endpoints for managing library operations including catalog management, circulation, reservations, and fine tracking.

**Base URL:** `http://localhost:4000/api`  
**Authentication:** JWT Bearer Token  
**Swagger UI:** `http://localhost:4000/docs`

## Authentication

### Register
```
POST /auth/register
```
**Body:**
```json
{
  "cardnumber": "string",
  "full_name": "string",
  "email": "string",
  "password": "string (min 8 chars)",
  "categorycode": "ADULT|CHILD|STAFF",
  "role": "MEMBER|ADMIN"
}
```
**Response:** `{ success: true, data: { user, token } }`

### Login
```
POST /auth/login
```
**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:** `{ success: true, data: { user, token } }`

### Get Current User
```
GET /auth/me
Headers: Authorization: Bearer <token>
```

## Borrowers

### List Borrowers (Admin)
```
GET /borrowers?page=1&limit=10&search=name
```
**Query Params:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search by name/email

### Get Borrower
```
GET /borrowers/:id
```

### Create Borrower (Admin)
```
POST /borrowers
```
**Body:**
```json
{
  "cardnumber": "string",
  "full_name": "string",
  "email": "string",
  "password": "string",
  "categorycode": "string",
  "phone": "string",
  "address": {}
}
```

### Update Borrower
```
PUT /borrowers/:id
```

### Delete Borrower (Admin)
```
DELETE /borrowers/:id
```

## Biblio (Catalog)

### Search Catalog
```
GET /biblio?page=1&limit=10&search=title&itemtype=BOOK&author=name
```
**Query Params:**
- `page`, `limit` - Pagination
- `search` - Search in title/author/ISBN
- `itemtype` - Filter by type (BOOK, EBOOK, DVD, etc.)
- `author` - Filter by author

### Get Biblio
```
GET /biblio/:id
```
**Response:** Includes items and availability

### Create Biblio (Admin)
```
POST /biblio
```
**Body:**
```json
{
  "title": "string",
  "author": "string",
  "isbn": "string",
  "publisher": "string",
  "publicationyear": 2024,
  "itemtype": "BOOK|EBOOK|DVD|MAGAZINE|AUDIO",
  "abstract": "string"
}
```

### Update Biblio (Admin)
```
PUT /biblio/:id
```

### Delete Biblio (Admin)
```
DELETE /biblio/:id
```

## Items

### List Items
```
GET /items?biblionumber=1&status=available
```
**Query Params:**
- `biblionumber` - Filter by biblio
- `status` - available|on-loan|reserved|damaged|lost

### Get Item
```
GET /items/:id
```

### Create Item (Admin)
```
POST /items
```
**Body:**
```json
{
  "biblionumber": 1,
  "barcode": "string",
  "itemcallnumber": "string",
  "location": "string",
  "price": 29.99,
  "replacementprice": 35.00
}
```

### Update Item (Admin)
```
PUT /items/:id
```

### Delete Item (Admin)
```
DELETE /items/:id
```

## Circulation

### Checkout Item
```
POST /circulation/checkout
```
**Body:**
```json
{
  "borrowernumber": 1,
  "itemnumber": 1,
  "issuedate": "2024-01-15"
}
```
**Business Rules:**
- Item must be available
- Borrower cannot be debarred
- Respects category checkout limits
- Auto-calculates due date

### Return Item
```
POST /circulation/return
```
**Body:**
```json
{
  "itemnumber": 1,
  "returndate": "2024-01-29"
}
```
**Business Rules:**
- Calculates fines for overdue items
- Auto-fills holds if item was reserved
- Updates item status

### Renew Checkout
```
POST /circulation/renew
```
**Body:**
```json
{
  "borrowernumber": 1,
  "itemnumber": 1
}
```
**Business Rules:**
- Max 3 renewals per checkout
- Cannot renew if item has holds
- Cannot renew overdue items

### Checkout History (Admin)
```
GET /circulation/history?borrowernumber=1&page=1&limit=10
```

## Reserves (Holds)

### List Reserves
```
GET /reserves?borrowernumber=1&status=waiting
```
**Query Params:**
- `borrowernumber` - Filter by borrower
- `status` - waiting|filled|cancelled|expired

### Get Reserve
```
GET /reserves/:id
```

### Place Hold
```
POST /reserves
```
**Body:**
```json
{
  "borrowernumber": 1,
  "biblionumber": 1,
  "branchcode": "MAIN"
}
```
**Business Rules:**
- Cannot hold available items
- Max 5 active holds per borrower
- Auto-expires after 7 days if not picked up

### Update Reserve (Admin)
```
PUT /reserves/:id
```
**Body:**
```json
{
  "status": "filled|cancelled"
}
```

### Cancel Reserve
```
DELETE /reserves/:id
```

## Accounts (Fines)

### List Account Lines
```
GET /accounts?borrowernumber=1&status=unpaid
```
**Query Params:**
- `borrowernumber` - Filter by borrower
- `status` - unpaid|paid|waived

### Get Account Line
```
GET /accounts/:id
```

### Pay Fine
```
POST /accounts/:id/pay
```
**Body:**
```json
{
  "amount": 5.00,
  "payment_type": "CASH|CARD|ONLINE"
}
```

### Waive Fine (Admin)
```
PUT /accounts/:id/waive
```
**Body:**
```json
{
  "reason": "string"
}
```

## System Preferences (Admin)

### List Preferences
```
GET /system-preferences
```

### Update Preference
```
PUT /system-preferences/:variable
```
**Body:**
```json
{
  "value": "string|number"
}
```

**Available Preferences:**
- `version` - System version
- `fine_per_day` - Daily overdue fine amount
- `max_fine` - Maximum fine cap
- `max_renewals` - Maximum renewal count
- `hold_expiry_days` - Days before hold expires

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": []
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `BUSINESS_LOGIC_ERROR` - Business rule violation

## Rate Limiting

No rate limiting currently implemented.

## Pagination

All list endpoints support pagination:
```
?page=1&limit=10
```
Default: `page=1`, `limit=10`  
Max limit: `100`

## Filtering & Sorting

Most list endpoints support:
- `search` - Full-text search
- `sort` - Field to sort by
- `order` - asc|desc

Example:
```
GET /biblio?search=harry&sort=title&order=asc
```

## Business Logic Summary

### Checkout Rules
- Item must be available
- Borrower not debarred
- Respects category limits
- Auto-calculates due date from category

### Fine Calculation
- `$0.25/day` overdue fine (configurable)
- Max fine: `$10.00` (configurable)
- Auto-created on return if overdue

### Hold Rules
- Cannot hold available items
- Max 5 active holds per borrower
- Auto-fills on return if waiting
- Expires after 7 days if not picked up

### Renewal Rules
- Max 3 renewals per checkout
- Cannot renew if holds exist
- Cannot renew overdue items
- Extends by category loan period

## Testing

Run tests with:
```bash
npm test
```

Test coverage:
```bash
npm run test:coverage
```

## Further Documentation

- Database Schema: `/docs/SCHEMA_OVERVIEW/`
- Development Guide: `/docs/DEVELOPMENT/`
- Testing Guide: `/docs/DEVELOPMENT/TESTING_DOCUMENTATION_INDEX.md`
