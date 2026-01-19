/**
 * Data Controller
 * Handles export, import, and clear operations
 */

const { db } = require('../database/db');

const dataController = {
    /**
     * Export all data as JSON
     */
    exportAll: (req, res, next) => {
        try {
            // Get all data
            const entries = db.prepare('SELECT * FROM finance_entries ORDER BY date DESC').all();
            const invoices = db.prepare('SELECT * FROM invoices ORDER BY invoice_date DESC').all();
            const clients = db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
            const settings = db.prepare('SELECT * FROM settings').all();

            // Get services for each invoice
            const invoicesWithServices = invoices.map(inv => {
                const services = db.prepare('SELECT * FROM invoice_services WHERE invoice_id = ?').all(inv.id);
                return {
                    ...inv,
                    services: services.map(s => ({
                        name: s.name,
                        quantity: s.quantity,
                        rate: s.rate,
                        amount: s.amount
                    }))
                };
            });

            // Format settings as object
            const settingsObj = {};
            settings.forEach(s => {
                try {
                    settingsObj[s.key] = JSON.parse(s.value);
                } catch {
                    settingsObj[s.key] = s.value;
                }
            });

            const exportData = {
                version: 2,
                exportDate: new Date().toISOString(),
                entries: entries.map(e => ({
                    id: e.id,
                    date: e.date,
                    clientName: e.client_name,
                    description: e.description,
                    amount: e.amount,
                    type: e.type,
                    status: e.status,
                    paymentMode: e.payment_mode,
                    createdAt: e.created_at,
                    updatedAt: e.updated_at
                })),
                invoices: invoicesWithServices.map(inv => ({
                    id: inv.id,
                    invoiceNumber: inv.invoice_number,
                    agencyName: inv.agency_name,
                    agencyContact: inv.agency_contact,
                    agencyAddress: inv.agency_address,
                    agencyLogo: inv.agency_logo,
                    clientName: inv.client_name,
                    clientPhone: inv.client_phone,
                    clientAddress: inv.client_address,
                    invoiceDate: inv.invoice_date,
                    dueDate: inv.due_date,
                    subtotal: inv.subtotal,
                    taxPercent: inv.tax_percent,
                    taxAmount: inv.tax_amount,
                    discountPercent: inv.discount_percent,
                    discountAmount: inv.discount_amount,
                    grandTotal: inv.grand_total,
                    paymentStatus: inv.payment_status,
                    services: inv.services,
                    createdAt: inv.created_at,
                    updatedAt: inv.updated_at
                })),
                clients: clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    createdAt: c.created_at,
                    updatedAt: c.updated_at
                })),
                settings: settingsObj
            };

            res.json({
                success: true,
                data: exportData
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Import data from JSON
     */
    importAll: (req, res, next) => {
        try {
            const data = req.body;

            if (!data || !data.entries || !data.invoices) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid data format' }
                });
            }

            const importData = db.transaction(() => {
                // Clear existing data
                db.prepare('DELETE FROM invoice_services').run();
                db.prepare('DELETE FROM invoices').run();
                db.prepare('DELETE FROM finance_entries').run();
                db.prepare('DELETE FROM clients').run();

                // Import clients
                if (data.clients && data.clients.length > 0) {
                    const clientStmt = db.prepare(`
                        INSERT INTO clients (name, phone, address, created_at, updated_at)
                        VALUES (?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
                    `);

                    for (const client of data.clients) {
                        clientStmt.run(
                            client.name,
                            client.phone,
                            client.address || null,
                            client.createdAt || null,
                            client.updatedAt || null
                        );
                    }
                }

                // Import entries
                if (data.entries.length > 0) {
                    const entryStmt = db.prepare(`
                        INSERT INTO finance_entries (date, client_name, description, amount, type, status, payment_mode, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
                    `);

                    for (const entry of data.entries) {
                        entryStmt.run(
                            entry.date,
                            entry.clientName,
                            entry.description || null,
                            entry.amount,
                            entry.type,
                            entry.status,
                            entry.paymentMode,
                            entry.createdAt || null,
                            entry.updatedAt || null
                        );
                    }
                }

                // Import invoices
                if (data.invoices.length > 0) {
                    const invoiceStmt = db.prepare(`
                        INSERT INTO invoices (
                            invoice_number, agency_name, agency_contact, agency_address, agency_logo,
                            client_name, client_phone, client_address, invoice_date, due_date,
                            subtotal, tax_percent, tax_amount, discount_percent, discount_amount,
                            grand_total, payment_status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
                    `);

                    const serviceStmt = db.prepare(`
                        INSERT INTO invoice_services (invoice_id, name, quantity, rate, amount)
                        VALUES (?, ?, ?, ?, ?)
                    `);

                    for (const invoice of data.invoices) {
                        const result = invoiceStmt.run(
                            invoice.invoiceNumber,
                            invoice.agencyName || null,
                            invoice.agencyContact || null,
                            invoice.agencyAddress || null,
                            invoice.agencyLogo || null,
                            invoice.clientName,
                            invoice.clientPhone || null,
                            invoice.clientAddress || null,
                            invoice.invoiceDate,
                            invoice.dueDate,
                            invoice.subtotal || 0,
                            invoice.taxPercent || 0,
                            invoice.taxAmount || 0,
                            invoice.discountPercent || 0,
                            invoice.discountAmount || 0,
                            invoice.grandTotal || 0,
                            invoice.paymentStatus || 'pending',
                            invoice.createdAt || null,
                            invoice.updatedAt || null
                        );

                        // Insert services
                        if (invoice.services && invoice.services.length > 0) {
                            for (const service of invoice.services) {
                                serviceStmt.run(
                                    result.lastInsertRowid,
                                    service.name,
                                    service.quantity || 1,
                                    service.rate || 0,
                                    service.amount || 0
                                );
                            }
                        }
                    }
                }

                // Import settings
                if (data.settings) {
                    const settingStmt = db.prepare(`
                        INSERT INTO settings (key, value, updated_at)
                        VALUES (?, ?, datetime('now'))
                        ON CONFLICT(key) DO UPDATE SET
                            value = excluded.value,
                            updated_at = datetime('now')
                    `);

                    for (const [key, value] of Object.entries(data.settings)) {
                        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        settingStmt.run(key, valueStr);
                    }
                }
            });

            importData();

            res.json({
                success: true,
                message: 'Data imported successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Clear all data
     */
    clearAll: (req, res, next) => {
        try {
            const clearData = db.transaction(() => {
                db.prepare('DELETE FROM invoice_services').run();
                db.prepare('DELETE FROM invoices').run();
                db.prepare('DELETE FROM finance_entries').run();
                db.prepare('DELETE FROM clients').run();
                // Don't clear settings
            });

            clearData();

            res.json({
                success: true,
                message: 'All data cleared successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = dataController;
