# FinanceFlow Backend

Node.js + SQLite backend for the FinanceFlow application.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Or start in production mode:**
   ```bash
   npm start
   ```

The server will start at `http://localhost:3000`

## API Endpoints

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Finance Entries
- `GET /api/entries` - List entries (with optional filters)
- `GET /api/entries/:id` - Get entry by ID
- `POST /api/entries` - Create new entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `GET /api/invoices/next-number` - Get next invoice number
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get setting by key
- `PUT /api/settings/:key` - Update setting

### Analytics
- `GET /api/analytics/financial-summary` - Financial summary
- `GET /api/analytics/monthly/:year` - Monthly data
- `GET /api/analytics/payment-modes` - Payment mode distribution
- `GET /api/analytics/status-distribution` - Status distribution
- `GET /api/analytics/yearly-revenue` - Yearly revenue

### Data Management
- `GET /api/export` - Export all data
- `POST /api/import` - Import data
- `DELETE /api/clear` - Clear all data

## Switching Frontend to API

To use the backend API instead of IndexedDB, replace the script tag in `index.html`:

```html
<!-- Change this -->
<script src="js/data.js"></script>

<!-- To this -->
<script src="js/data-api.js"></script>
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
PORT=3000
NODE_ENV=development
DATABASE_PATH=./database/financeflow.db
CORS_ORIGIN=*
```

## Tech Stack

- **Express.js** - Web framework
- **better-sqlite3** - SQLite database
- **Helmet** - Security headers
- **CORS** - Cross-origin support
- **Morgan** - HTTP request logging
