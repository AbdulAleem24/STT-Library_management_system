# Supabase Schema Organization Explained

This document explains the **different schemas** in Supabase and how they organize database objects.

---

## 📑 Table of Contents

1. [What Are Schemas?](#what-are-schemas)
2. [Supabase Schema Overview](#supabase-schema-overview)
3. [public Schema](#public-schema)
4. [auth Schema](#auth-schema)
5. [extensions Schema](#extensions-schema)
6. [realtime Schema](#realtime-schema)
7. [storage Schema](#storage-schema)
8. [Other System Schemas](#other-system-schemas)
9. [Schema Permissions](#schema-permissions)
10. [Best Practices](#best-practices)

---

## 🎯 What Are Schemas?

### Definition

A **schema** is a namespace that contains database objects (tables, views, functions). Think of it as a **folder** for organizing database objects.

### Why Use Schemas?

```
Without Schemas:                 With Schemas:
┌─────────────────────┐         ┌─────────────────────┐
│ All Tables Mixed:   │         │ Organized:          │
│ • users             │         │ public.borrowers    │
│ • borrowers         │         │ public.items        │
│ • items             │         │ auth.users          │
│ • auth_tokens       │         │ auth.sessions       │
│ • ...100+ tables    │         │ storage.objects     │
└─────────────────────┘         └─────────────────────┘
     Chaos!                          Organized!
```

**Benefits**:
1. **Organization** - Group related objects
2. **Security** - Different permissions per schema
3. **Namespacing** - Avoid naming conflicts
4. **Clarity** - Know purpose by schema name

---

## 🌐 Supabase Schema Overview

Supabase organizes the database into **multiple schemas** for different purposes:

| Schema | Owner | Purpose | Your Tables Here? |
|--------|-------|---------|-------------------|
| **public** | You | Application data | ✅ YES |
| **auth** | Supabase | Authentication | ❌ NO (Supabase manages) |
| **extensions** | Supabase | Extension objects | ❌ NO (auto-managed) |
| **realtime** | Supabase | Real-time subscriptions | ❌ NO (Supabase manages) |
| **storage** | Supabase | File storage metadata | ❌ NO (Supabase manages) |

### Schema Hierarchy

```
Database: postgres
│
├── public schema (YOUR APPLICATION DATA)
│   ├── biblio
│   ├── items
│   ├── borrowers
│   ├── issues
│   └── ... (all library tables)
│
├── auth schema (SUPABASE AUTHENTICATION)
│   ├── users
│   ├── sessions
│   ├── refresh_tokens
│   └── ... (auth tables)
│
├── extensions schema (POSTGRESQL EXTENSIONS)
│   ├── uuid_generate_v4()
│   ├── crypt()
│   └── ... (extension functions)
│
├── realtime schema (REAL-TIME FEATURES)
│   ├── subscription
│   ├── messages
│   └── ... (realtime internals)
│
└── storage schema (FILE STORAGE)
    ├── buckets
    ├── objects
    └── ... (storage metadata)
```

---

## 📚 public Schema

### Purpose

The **public** schema is where **your application tables** live. This is the default schema for user-created objects.

### What's In Public?

**All our library tables**:
```sql
public.categories
public.itemtypes
public.biblio
public.items
public.borrowers
public.issues
public.old_issues
public.reserves
public.old_reserves
public.accountlines
public.systempreferences
public.action_logs
```

**All our views**:
```sql
public.available_items
public.overdue_items
public.patron_account_summary
public.popular_items
```

**All our functions**:
```sql
public.is_item_available()
public.can_patron_checkout()
public.get_patron_fines()
... (all utility functions)
```

### Accessing Public Schema

```sql
-- Explicit schema reference
SELECT * FROM public.borrowers;

-- Implicit (public is default)
SELECT * FROM borrowers;  -- Same as above

-- Set search path (order of schema lookup)
SET search_path TO public, extensions;
```

### Default Permissions

```
Authenticated users: Can SELECT, INSERT, UPDATE, DELETE
Anonymous users: Can SELECT (if RLS allows)
```

### Row Level Security (RLS)

Public schema tables support **Row Level Security**:

```sql
-- Enable RLS on table
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own data
CREATE POLICY "Users can view own account"
ON borrowers
FOR SELECT
USING (auth.uid() = userid::uuid);

-- Create policy: Staff can see all
CREATE POLICY "Staff can view all"
ON borrowers
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'staff'
);
```

---

## 🔐 auth Schema

### Purpose

The **auth** schema contains **Supabase authentication** tables and functions. Manages users, sessions, and tokens.

### Key Tables

#### auth.users
```sql
-- Core user identity
auth.users (
    id UUID PRIMARY KEY,  -- User's unique ID
    email TEXT UNIQUE,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMP,
    phone TEXT,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    raw_app_meta_data JSONB,  -- App metadata
    raw_user_meta_data JSONB,  -- User metadata
    ...
)
```

**Purpose**: Every authenticated user has a record here.

**Linking to Your Data**:
```sql
-- Option 1: Store auth.users.id in your table
ALTER TABLE borrowers ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);

-- Option 2: Use email as link
SELECT b.* 
FROM borrowers b
JOIN auth.users u ON b.email = u.email
WHERE u.id = auth.uid();
```

#### auth.sessions
```sql
-- Active user sessions
auth.sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    not_after TIMESTAMP,  -- Session expiry
    ...
)
```

**Purpose**: Track logged-in sessions.

#### auth.refresh_tokens
```sql
-- JWT refresh tokens
auth.refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    token TEXT UNIQUE,
    user_id UUID REFERENCES auth.users,
    parent TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    ...
)
```

**Purpose**: Refresh expired JWT tokens.

### Auth Helper Functions

```sql
-- Get current user's ID
auth.uid() RETURNS UUID

-- Get current user's email
auth.email() RETURNS TEXT

-- Get JWT claims
auth.jwt() RETURNS JSONB

-- Get user role
auth.role() RETURNS TEXT
```

### Common Patterns

#### Pattern 1: Link Auth User to Patron
```sql
-- When user signs up, create patron record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.borrowers (
        auth_user_id,
        full_name,
        email,
        categorycode,
        cardnumber
    ) VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        'ADULT',
        'LIB' || LPAD(nextval('cardnumber_seq')::TEXT, 6, '0')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new auth user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Pattern 2: RLS Using Auth
```sql
-- Patrons can only see their own data
CREATE POLICY "patron_own_data"
ON borrowers
FOR ALL
USING (auth_user_id = auth.uid());

-- Staff can see all data
CREATE POLICY "staff_see_all"
ON borrowers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM borrowers
        WHERE auth_user_id = auth.uid()
        AND categorycode = 'STAFF'
    )
);
```

### Don't Modify Auth Schema

⚠️ **WARNING**: Never directly modify auth schema tables!

```sql
-- ❌ BAD: Direct modification
UPDATE auth.users SET email = 'new@email.com' WHERE id = '...';

-- ✅ GOOD: Use Supabase API
supabase.auth.updateUser({ email: 'new@email.com' })
```

---

## 🔌 extensions Schema

### Purpose

The **extensions** schema contains **extension objects** (functions, types, operators).

### What's In Extensions?

When you enable an extension, its objects go here:

```sql
-- Enable extension
CREATE EXTENSION pg_trgm;

-- Extension functions available in extensions schema
extensions.similarity()
extensions.show_trgm()
```

### Default Search Path

PostgreSQL searches schemas in order:
```sql
SHOW search_path;
-- Result: "$user", public, extensions

-- This means you can call extension functions without schema prefix
SELECT similarity('hello', 'hallo');  -- Works!
-- Actually calling: extensions.similarity()
```

### Common Extension Objects

```sql
-- uuid-ossp
extensions.uuid_generate_v4()

-- pgcrypto
extensions.gen_salt()
extensions.crypt()

-- pg_trgm
extensions.similarity()
extensions.% (operator)
```

### Viewing Extension Objects

```sql
-- List extensions
SELECT * FROM pg_extension;

-- View objects in extensions schema
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_result(p.oid) as result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'extensions'
ORDER BY function_name;
```

---

## 📡 realtime Schema

### Purpose

The **realtime** schema powers **Supabase Realtime** - live updates when data changes.

### How It Works

```javascript
// Subscribe to changes in issues table
const channel = supabase
    .channel('issues-changes')
    .on(
        'postgres_changes',
        {
            event: '*',  // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'issues'
        },
        (payload) => {
            console.log('Issue changed:', payload);
            // Payload contains old and new row data
        }
    )
    .subscribe();

// Real-time updates whenever issues table changes!
```

### Realtime Tables

```sql
-- Realtime metadata
realtime.subscription
realtime.messages
realtime.presence
realtime.broadcast
```

**Purpose**: Track active subscriptions and broadcast messages.

### Enabling Realtime

```sql
-- Enable realtime for a table (Supabase dashboard or SQL)
ALTER PUBLICATION supabase_realtime ADD TABLE issues;

-- Disable realtime
ALTER PUBLICATION supabase_realtime DROP TABLE issues;
```

### Use Cases

- **Dashboard**: Live checkout count
- **Staff Interface**: See checkouts as they happen
- **Patron View**: Live holds queue position
- **Notifications**: Real-time overdue alerts

### Performance Considerations

```
Realtime is powerful but use judiciously:
✅ Small, frequent updates (checkouts, returns)
❌ Large tables with constant changes (logs)
❌ High-frequency updates (millisecond-level)
```

---

## 📦 storage Schema

### Purpose

The **storage** schema manages **file storage** metadata for Supabase Storage.

### Storage Tables

```sql
-- Storage buckets (containers)
storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    owner UUID REFERENCES auth.users,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    public BOOLEAN,  -- Public or private bucket
    ...
)

-- Stored files
storage.objects (
    id UUID PRIMARY KEY,
    bucket_id TEXT REFERENCES storage.buckets,
    name TEXT,  -- File path
    owner UUID REFERENCES auth.users,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata JSONB,
    ...
)
```

### Use Cases for Library System

#### 1. **Cover Images**
```javascript
// Upload book cover
const { data, error } = await supabase.storage
    .from('book-covers')
    .upload(`${biblionumber}/cover.jpg`, file);

// Get public URL
const { publicURL } = supabase.storage
    .from('book-covers')
    .getPublicUrl(`${biblionumber}/cover.jpg`);
```

#### 2. **Patron Photos**
```javascript
// Upload patron photo
await supabase.storage
    .from('patron-photos')
    .upload(`${borrowernumber}/photo.jpg`, file);
```

#### 3. **Documents**
```javascript
// Upload policy documents
await supabase.storage
    .from('documents')
    .upload('policies/circulation-policy.pdf', file);
```

### Storage RLS

Storage buckets support RLS policies:

```sql
-- Only patrons can upload their own photo
CREATE POLICY "patrons_upload_own_photo"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'patron-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Everyone can view book covers
CREATE POLICY "public_book_covers"
ON storage.objects
FOR SELECT
USING (bucket_id = 'book-covers');
```

---

## 🔒 Other System Schemas

### information_schema

```sql
-- Standard SQL metadata
SELECT * FROM information_schema.tables;
SELECT * FROM information_schema.columns WHERE table_name = 'borrowers';
```

**Purpose**: Standard SQL metadata (portable across databases).

### pg_catalog

```sql
-- PostgreSQL system catalog
SELECT * FROM pg_catalog.pg_tables;
SELECT * FROM pg_catalog.pg_indexes;
```

**Purpose**: PostgreSQL-specific metadata (detailed internal info).

---

## 🔐 Schema Permissions

### Default Permissions in Supabase

| Schema | Authenticated Users | Anonymous Users | Service Role |
|--------|---------------------|-----------------|--------------|
| **public** | Read/Write (RLS) | Read (RLS) | Full access |
| **auth** | No direct access | No direct access | Full access |
| **storage** | Read/Write (RLS) | Read (RLS) | Full access |
| **realtime** | Subscribe only | Subscribe only | Full access |

### Granting Permissions

```sql
-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table access
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant function execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Revoke permissions
REVOKE ALL ON schema_name FROM role_name;
```

---

## 📝 Best Practices

### ✅ DO

1. **Keep your tables in public schema**
```sql
CREATE TABLE public.my_table (...);  -- Good
```

2. **Link auth.users to your user table**
```sql
ALTER TABLE borrowers ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
```

3. **Use RLS for security**
```sql
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
```

4. **Enable realtime selectively**
```sql
-- Only for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE issues;
```

5. **Use storage for files**
```javascript
// Store files in storage, not as BYTEA in database
await supabase.storage.from('covers').upload(path, file);
```

### ❌ DON'T

1. **Don't create custom schemas** (in Supabase)
```sql
-- May cause issues with Supabase features
CREATE SCHEMA my_schema;  -- Not recommended
```

2. **Don't modify auth schema**
```sql
ALTER TABLE auth.users ADD COLUMN ...;  -- BAD!
```

3. **Don't store large files in database**
```sql
-- Use storage instead
ALTER TABLE biblio ADD COLUMN cover_image BYTEA;  -- BAD!
```

4. **Don't enable realtime on all tables**
```sql
-- Unnecessary performance overhead
ALTER PUBLICATION supabase_realtime ADD TABLE action_logs;  -- BAD if not needed
```

---

## 🎯 Summary

### Schema Purpose Quick Reference

| Need to... | Use Schema |
|------------|------------|
| Store application data | **public** |
| Authenticate users | **auth** (via Supabase API) |
| Use extensions | **extensions** (auto-managed) |
| Live data updates | **realtime** (enable per table) |
| Store files | **storage** (via Supabase Storage API) |

### Key Takeaways

1. **public** = Your application tables (biblio, items, borrowers, etc.)
2. **auth** = Supabase manages authentication (use auth.uid() in RLS)
3. **extensions** = Extension functions available automatically
4. **realtime** = Enable for live updates on specific tables
5. **storage** = File storage metadata (use Storage API)

### Integration Example

```javascript
// Complete example using all schemas
const App = () => {
    // auth schema: User authentication
    const user = supabase.auth.user();
    
    // public schema: Application data
    const { data: patron } = await supabase
        .from('borrowers')  // public.borrowers
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
    
    // realtime schema: Live updates
    supabase
        .from('issues')  // public.issues
        .on('*', payload => {
            console.log('Checkout happened!', payload);
        })
        .subscribe();
    
    // storage schema: Book cover
    const coverUrl = supabase.storage
        .from('book-covers')  // storage.buckets
        .getPublicUrl(`${biblionumber}/cover.jpg`);
    
    return <PatronDashboard patron={patron} coverUrl={coverUrl} />;
};
```

Understanding Supabase schemas helps you **organize your data** properly and **leverage Supabase features** effectively!
