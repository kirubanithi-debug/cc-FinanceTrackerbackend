# FinanceFlow Backend Implementation Plan

## 📋 Overview

This document outlines the complete implementation plan for a Node.js + SQLite backend for the FinanceFlow application. The backend will replace the current IndexedDB-based data layer with a RESTful API.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Existing)                       │
│           HTML + CSS + Vanilla JavaScript                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Node.js Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Express   │  │   Routes    │  │   Controllers       │  │
│  │   Server    │──│   Layer     │──│   Business Logic    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                              │               │
│                                              ▼               │
│                    ┌─────────────────────────────────────┐  │
│                    │       SQLite Database               │  │
│                    │  (better-sqlite3 / sqlite3)         │  │
│                    └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Table: `clients`
| Column      | Type         | Constraints                  | Description           |
|-------------|--------------|------------------------------|-----------------------|
| id          | INTEGER      | PRIMARY KEY AUTOINCREMENT    | Unique identifier     |
| name        | TEXT         | NOT NULL                     | Client name           |
| phone       | TEXT         | NOT NULL                     | Phone number          |
| address     | TEXT         |                              | Client address        |
| created_at  | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Creation timestamp    |
| updated_at  | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Last update timestamp |

### Table: `finance_entries`
| Column       | Type         | Constraints                  | Description                      |
|--------------|--------------|------------------------------|----------------------------------|
| id           | INTEGER      | PRIMARY KEY AUTOINCREMENT    | Unique identifier                |
| date         | TEXT         | NOT NULL                     | Transaction date (YYYY-MM-DD)    |
| client_name  | TEXT         | NOT NULL                     | Client name                      |
| description  | TEXT         |                              | Transaction description          |
| amount       | REAL         | NOT NULL                     | Transaction amount               |
| type         | TEXT         | NOT NULL                     | 'income' or 'expense'            |
| status       | TEXT         | NOT NULL                     | 'pending' or 'received'          |
| payment_mode | TEXT         | NOT NULL                     | cash/upi/bank_transfer/card/cheque |
| created_at   | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Creation timestamp               |
| updated_at   | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Last update timestamp            |

### Table: `invoices`
| Column           | Type         | Constraints                  | Description                    |
|------------------|--------------|------------------------------|--------------------------------|
| id               | INTEGER      | PRIMARY KEY AUTOINCREMENT    | Unique identifier              |
| invoice_number   | TEXT         | UNIQUE NOT NULL              | Invoice number (e.g., INV-0001)|
| agency_name      | TEXT         |                              | Agency name                    |
| agency_contact   | TEXT         |                              | Agency contact                 |
| agency_address   | TEXT         |                              | Agency address                 |
| agency_logo      | TEXT         |                              | Base64 encoded logo            |
| client_name      | TEXT         | NOT NULL                     | Client name                    |
| client_address   | TEXT         |                              | Client address                 |
| invoice_date     | TEXT         | NOT NULL                     | Invoice date (YYYY-MM-DD)      |
| due_date         | TEXT         | NOT NULL                     | Due date (YYYY-MM-DD)          |
| subtotal         | REAL         | NOT NULL                     | Subtotal amount                |
| tax_percent      | REAL         | DEFAULT 0                    | Tax percentage                 |
| tax_amount       | REAL         | DEFAULT 0                    | Tax amount                     |
| discount_percent | REAL         | DEFAULT 0                    | Discount percentage            |
| discount_amount  | REAL         | DEFAULT 0                    | Discount amount                |
| grand_total      | REAL         | NOT NULL                     | Grand total                    |
| payment_status   | TEXT         | DEFAULT 'pending'            | 'pending' or 'paid'            |
| created_at       | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Creation timestamp             |
| updated_at       | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Last update timestamp          |

### Table: `invoice_services`
| Column     | Type         | Constraints                    | Description              |
|------------|--------------|--------------------------------|--------------------------|
| id         | INTEGER      | PRIMARY KEY AUTOINCREMENT      | Unique identifier        |
| invoice_id | INTEGER      | NOT NULL, FOREIGN KEY          | Reference to invoices    |
| name       | TEXT         | NOT NULL                       | Service name             |
| quantity   | INTEGER      | NOT NULL                       | Quantity                 |
| rate       | REAL         | NOT NULL                       | Rate per unit            |
| amount     | REAL         | NOT NULL                       | Total amount (qty × rate)|

### Table: `settings`
| Column     | Type         | Constraints                  | Description           |
|------------|--------------|------------------------------|-----------------------|
| key        | TEXT         | PRIMARY KEY                  | Setting key           |
| value      | TEXT         | NOT NULL                     | Setting value (JSON)  |
| updated_at | TEXT         | DEFAULT CURRENT_TIMESTAMP    | Last update timestamp |

---

## 📁 Project Structure

