/**
 * FinanceFlow Admin Utility
 * View and manage database data like a superuser
 * 
 * Usage: node admin.js [command]
 * 
 * Commands:
 *   stats      - Show database statistics
 *   clients    - List all clients
 *   entries    - List all finance entries
 *   invoices   - List all invoices
 *   settings   - Show all settings
 *   export     - Export all data to JSON file
 *   clear      - Clear all data (with confirmation)
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

// Create silent database connection (no SQL logging)
const dbPath = path.resolve(process.env.DATABASE_PATH || './database/financeflow.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Helper function to format table output
function formatTable(rows, columns) {
    if (rows.length === 0) {
        console.log('  (No data)');
        return;
    }

    // Calculate column widths
    const widths = {};
    columns.forEach(col => {
        widths[col] = col.length;
        rows.forEach(row => {
            const val = String(row[col] || '').substring(0, 40);
            if (val.length > widths[col]) widths[col] = val.length;
        });
    });

    // Print header
    let header = '  ';
    let separator = '  ';
    columns.forEach(col => {
        header += col.padEnd(widths[col] + 2);
        separator += '-'.repeat(widths[col]) + '  ';
    });
    console.log(header);
    console.log(separator);

    // Print rows
    rows.forEach(row => {
        let line = '  ';
        columns.forEach(col => {
            const val = String(row[col] || '').substring(0, 40);
            line += val.padEnd(widths[col] + 2);
        });
        console.log(line);
    });
}

// Commands
const commands = {
    stats: () => {
        console.log('\n📊 DATABASE STATISTICS\n');

        const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
        const entryCount = db.prepare('SELECT COUNT(*) as count FROM finance_entries').get().count;
        const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
        const settingCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;

        const summary = db.prepare(`
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'received' THEN amount ELSE 0 END) as received
            FROM finance_entries
        `).get();

        console.log('  📋 Clients:', clientCount);
        console.log('  💰 Finance Entries:', entryCount);
        console.log('  📄 Invoices:', invoiceCount);
        console.log('  ⚙️  Settings:', settingCount);
        console.log('');
        console.log('  💵 Total Income:', formatCurrency(summary.total_income || 0));
        console.log('  💸 Total Expense:', formatCurrency(summary.total_expense || 0));
        console.log('  ⏳ Pending:', formatCurrency(summary.pending || 0));
        console.log('  ✅ Received:', formatCurrency(summary.received || 0));
        console.log('  🏦 Net Balance:', formatCurrency((summary.total_income || 0) - (summary.total_expense || 0)));
        console.log('');
    },

    clients: () => {
        console.log('\n👥 ALL CLIENTS\n');
        const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
        formatTable(clients, ['id', 'name', 'phone', 'address', 'created_at']);
        console.log(`\n  Total: ${clients.length} clients\n`);
    },

    entries: () => {
        console.log('\n💰 ALL FINANCE ENTRIES\n');
        const entries = db.prepare('SELECT * FROM finance_entries ORDER BY date DESC').all();
        formatTable(entries, ['id', 'date', 'client_name', 'description', 'amount', 'type', 'status', 'payment_mode']);
        console.log(`\n  Total: ${entries.length} entries\n`);
    },

    invoices: () => {
        console.log('\n📄 ALL INVOICES\n');
        const invoices = db.prepare('SELECT id, invoice_number, client_name, invoice_date, grand_total, payment_status FROM invoices ORDER BY invoice_date DESC').all();
        formatTable(invoices, ['id', 'invoice_number', 'client_name', 'invoice_date', 'grand_total', 'payment_status']);
        console.log(`\n  Total: ${invoices.length} invoices\n`);

        // Show invoice services
        invoices.forEach(inv => {
            const services = db.prepare('SELECT * FROM invoice_services WHERE invoice_id = ?').all(inv.id);
            if (services.length > 0) {
                console.log(`\n  Services for ${inv.invoice_number}:`);
                formatTable(services, ['id', 'name', 'quantity', 'rate', 'amount']);
            }
        });
        console.log('');
    },

    settings: () => {
        console.log('\n⚙️  ALL SETTINGS\n');
        const settings = db.prepare('SELECT * FROM settings').all();
        formatTable(settings, ['key', 'value', 'updated_at']);
        console.log(`\n  Total: ${settings.length} settings\n`);
    },

    export: () => {
        const fs = require('fs');
        const path = require('path');

        const entries = db.prepare('SELECT * FROM finance_entries ORDER BY date DESC').all();
        const invoices = db.prepare('SELECT * FROM invoices ORDER BY invoice_date DESC').all();
        const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
        const settings = db.prepare('SELECT * FROM settings').all();

        // Get services for each invoice
        invoices.forEach(inv => {
            inv.services = db.prepare('SELECT * FROM invoice_services WHERE invoice_id = ?').all(inv.id);
        });

        const exportData = {
            version: 2,
            exportDate: new Date().toISOString(),
            entries,
            invoices,
            clients,
            settings
        };

        const filename = `financeflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
        console.log(`\n✅ Data exported to: ${filepath}\n`);
    },

    clear: () => {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('\n⚠️  Are you sure you want to clear ALL data? (type "yes" to confirm): ', (answer) => {
            if (answer.toLowerCase() === 'yes') {
                db.prepare('DELETE FROM invoice_services').run();
                db.prepare('DELETE FROM invoices').run();
                db.prepare('DELETE FROM finance_entries').run();
                db.prepare('DELETE FROM clients').run();
                console.log('\n✅ All data has been cleared!\n');
            } else {
                console.log('\n❌ Operation cancelled.\n');
            }
            rl.close();
            process.exit(0);
        });
    },

    help: () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║         FinanceFlow Admin Utility                         ║
╚═══════════════════════════════════════════════════════════╝

Usage: node admin.js [command]

Commands:
  stats      Show database statistics and financial summary
  clients    List all clients
  entries    List all finance entries
  invoices   List all invoices with services
  settings   Show all settings
  export     Export all data to JSON file
  clear      Clear all data (requires confirmation)
  help       Show this help message

Examples:
  node admin.js stats
  node admin.js clients
  node admin.js export
`);
    }
};

// Format currency
function formatCurrency(amount) {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// Main
const command = process.argv[2] || 'help';

if (commands[command]) {
    commands[command]();
} else {
    console.log(`\n❌ Unknown command: ${command}`);
    commands.help();
}

// Close database (except for clear which handles its own exit)
if (command !== 'clear') {
    process.exit(0);
}
