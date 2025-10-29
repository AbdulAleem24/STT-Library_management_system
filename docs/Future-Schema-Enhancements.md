# Future Schema Enhancements
## Library Management System - Expansion Roadmap

**Document Version:** 1.0  
**Created:** October 10, 2025  
**Base Schema Version:** 2.0.0

---

## Table of Contents
1. [Priority 1: Critical Business Features](#priority-1-critical-business-features)
2. [Priority 2: Enhanced User Experience](#priority-2-enhanced-user-experience)
3. [Priority 3: Advanced Management](#priority-3-advanced-management)
4. [Priority 4: Analytics & Intelligence](#priority-4-analytics--intelligence)
5. [Priority 5: Community & Engagement](#priority-5-community--engagement)
6. [Priority 6: Integration & Advanced Features](#priority-6-integration--advanced-features)

---

## Priority 1: Critical Business Features
*Essential for robust library operations*

### 1. `staff_members`
**Priority:** ⭐⭐⭐⭐⭐ (HIGHEST)  
**Purpose:** Separate staff accounts from patron accounts with role-based permissions  
**Why Needed:** Current schema mixes staff and patrons in `borrowers` table

**Proposed Structure:**
```sql
CREATE TABLE staff_members (
    staff_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER UNIQUE REFERENCES borrowers(borrowernumber),
    employee_id VARCHAR(50) UNIQUE,
    hire_date DATE,
    termination_date DATE,
    position VARCHAR(100),
    department VARCHAR(100),
    reports_to INTEGER REFERENCES staff_members(staff_id),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB, -- Role-based access control
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Clear separation of staff vs patron accounts
- Role-based access control (RBAC)
- Staff hierarchy tracking
- Audit trail for staff actions
- Permission management

---

### 2. `payment_transactions`
**Priority:** ⭐⭐⭐⭐⭐ (HIGHEST)  
**Purpose:** Detailed payment processing and reconciliation  
**Why Needed:** Current `accountlines` tracks balances but lacks payment details

**Proposed Structure:**
```sql
CREATE TABLE payment_transactions (
    transaction_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    accountlines_id INTEGER REFERENCES accountlines(accountlines_id),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50), -- 'cash', 'card', 'online', 'check'
    payment_reference VARCHAR(100), -- Transaction ID, check number, etc.
    payment_processor VARCHAR(50), -- 'stripe', 'paypal', etc.
    processor_transaction_id VARCHAR(100),
    status VARCHAR(20), -- 'pending', 'completed', 'failed', 'refunded'
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    processed_by INTEGER REFERENCES staff_members(staff_id),
    receipt_number VARCHAR(50) UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Complete payment audit trail
- Reconciliation with payment processors
- Refund tracking
- Receipt generation
- Financial reporting

---

### 3. `inventory_audits`
**Priority:** ⭐⭐⭐⭐⭐ (HIGHEST)  
**Purpose:** Track physical inventory checks and discrepancies  
**Why Needed:** Essential for loss prevention and collection management

**Proposed Structure:**
```sql
CREATE TABLE inventory_audits (
    audit_id SERIAL PRIMARY KEY,
    audit_date DATE NOT NULL,
    audit_type VARCHAR(50), -- 'full', 'partial', 'spot_check', 'annual'
    location VARCHAR(100),
    conducted_by INTEGER REFERENCES staff_members(staff_id),
    status VARCHAR(20), -- 'in_progress', 'completed', 'cancelled'
    items_expected INTEGER,
    items_found INTEGER,
    items_missing INTEGER,
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_audit_items (
    audit_item_id SERIAL PRIMARY KEY,
    audit_id INTEGER REFERENCES inventory_audits(audit_id),
    itemnumber INTEGER REFERENCES items(itemnumber),
    expected_status VARCHAR(20),
    found_status VARCHAR(20),
    found BOOLEAN,
    discrepancy_reason TEXT,
    action_taken VARCHAR(100),
    scanned_at TIMESTAMP WITH TIME ZONE
);
```

**Benefits:**
- Track missing/lost items
- Regular inventory verification
- Loss prevention
- Collection condition tracking
- Audit compliance

---

### 4. `notifications`
**Priority:** ⭐⭐⭐⭐⭐ (HIGHEST)  
**Purpose:** Centralized notification management for patrons  
**Why Needed:** Essential for due date reminders, hold pickups, overdue notices

**Proposed Structure:**
```sql
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    notification_type VARCHAR(50), -- 'due_soon', 'overdue', 'hold_ready', 'fine_notice', 'account_expiring'
    subject VARCHAR(255),
    message TEXT,
    delivery_method VARCHAR(20), -- 'email', 'sms', 'push', 'in_app'
    delivery_status VARCHAR(20), -- 'pending', 'sent', 'failed', 'read'
    priority VARCHAR(20), -- 'low', 'normal', 'high', 'urgent'
    related_item INTEGER REFERENCES items(itemnumber),
    related_issue INTEGER,
    related_reserve INTEGER REFERENCES reserves(reserve_id),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Automated patron communications
- Multi-channel delivery (email, SMS, app)
- Delivery tracking and retries
- Reduce overdue rates
- Improve patron experience

---

### 5. `patron_preferences`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Store patron communication and account preferences  
**Why Needed:** Personalization and compliance with communication preferences

**Proposed Structure:**
```sql
CREATE TABLE patron_preferences (
    preference_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER UNIQUE REFERENCES borrowers(borrowernumber),
    notification_email BOOLEAN DEFAULT true,
    notification_sms BOOLEAN DEFAULT false,
    notification_push BOOLEAN DEFAULT false,
    due_date_reminder_days INTEGER DEFAULT 3,
    overdue_notices BOOLEAN DEFAULT true,
    hold_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    privacy_level VARCHAR(20), -- 'public', 'private', 'anonymous'
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50),
    reading_history_enabled BOOLEAN DEFAULT true,
    auto_renew_enabled BOOLEAN DEFAULT false,
    preferred_pickup_location VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- GDPR/privacy compliance
- Personalized notifications
- Patron control over communications
- Language preferences
- Auto-renewal options

---

## Priority 2: Enhanced User Experience
*Improves patron engagement and satisfaction*

### 6. `reading_lists`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Allow patrons to create and share custom book lists  
**Why Needed:** Enhances patron engagement and discovery

**Proposed Structure:**
```sql
CREATE TABLE reading_lists (
    list_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    list_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reading_list_items (
    list_item_id SERIAL PRIMARY KEY,
    list_id INTEGER REFERENCES reading_lists(list_id) ON DELETE CASCADE,
    biblionumber INTEGER REFERENCES biblio(biblionumber),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    sort_order INTEGER
);
```

**Benefits:**
- Patron engagement
- Reading tracking
- Community features
- Collection development insights

---

### 7. `reviews_ratings`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Patron reviews and ratings for materials  
**Why Needed:** Social features and discovery enhancement

**Proposed Structure:**
```sql
CREATE TABLE reviews_ratings (
    review_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    biblionumber INTEGER REFERENCES biblio(biblionumber),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_by INTEGER REFERENCES staff_members(staff_id),
    flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(borrowernumber, biblionumber)
);
```

**Benefits:**
- Patron recommendations
- Collection quality feedback
- Community engagement
- Discovery features

---

### 8. `patron_reading_history`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Optional detailed reading history separate from circulation records  
**Why Needed:** Privacy-compliant reading tracking with opt-in

**Proposed Structure:**
```sql
CREATE TABLE patron_reading_history (
    history_id BIGSERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    biblionumber INTEGER REFERENCES biblio(biblionumber),
    read_at DATE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Personalized recommendations
- Reading achievements
- Patron engagement
- Privacy-respecting (opt-in only)

---

### 9. `suggestions`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Patron purchase suggestions/requests  
**Why Needed:** Collection development driven by patron needs

**Proposed Structure:**
```sql
CREATE TABLE suggestions (
    suggestion_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(30),
    publisher VARCHAR(255),
    publication_year INTEGER,
    itemtype VARCHAR(10) REFERENCES itemtypes(itemtype),
    reason TEXT,
    status VARCHAR(20), -- 'pending', 'approved', 'ordered', 'rejected', 'received'
    reviewed_by INTEGER REFERENCES staff_members(staff_id),
    rejection_reason TEXT,
    estimated_cost DECIMAL(10,2),
    quantity_requested INTEGER DEFAULT 1,
    priority_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    ordered_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE
);
```

**Benefits:**
- Patron-driven collection development
- Community engagement
- Demand tracking
- Budget planning

---

## Priority 3: Advanced Management
*Operational efficiency and collection management*

### 10. `vendors`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Manage book suppliers and vendors  
**Why Needed:** Essential for acquisitions and purchasing

**Proposed Structure:**
```sql
CREATE TABLE vendors (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_code VARCHAR(50) UNIQUE,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    website VARCHAR(500),
    payment_terms VARCHAR(100),
    discount_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 11. `purchase_orders`
**Priority:** ⭐⭐⭐⭐ (HIGH)  
**Purpose:** Track book purchases and acquisitions  
**Why Needed:** Budget tracking and acquisition workflow

**Proposed Structure:**
```sql
CREATE TABLE purchase_orders (
    po_id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(vendor_id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    received_date DATE,
    status VARCHAR(20), -- 'draft', 'sent', 'partial', 'completed', 'cancelled'
    total_amount DECIMAL(10,2),
    shipping_cost DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    created_by INTEGER REFERENCES staff_members(staff_id),
    approved_by INTEGER REFERENCES staff_members(staff_id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    po_item_id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(po_id),
    biblionumber INTEGER REFERENCES biblio(biblionumber),
    suggestion_id INTEGER REFERENCES suggestions(suggestion_id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2),
    discount_percent DECIMAL(5,2),
    item_notes TEXT
);
```

**Benefits:**
- Budget management
- Acquisition tracking
- Vendor performance
- Financial reporting

---

### 12. `collection_codes`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Organize items into collections (fiction, reference, children's, etc.)  
**Why Needed:** Better organization and browsing

**Proposed Structure:**
```sql
CREATE TABLE collection_codes (
    collection_code VARCHAR(20) PRIMARY KEY,
    collection_name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Add to items table:
-- ALTER TABLE items ADD COLUMN collection_code VARCHAR(20) REFERENCES collection_codes(collection_code);
```

---

### 13. `item_maintenance`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Track repairs, cleaning, and maintenance of items  
**Why Needed:** Preservation and condition tracking

**Proposed Structure:**
```sql
CREATE TABLE item_maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    itemnumber INTEGER REFERENCES items(itemnumber),
    maintenance_type VARCHAR(50), -- 'repair', 'cleaning', 'rebinding', 'inspection'
    issue_description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    performed_by INTEGER REFERENCES staff_members(staff_id),
    cost DECIMAL(10,2),
    status VARCHAR(20), -- 'scheduled', 'in_progress', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Asset preservation
- Maintenance scheduling
- Cost tracking
- Item condition history

---

### 14. `shelving_locations`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Detailed physical location management  
**Why Needed:** Enhanced location tracking and wayfinding

**Proposed Structure:**
```sql
CREATE TABLE shelving_locations (
    location_id SERIAL PRIMARY KEY,
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50), -- 'shelf', 'display', 'cart', 'storage'
    floor INTEGER,
    section VARCHAR(50),
    aisle VARCHAR(50),
    shelf_range VARCHAR(50),
    capacity INTEGER,
    map_coordinates JSONB, -- {x: 123, y: 456} for floor plan
    is_public BOOLEAN DEFAULT true,
    notes TEXT
);

-- Add to items table:
-- ALTER TABLE items ADD COLUMN shelving_location_id INTEGER REFERENCES shelving_locations(location_id);
```

---

## Priority 4: Analytics & Intelligence
*Data-driven decision making*

### 15. `circulation_statistics`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Pre-aggregated statistics for performance  
**Why Needed:** Fast reporting without complex queries

**Proposed Structure:**
```sql
CREATE TABLE circulation_statistics (
    stat_id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    biblionumber INTEGER REFERENCES biblio(biblionumber),
    checkouts_count INTEGER DEFAULT 0,
    renewals_count INTEGER DEFAULT 0,
    reserves_count INTEGER DEFAULT 0,
    unique_patrons INTEGER DEFAULT 0,
    avg_loan_duration DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stat_date, biblionumber)
);
```

**Benefits:**
- Fast dashboard queries
- Historical trend analysis
- Popular item identification
- Collection development data

---

### 16. `patron_activity_log`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Track patron app/website usage patterns  
**Why Needed:** User experience optimization

**Proposed Structure:**
```sql
CREATE TABLE patron_activity_log (
    activity_id BIGSERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    activity_type VARCHAR(50), -- 'login', 'search', 'checkout', 'renew', 'reserve'
    activity_details JSONB,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Usage analytics
- Feature optimization
- Security monitoring
- Patron behavior insights

---

### 17. `subject_headings`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Subject classification and tagging  
**Why Needed:** Better search and discovery

**Proposed Structure:**
```sql
CREATE TABLE subject_headings (
    subject_id SERIAL PRIMARY KEY,
    subject_heading VARCHAR(255) UNIQUE NOT NULL,
    parent_subject_id INTEGER REFERENCES subject_headings(subject_id),
    description TEXT,
    dewey_decimal VARCHAR(20),
    lc_classification VARCHAR(50)
);

CREATE TABLE biblio_subjects (
    biblio_subject_id SERIAL PRIMARY KEY,
    biblionumber INTEGER REFERENCES biblio(biblionumber),
    subject_id INTEGER REFERENCES subject_headings(subject_id),
    PRIMARY KEY (biblionumber, subject_id)
);
```

**Benefits:**
- Enhanced search
- Browse by subject
- Collection analysis
- Recommendation engine

---

## Priority 5: Community & Engagement
*Building library community*

### 18. `events`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Library programs, book clubs, story time, workshops  
**Why Needed:** Community engagement and programming

**Proposed Structure:**
```sql
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50), -- 'book_club', 'story_time', 'workshop', 'author_talk'
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    max_attendees INTEGER,
    registration_required BOOLEAN DEFAULT false,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    age_restriction VARCHAR(50),
    cost DECIMAL(10,2) DEFAULT 0,
    organizer_id INTEGER REFERENCES staff_members(staff_id),
    status VARCHAR(20), -- 'scheduled', 'cancelled', 'completed'
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_registrations (
    registration_id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(event_id),
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attended BOOLEAN,
    notes TEXT,
    UNIQUE(event_id, borrowernumber)
);
```

**Benefits:**
- Program management
- Attendance tracking
- Community building
- Patron engagement

---

### 19. `resource_bookings`
**Priority:** ⭐⭐ (LOW-MEDIUM)  
**Purpose:** Book study rooms, computers, equipment  
**Why Needed:** Resource management for shared spaces

**Proposed Structure:**
```sql
CREATE TABLE bookable_resources (
    resource_id SERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50), -- 'study_room', 'computer', 'projector', 'meeting_room'
    description TEXT,
    capacity INTEGER,
    location VARCHAR(255),
    is_available BOOLEAN DEFAULT true,
    booking_duration_minutes INTEGER DEFAULT 60,
    advance_booking_days INTEGER DEFAULT 14,
    max_concurrent_bookings INTEGER DEFAULT 1
);

CREATE TABLE resource_bookings (
    booking_id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES bookable_resources(resource_id),
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    booking_start TIMESTAMP WITH TIME ZONE NOT NULL,
    booking_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20), -- 'confirmed', 'checked_in', 'completed', 'cancelled'
    checked_in_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Benefits:**
- Space management
- Equipment tracking
- Usage analytics
- Fair access policies

---

### 20. `digital_resources`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** E-books, databases, streaming services  
**Why Needed:** Modern library services beyond physical items

**Proposed Structure:**
```sql
CREATE TABLE digital_resources (
    digital_resource_id SERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50), -- 'ebook', 'audiobook', 'database', 'streaming', 'magazine'
    provider VARCHAR(255),
    access_url VARCHAR(500),
    simultaneous_users INTEGER,
    authentication_method VARCHAR(50),
    subscription_start DATE,
    subscription_end DATE,
    annual_cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    access_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE digital_resource_usage (
    usage_id BIGSERIAL PRIMARY KEY,
    digital_resource_id INTEGER REFERENCES digital_resources(digital_resource_id),
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    access_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER,
    session_id VARCHAR(100)
);
```

**Benefits:**
- Digital collection management
- Usage tracking
- ROI analysis
- Patron access management

---

## Priority 6: Integration & Advanced Features
*Advanced capabilities*

### 21. `inter_library_loans`
**Priority:** ⭐⭐ (LOW-MEDIUM)  
**Purpose:** ILL requests and tracking  
**Why Needed:** Resource sharing with other libraries

**Proposed Structure:**
```sql
CREATE TABLE inter_library_loans (
    ill_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    request_type VARCHAR(20), -- 'borrow', 'lend'
    lending_library VARCHAR(255),
    borrowing_library VARCHAR(255),
    title VARCHAR(500),
    author VARCHAR(255),
    isbn VARCHAR(30),
    request_date DATE NOT NULL,
    due_date DATE,
    return_date DATE,
    status VARCHAR(20), -- 'requested', 'shipped', 'received', 'returned', 'cancelled'
    cost DECIMAL(10,2),
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 22. `marc_records`
**Priority:** ⭐⭐ (LOW-MEDIUM)  
**Purpose:** Store full MARC21 bibliographic records  
**Why Needed:** Library standard cataloging format

**Proposed Structure:**
```sql
CREATE TABLE marc_records (
    marc_id SERIAL PRIMARY KEY,
    biblionumber INTEGER UNIQUE REFERENCES biblio(biblionumber),
    marc_xml TEXT, -- Full MARC XML
    marc_json JSONB, -- Parsed MARC as JSON
    last_imported TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 23. `api_keys`
**Priority:** ⭐⭐ (LOW-MEDIUM)  
**Purpose:** External API access management  
**Why Needed:** Third-party integrations

**Proposed Structure:**
```sql
CREATE TABLE api_keys (
    api_key_id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_name VARCHAR(255),
    created_by INTEGER REFERENCES staff_members(staff_id),
    permissions JSONB,
    rate_limit INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_usage_logs (
    log_id BIGSERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(api_key_id),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 24. `patron_messages`
**Priority:** ⭐⭐⭐ (MEDIUM)  
**Purpose:** Internal messaging between staff and patrons  
**Why Needed:** Communication and support

**Proposed Structure:**
```sql
CREATE TABLE patron_messages (
    message_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    staff_id INTEGER REFERENCES staff_members(staff_id),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    message_type VARCHAR(20), -- 'info', 'warning', 'question', 'reply'
    parent_message_id INTEGER REFERENCES patron_messages(message_id),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### 25. `saved_searches`
**Priority:** ⭐⭐ (LOW-MEDIUM)  
**Purpose:** Save and share catalog searches  
**Why Needed:** Patron convenience

**Proposed Structure:**
```sql
CREATE TABLE saved_searches (
    search_id SERIAL PRIMARY KEY,
    borrowernumber INTEGER REFERENCES borrowers(borrowernumber),
    search_name VARCHAR(255),
    search_query JSONB,
    notify_on_new BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Implementation Roadmap

### Phase 1: Foundation (Priority 1)
**Timeline:** 1-2 months  
**Tables:** staff_members, payment_transactions, inventory_audits, notifications, patron_preferences

**Impact:** Critical business operations, compliance, user experience

---

### Phase 2: Engagement (Priority 2)
**Timeline:** 2-3 months  
**Tables:** reading_lists, reviews_ratings, patron_reading_history, suggestions

**Impact:** Patron satisfaction, community building, collection development

---

### Phase 3: Operations (Priority 3)
**Timeline:** 3-4 months  
**Tables:** vendors, purchase_orders, collection_codes, item_maintenance, shelving_locations

**Impact:** Operational efficiency, acquisitions workflow, asset management

---

### Phase 4: Intelligence (Priority 4)
**Timeline:** 1-2 months  
**Tables:** circulation_statistics, patron_activity_log, subject_headings

**Impact:** Data-driven decisions, reporting, discovery

---

### Phase 5: Community (Priority 5)
**Timeline:** 2-3 months  
**Tables:** events, resource_bookings, digital_resources

**Impact:** Programming, resource management, modern services

---

### Phase 6: Advanced (Priority 6)
**Timeline:** 2-3 months  
**Tables:** inter_library_loans, marc_records, api_keys, patron_messages, saved_searches

**Impact:** Integration, standards compliance, advanced features

---

## Dependencies & Considerations

### Technical Dependencies
1. **staff_members** should be implemented BEFORE:
   - payment_transactions
   - inventory_audits
   - purchase_orders
   - events

2. **notifications** requires:
   - Email service integration (SendGrid, AWS SES)
   - SMS gateway (Twilio, AWS SNS)
   - Push notification service

3. **payment_transactions** requires:
   - Payment gateway integration (Stripe, PayPal)
   - PCI compliance considerations

### Performance Considerations
- **Large tables:** patron_activity_log, api_usage_logs, notification - use partitioning
- **Indexes:** Add appropriate indexes for each new table
- **Archive strategy:** Implement data retention policies

### Security Considerations
- **PII data:** patron_preferences, patron_messages - encryption at rest
- **API keys:** Store hashed, never plain text
- **GDPR compliance:** Right to be forgotten implementation

---

## Quick Reference: Priority Matrix

| Priority Level | Count | Use Case |
|---------------|-------|----------|
| ⭐⭐⭐⭐⭐ Priority 1 | 5 tables | Critical business operations |
| ⭐⭐⭐⭐ Priority 2 | 4 tables | User experience & engagement |
| ⭐⭐⭐ Priority 3 | 5 tables | Operational efficiency |
| ⭐⭐⭐ Priority 4 | 3 tables | Analytics & intelligence |
| ⭐⭐⭐ Priority 5 | 3 tables | Community programs |
| ⭐⭐ Priority 6 | 5 tables | Advanced features |
| **TOTAL** | **25 tables** | Complete library system |

---

## Estimated Impact by Priority

### Priority 1 (CRITICAL) - 5 Tables
**ROI:** Immediate and High  
**Effort:** Medium to High  
**Timeline:** 1-2 months  
**Benefits:** Core operations, compliance, reduced manual work

### Priority 2 (HIGH) - 4 Tables
**ROI:** High  
**Effort:** Medium  
**Timeline:** 2-3 months  
**Benefits:** Patron retention, engagement, word-of-mouth growth

### Priority 3 (MEDIUM) - 5 Tables
**ROI:** Medium to High  
**Effort:** Medium  
**Timeline:** 3-4 months  
**Benefits:** Efficiency gains, cost reduction, better organization

### Priority 4 (MEDIUM) - 3 Tables
**ROI:** Medium  
**Effort:** Low to Medium  
**Timeline:** 1-2 months  
**Benefits:** Better decisions, trend identification, optimization

### Priority 5 (MEDIUM) - 3 Tables
**ROI:** Medium (Long-term)  
**Effort:** Medium  
**Timeline:** 2-3 months  
**Benefits:** Community engagement, diverse revenue, programming

### Priority 6 (LOW-MEDIUM) - 5 Tables
**ROI:** Low to Medium  
**Effort:** High  
**Timeline:** 2-3 months  
**Benefits:** Advanced capabilities, integrations, standards

---

## Conclusion

This roadmap provides a structured approach to expanding the library management system. Start with Priority 1 tables for immediate business value, then progressively add features based on your library's specific needs and resources.

**Recommended Starting Point:** Implement `staff_members`, `notifications`, and `patron_preferences` first for maximum immediate impact.

---

**Document Version:** 1.0  
**Last Updated:** October 10, 2025  
**Base Schema Version:** 2.0.0