```
backend/
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
├── .env.example              # Environment template
├── app.js                    # Express app setup
├── server.js                 # Server entry point
├── database/
│   ├── db.js                 # Database connection & initialization
│   ├── schema.sql            # Database schema
│   └── seed.js               # Optional: seed data
├── routes/
│   ├── index.js              # Route aggregator
│   ├── clients.js            # Client routes
│   ├── entries.js            # Finance entries routes
│   ├── invoices.js           # Invoice routes
│   ├── settings.js           # Settings routes
│   └── analytics.js          # Analytics routes
├── controllers/
│   ├── clientsController.js  # Client business logic
│   ├── entriesController.js  # Entries business logic
│   ├── invoicesController.js # Invoice business logic
│   ├── settingsController.js # Settings business logic
│   └── analyticsController.js# Analytics business logic
├── middleware/
│   ├── errorHandler.js       # Global error handler
│   ├── validateRequest.js    # Request validation
│   └── cors.js               # CORS configuration
└── utils/
    ├── formatters.js         # Data formatters
    └── validators.js         # Input validators
```

---

## 🔌 API Endpoints

### Clients API

| Method | Endpoint          | Description            |
|--------|-------------------|------------------------|
| GET    | /api/clients      | Get all clients        |
| GET    | /api/clients/:id  | Get client by ID       |
| POST   | /api/clients      | Create new client      |
| PUT    | /api/clients/:id  | Update client          |
| DELETE | /api/clients/:id  | Delete client          |

### Finance Entries API

| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| GET    | /api/entries              | Get all entries (filtered) |
| GET    | /api/entries/:id          | Get entry by ID            |
| POST   | /api/entries              | Create new entry           |
| PUT    | /api/entries/:id          | Update entry               |
| DELETE | /api/entries/:id          | Delete entry               |
| GET    | /api/entries/summary      | Get financial summary      |

**Query Parameters for GET /api/entries:**
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `month` - Filter by month (0-11)
- `year` - Filter by year
- `type` - Filter by type (income/expense)
- `status` - Filter by status (pending/received)
- `paymentMode` - Filter by payment mode
- `search` - Search by client name or description

### Invoices API

| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/invoices          | Get all invoices         |
| GET    | /api/invoices/:id      | Get invoice by ID        |
| POST   | /api/invoices          | Create new invoice       |
| PUT    | /api/invoices/:id      | Update invoice           |
| DELETE | /api/invoices/:id      | Delete invoice           |
| GET    | /api/invoices/next-number | Get next invoice number |

### Settings API

| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/settings          | Get all settings         |
| GET    | /api/settings/:key     | Get setting by key       |
| PUT    | /api/settings/:key     | Update setting           |

### Analytics API

| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| GET    | /api/analytics/financial-summary | Get financial summary         |
| GET    | /api/analytics/monthly/:year    | Get monthly data for year     |
| GET    | /api/analytics/payment-modes    | Get payment mode distribution |
| GET    | /api/analytics/status-distribution | Get status distribution    |
| GET    | /api/analytics/yearly-revenue   | Get yearly revenue data       |

### Data Management API

| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| GET    | /api/export         | Export all data as JSON  |
| POST   | /api/import         | Import data from JSON    |
| DELETE | /api/clear          | Clear all data           |

---

## 📦 Dependencies

### Production Dependencies
```json
{
  "express": "^4.18.2",
  "better-sqlite3": "^9.4.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0"
}
```

### Development Dependencies
```json
{
  "nodemon": "^3.0.2"
}
```

---

## 🚀 Implementation Steps

### Phase 1: Project Setup ✅
1. Initialize Node.js project with `npm init`
2. Install required dependencies
3. Setup project folder structure
4. Create `.env` configuration
5. Setup Express server with basic middleware

### Phase 2: Database Setup ✅
1. Create SQLite database connection module
2. Define database schema
3. Create tables with proper constraints
4. Add indexes for performance

### Phase 3: API Routes & Controllers ✅
1. Implement Clients CRUD operations
2. Implement Finance Entries CRUD operations
3. Implement Invoices CRUD operations
4. Implement Settings operations
5. Implement Analytics endpoints

### Phase 4: Business Logic ✅
1. Add input validation
2. Implement filtering and sorting
3. Calculate financial summaries
4. Handle export/import functionality

### Phase 5: Frontend Integration ✅
1. Create API client module for frontend
2. Update `data.js` to use API instead of IndexedDB
3. Add error handling and loading states
4. Test all features end-to-end

---

## 🔒 Security Considerations

1. **CORS Configuration** - Allow only specific origins
2. **Helmet.js** - Set security headers
3. **Input Validation** - Validate all user inputs
4. **SQL Injection Prevention** - Use parameterized queries
5. **Error Handling** - Don't expose internal errors

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Pagination Response (for list endpoints)
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🧪 Testing Checklist

- [ ] Clients CRUD operations
- [ ] Finance Entries CRUD with filters
- [ ] Invoices CRUD with services
- [ ] Settings get/update
- [ ] Financial summary calculations
- [ ] Monthly/Yearly analytics
- [ ] Data export/import
- [ ] Error handling
- [ ] Input validation
- [ ] Frontend integration

---

## 📅 Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Project Setup | 30 mins |
| 2 | Database Setup | 30 mins |
| 3 | API Routes & Controllers | 2 hours |
| 4 | Business Logic | 1 hour |
| 5 | Frontend Integration | 1 hour |
| **Total** | | **~5 hours** |

---

## 🎯 Next Steps

1. **Start Implementation** - Begin with Phase 1: Project Setup
2. **Create Database Schema** - Set up SQLite tables
3. **Build API Endpoints** - Implement all CRUD operations
4. **Update Frontend** - Replace IndexedDB with API calls
5. **Test & Debug** - Ensure all features work correctly
