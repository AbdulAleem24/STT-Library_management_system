# PostgreSQL Extensions Documentation

This document explains all **PostgreSQL extensions** enabled in the library management system.

---

## 📑 Table of Contents

1. [What Are Extensions?](#what-are-extensions)
2. [Enabled Extensions Overview](#enabled-extensions-overview)
3. [uuid-ossp Extension](#uuid-ossp-extension)
4. [pgcrypto Extension](#pgcrypto-extension)
5. [pg_trgm Extension](#pg_trgm-extension)
6. [Extension Management](#extension-management)

---

## 🎯 What Are Extensions?

**PostgreSQL extensions** are add-on modules that provide additional functionality beyond core PostgreSQL.

### How Extensions Work

```
PostgreSQL Core
┌────────────────────────────────────┐
│ Basic SQL, Tables, Indexes, etc.   │
└────────────────────────────────────┘
              ↓
         Extensions
┌────────────────────────────────────┐
│ • UUID generation                  │
│ • Cryptographic functions          │
│ • Full-text search enhancements    │
│ • Geographic data types            │
│ • And hundreds more...             │
└────────────────────────────────────┘
```

### Benefits

✅ **Modular** - Only enable what you need  
✅ **Tested** - Community-maintained and reliable  
✅ **Performant** - Implemented in C for speed  
✅ **Standard** - Available on most PostgreSQL installations

### Installing Extensions

```sql
-- Enable an extension
CREATE EXTENSION IF NOT EXISTS extension_name;

-- Check if extension is installed
SELECT * FROM pg_extension WHERE extname = 'extension_name';

-- List all available extensions
SELECT * FROM pg_available_extensions ORDER BY name;
```

---

## 📋 Enabled Extensions Overview

Our library system uses **3 extensions**:

| Extension | Version | Purpose | Used For |
|-----------|---------|---------|----------|
| **uuid-ossp** | 1.1 | UUID generation | Unique identifiers, security tokens |
| **pgcrypto** | 1.3 | Cryptography | Password hashing, encryption |
| **pg_trgm** | 1.6 | Trigram matching | Fuzzy search, typo tolerance |

### Installation

```sql
-- Enable all required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 🔑 uuid-ossp Extension

### Purpose

Generates **UUIDs** (Universally Unique Identifiers) - 128-bit unique values.

### What is a UUID?

```
Example UUID: 550e8400-e29b-41d4-a716-446655440000

Structure:
550e8400  - Time-based component
e29b      - Clock sequence
41d4      - Version (4 = random)
a716      - Variant
446655440000 - Node (MAC address or random)

Uniqueness: 2^128 possible values (340 undecillion)
Collision probability: Effectively zero
```

### Available Functions

```sql
-- UUID v1: Time-based (includes timestamp and MAC address)
uuid_generate_v1()

-- UUID v1mc: Time-based with random MAC
uuid_generate_v1mc()

-- UUID v4: Purely random (most common)
uuid_generate_v4()

-- UUID v5: Name-based (SHA-1 hash)
uuid_generate_v5(namespace uuid, name text)
```

### Usage in Our System

#### 1. **Session Tokens**
```sql
-- Generate unique session token
INSERT INTO user_sessions (user_id, session_token, created_at)
VALUES (5, uuid_generate_v4(), NOW());

-- Result: session_token = '7f3e7c1a-9b2d-4e5f-8a6c-1d2e3f4a5b6c'
```

#### 2. **API Keys**
```sql
-- Generate API key for third-party integrations
INSERT INTO api_keys (key, description, created_at)
VALUES (uuid_generate_v4(), 'Mobile app integration', NOW());
```

#### 3. **Temporary Upload IDs**
```sql
-- Track file uploads
CREATE TABLE temp_uploads (
    upload_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. **Unique Barcodes** (Alternative)
```sql
-- Generate unique item barcodes
UPDATE items 
SET barcode = '3' || uuid_generate_v4()::text
WHERE barcode IS NULL;

-- Result: barcode = '3550e8400-e29b-41d4-a716-446655440000'
```

### Why Not Use UUIDs for Primary Keys?

We use **SERIAL** (auto-increment integers) instead of UUIDs for primary keys because:

**Advantages of SERIAL**:
- Smaller (4 bytes vs 16 bytes)
- Faster joins
- Sequential = better index performance
- Human-readable (item #1, #2, #3)

**When to Use UUIDs**:
- External-facing identifiers (hide counts)
- Distributed systems (multiple databases)
- Security tokens
- Merge databases without ID conflicts

### Performance Considerations

```sql
-- UUID storage: 16 bytes
-- INTEGER storage: 4 bytes
-- BIGINT storage: 8 bytes

Table with 1 million rows:
- UUID PKs: 16 MB
- INTEGER PKs: 4 MB
- Savings: 75% space
```

---

## 🔐 pgcrypto Extension

### Purpose

Provides **cryptographic functions** for hashing, encryption, and secure random generation.

### Available Functions

#### Hashing Functions
```sql
-- SHA-256 hash
digest(data text, type text) returns bytea

-- Common hash types:
'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'
```

#### Password Hashing
```sql
-- Generate password hash (bcrypt - best for passwords)
crypt(password text, salt text) returns text

-- Auto-generate salt
gen_salt(type text) returns text

-- Verify password
crypt(input_password, stored_hash) = stored_hash
```

#### Random Data
```sql
-- Generate random bytes
gen_random_bytes(count integer) returns bytea

-- Generate random UUID (alternative to uuid_generate_v4)
gen_random_uuid() returns uuid
```

#### Encryption/Decryption
```sql
-- PGP encryption
pgp_sym_encrypt(data text, password text) returns bytea
pgp_sym_decrypt(encrypted bytea, password text) returns text

-- Raw encryption
encrypt(data bytea, key bytea, type text) returns bytea
decrypt(data bytea, key bytea, type text) returns bytea
```

### Usage in Our System

#### 1. **Password Hashing** (Most Important!)
```sql
-- Hash password during registration
INSERT INTO borrowers (full_name, userid, password)
VALUES (
    'John Smith',
    'jsmith',
    crypt('user_password', gen_salt('bf'))  -- bcrypt
);

-- Verify password during login
SELECT * FROM borrowers
WHERE userid = 'jsmith'
  AND password = crypt('user_input', password);

-- If password matches, user authenticated ✓
```

**Bcrypt Benefits**:
- Slow by design (prevents brute force)
- Auto-salted (prevents rainbow tables)
- Configurable work factor
- Industry standard

#### 2. **Secure Token Generation**
```sql
-- Generate password reset token
INSERT INTO password_reset_tokens (user_id, token, expires_at)
VALUES (
    5,
    encode(gen_random_bytes(32), 'hex'),  -- 64-character token
    NOW() + INTERVAL '1 hour'
);

-- Result: token = 'a7f3e2b1c8d4f6e9a3b7c5d8f2e4a1b6c9d3e7f8a2b5c8d1e4f7a9b3c6d2e5'
```

#### 3. **Encrypt Sensitive Data**
```sql
-- Encrypt patron's SSN or sensitive info
UPDATE borrowers
SET encrypted_ssn = pgp_sym_encrypt('123-45-6789', 'encryption_key')
WHERE borrowernumber = 5;

-- Decrypt when needed
SELECT 
    full_name,
    pgp_sym_decrypt(encrypted_ssn, 'encryption_key') as ssn
FROM borrowers
WHERE borrowernumber = 5;
```

#### 4. **Hash Checksums**
```sql
-- Verify file integrity
INSERT INTO uploaded_files (filename, content, checksum)
VALUES (
    'patron_import.csv',
    pg_read_binary_file('patron_import.csv'),
    encode(digest(pg_read_binary_file('patron_import.csv'), 'sha256'), 'hex')
);

-- Verify file hasn't changed
SELECT filename
FROM uploaded_files
WHERE encode(digest(content, 'sha256'), 'hex') = checksum;
```

### Password Hashing Best Practices

```sql
-- ❌ BAD: Plain text passwords
UPDATE borrowers SET password = 'mypassword';  -- NEVER DO THIS!

-- ❌ BAD: MD5 hash (too fast, easily cracked)
UPDATE borrowers SET password = md5('mypassword');

-- ❌ BAD: SHA-256 (too fast for passwords)
UPDATE borrowers SET password = encode(digest('mypassword', 'sha256'), 'hex');

-- ✅ GOOD: Bcrypt (slow, salted, secure)
UPDATE borrowers SET password = crypt('mypassword', gen_salt('bf'));

-- ✅ GOOD: Bcrypt with custom work factor
UPDATE borrowers SET password = crypt('mypassword', gen_salt('bf', 12));
-- Work factor 12 = 2^12 = 4,096 iterations (more secure, slower)
```

### Salt Types

```sql
gen_salt('bf')      -- Blowfish (bcrypt) - RECOMMENDED for passwords
gen_salt('bf', 10)  -- Bcrypt with work factor 10 (default)
gen_salt('bf', 12)  -- Bcrypt with work factor 12 (more secure)
gen_salt('md5')     -- MD5 (legacy, not recommended)
gen_salt('xdes')    -- Extended DES (legacy)
```

---

## 🔍 pg_trgm Extension

### Purpose

Enables **trigram-based text search** for fuzzy matching and similarity ranking.

### What Are Trigrams?

**Trigrams** are groups of 3 consecutive characters extracted from a string.

```
Text: "Gatsby"
Trigrams: ["  G", " Ga", "Gat", "ats", "tsb", "sby", "by "]
          ^padding with spaces for beginning/end

Text: "Gastby" (typo)
Trigrams: ["  G", " Ga", "Gas", "ast", "stb", "tby", "by "]

Matching trigrams: "  G", " Ga", "by "
Similarity = 3 / 7 = 42.9% (similar!)
```

### Available Functions

```sql
-- Similarity (0.0 to 1.0)
similarity(text1 text, text2 text) returns real

-- Check if similar (> threshold, default 0.3)
text1 % text2  -- Returns boolean

-- Word similarity
word_similarity(text1 text, text2 text) returns real

-- Distance (inverse of similarity)
text1 <-> text2  -- Returns real, useful for ORDER BY

-- Show trigrams
show_trgm(text) returns text[]
```

### Usage in Our System

#### 1. **Fuzzy Title Search**
```sql
-- Find books with typos
SELECT title, author
FROM biblio
WHERE title % 'Great Gastby'  -- Typo: "Gastby" instead of "Gatsby"
ORDER BY similarity(title, 'Great Gastby') DESC
LIMIT 5;

-- Results:
-- "The Great Gatsby" - similarity: 0.85
-- "The Great Gilly Hopkins" - similarity: 0.45
```

#### 2. **Fuzzy Author Search**
```sql
-- Search with misspelled author
SELECT title, author
FROM biblio
WHERE author % 'Fitzgerlad'  -- Typo: missing "d"
ORDER BY similarity(author, 'Fitzgerlad') DESC;

-- Results:
-- "F. Scott Fitzgerald" - similarity: 0.92
```

#### 3. **Autocomplete/Suggestions**
```sql
-- Suggest titles as user types
SELECT title
FROM biblio
WHERE title % 'gre gat'  -- User typed partial
ORDER BY title <-> 'gre gat'  -- Distance operator (smaller = closer)
LIMIT 10;

-- Results:
-- "The Great Gatsby"
-- "The Great Gilly Hopkins"
-- "Great Expectations"
```

#### 4. **Duplicate Detection**
```sql
-- Find potential duplicate entries
SELECT b1.title, b2.title, similarity(b1.title, b2.title) as sim
FROM biblio b1, biblio b2
WHERE b1.biblionumber < b2.biblionumber
  AND similarity(b1.title, b2.title) > 0.7
ORDER BY sim DESC;

-- Results:
-- "Harry Potter and the Philosopher's Stone" / "Harry Potter and the Sorcerer's Stone" - 0.93
```

### GiST Index for Performance

```sql
-- Fuzzy search is SLOW without index
SELECT * FROM biblio WHERE title % 'gatsby';  -- 500ms

-- Create GiST index
CREATE INDEX idx_biblio_title_trgm 
ON biblio USING gist(title gist_trgm_ops);

-- Now fuzzy search is FAST
SELECT * FROM biblio WHERE title % 'gatsby';  -- 20ms
```

### Similarity Threshold

```sql
-- Check current threshold
SHOW pg_trgm.similarity_threshold;  -- Default: 0.3 (30%)

-- Set threshold (session-level)
SET pg_trgm.similarity_threshold = 0.5;  -- Require 50% similarity

-- Strict matching
SET pg_trgm.similarity_threshold = 0.8;  -- Require 80% similarity

-- Loose matching
SET pg_trgm.similarity_threshold = 0.2;  -- Allow 20% similarity
```

### Use Cases

| Use Case | Function | Example |
|----------|----------|---------|
| **Typo tolerance** | `%` operator | "gastby" finds "gatsby" |
| **Search suggestions** | `<->` distance | Order by closest match |
| **Duplicate detection** | `similarity()` | Find similar entries |
| **Autocomplete** | `%` + LIMIT | Suggest as user types |
| **Fuzzy joins** | `%` in JOIN | Match similar names |

---

## 🔧 Extension Management

### Check Installed Extensions

```sql
-- List installed extensions
SELECT * FROM pg_extension;

-- Extension details
\dx+ uuid-ossp

-- Functions provided by extension
SELECT proname 
FROM pg_proc 
WHERE pronamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
)
AND proname LIKE 'uuid%';
```

### Update Extensions

```sql
-- Check for updates
SELECT * FROM pg_available_extension_versions 
WHERE name = 'pg_trgm';

-- Update extension
ALTER EXTENSION pg_trgm UPDATE TO '1.6';
```

### Remove Extensions

```sql
-- Remove extension (careful!)
DROP EXTENSION IF EXISTS extension_name CASCADE;

-- CASCADE removes dependent objects (indexes, functions)
```

### Supabase Extensions

Supabase pre-enables many extensions. Available extensions include:

```sql
-- View available in Supabase
SELECT * FROM pg_available_extensions 
WHERE installed_version IS NOT NULL
ORDER BY name;

-- Common Supabase extensions:
-- • uuid-ossp (UUIDs)
-- • pgcrypto (Crypto)
-- • pg_trgm (Trigrams)
-- • pg_stat_statements (Performance monitoring)
-- • pgjwt (JWT tokens)
-- • plpgsql (Procedural language)
-- • postgis (Geographic data)
```

---

## 📝 Summary

### Extension Usage Summary

| Extension | Used For | Performance Impact |
|-----------|----------|-------------------|
| **uuid-ossp** | Session tokens, unique IDs | Minimal |
| **pgcrypto** | Password hashing, encryption | Low (hashing is intentionally slow) |
| **pg_trgm** | Fuzzy search, typo tolerance | High gain with GiST index |

### Key Takeaways

1. **uuid-ossp**: Generate secure unique identifiers
2. **pgcrypto**: **Never store plain text passwords** - always use bcrypt
3. **pg_trgm**: Enable fuzzy search for better user experience

### Security Best Practices

✅ **DO**:
- Use `crypt()` with bcrypt for passwords
- Generate secure tokens with `gen_random_bytes()`
- Set appropriate work factors for bcrypt (10-12)
- Use UUIDs for session tokens

❌ **DON'T**:
- Store plain text passwords
- Use MD5 or SHA for password hashing
- Reuse the same salt for multiple passwords
- Hard-code encryption keys

### Performance Tips

- **UUID generation**: Very fast (~0.1ms)
- **Password hashing**: Intentionally slow (~100ms) to prevent brute force
- **Trigram search**: Fast with GiST index (~20ms), slow without (~500ms)

These three extensions provide **essential functionality** for a modern, secure library management system while maintaining excellent performance.
