/**
 * FinanceFlow Backend - Database Connection & Initialization
 * Uses better-sqlite3 for synchronous SQLite operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Resolve full database path
const dbPath = path.resolve(
    __dirname,
    process.env.DATABASE_PATH || 'financeflow.db'
);

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection (verbose logging disabled for cleaner output)
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema
 */
function initializeDatabase() {
    // Create clients table
    db.exec(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create finance_entries table
    db.exec(`
        CREATE TABLE IF NOT EXISTS finance_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            client_name TEXT NOT NULL,
            description TEXT,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            status TEXT NOT NULL CHECK(status IN ('pending', 'received')),
            payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create invoices table
    db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            agency_name TEXT,
            agency_contact TEXT,
            agency_address TEXT,
            agency_logo TEXT,
            client_name TEXT NOT NULL,
            client_phone TEXT,
            client_address TEXT,
            invoice_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            subtotal REAL NOT NULL DEFAULT 0,
            tax_percent REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            discount_percent REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            grand_total REAL NOT NULL DEFAULT 0,
            payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create invoice_services table
    db.exec(`
        CREATE TABLE IF NOT EXISTS invoice_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            rate REAL NOT NULL DEFAULT 0,
            amount REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
    `);

    // Create settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create users table
    // Updated with fields for verification and OTP
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT,
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            reset_token TEXT,
            reset_token_expiry INTEGER,
            otp TEXT,
            otp_expiry INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Create login_history table
    db.exec(`
        CREATE TABLE IF NOT EXISTS login_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better query performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_entries_date ON finance_entries(date);
        CREATE INDEX IF NOT EXISTS idx_entries_client ON finance_entries(client_name);
        CREATE INDEX IF NOT EXISTS idx_entries_type ON finance_entries(type);
        CREATE INDEX IF NOT EXISTS idx_entries_status ON finance_entries(status);
        CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_name);
        CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
        CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    `);

    console.log('✅ Database initialized successfully');
}

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = { db, initializeDatabase };
