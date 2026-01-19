/**
 * Invoices Controller
 * Handles all invoice-related business logic
 */

const { db } = require('../database/db');

const invoicesController = {
    /**
     * Get all invoices
     */
    getAll: (req, res, next) => {
        try {
            const invoices = db.prepare(`
                SELECT * FROM invoices 
                ORDER BY invoice_date DESC, created_at DESC
            `).all();

            // Get services for each invoice
            const result = invoices.map(inv => {
                const services = db.prepare(`
                    SELECT * FROM invoice_services WHERE invoice_id = ?
                `).all(inv.id);

                return {
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
                    services: services.map(s => ({
                        id: s.id,
                        name: s.name,
                        quantity: s.quantity,
                        rate: s.rate,
                        amount: s.amount
                    })),
                    createdAt: inv.created_at,
                    updatedAt: inv.updated_at
                };
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get invoice by ID
     */
    getById: (req, res, next) => {
        try {
            const { id } = req.params;
            const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);

            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invoice not found' }
                });
            }

            const services = db.prepare('SELECT * FROM invoice_services WHERE invoice_id = ?').all(id);

            res.json({
                success: true,
                data: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoice_number,
                    agencyName: invoice.agency_name,
                    agencyContact: invoice.agency_contact,
                    agencyAddress: invoice.agency_address,
                    agencyLogo: invoice.agency_logo,
                    clientName: invoice.client_name,
                    clientPhone: invoice.client_phone,
                    clientAddress: invoice.client_address,
                    invoiceDate: invoice.invoice_date,
                    dueDate: invoice.due_date,
                    subtotal: invoice.subtotal,
                    taxPercent: invoice.tax_percent,
                    taxAmount: invoice.tax_amount,
                    discountPercent: invoice.discount_percent,
                    discountAmount: invoice.discount_amount,
                    grandTotal: invoice.grand_total,
                    paymentStatus: invoice.payment_status,
                    services: services.map(s => ({
                        id: s.id,
                        name: s.name,
                        quantity: s.quantity,
                        rate: s.rate,
                        amount: s.amount
                    })),
                    createdAt: invoice.created_at,
                    updatedAt: invoice.updated_at
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get next invoice number
     */
    getNextNumber: (req, res, next) => {
        try {
            const lastInvoice = db.prepare(`
                SELECT invoice_number FROM invoices 
                ORDER BY id DESC LIMIT 1
            `).get();

            let nextNumber = 'INV-0001';

            if (lastInvoice) {
                const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
                if (match) {
                    const num = parseInt(match[1]) + 1;
                    nextNumber = `INV-${num.toString().padStart(4, '0')}`;
                }
            }

            res.json({
                success: true,
                data: { invoiceNumber: nextNumber }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Create a new invoice
     */
    create: (req, res, next) => {
        try {
            const {
                invoiceNumber,
                agencyName,
                agencyContact,
                agencyAddress,
                agencyLogo,
                clientName,
                clientPhone,
                clientAddress,
                invoiceDate,
                dueDate,
                subtotal,
                taxPercent,
                taxAmount,
                discountPercent,
                discountAmount,
                grandTotal,
                paymentStatus,
                services
            } = req.body;

            // Validation
            if (!invoiceNumber || !clientName || !invoiceDate || !dueDate) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
                });
            }

            // Use a transaction for invoice + services
            const insertInvoice = db.transaction(() => {
                // Insert invoice
                const invoiceStmt = db.prepare(`
                    INSERT INTO invoices (
                        invoice_number, agency_name, agency_contact, agency_address, agency_logo,
                        client_name, client_phone, client_address, invoice_date, due_date,
                        subtotal, tax_percent, tax_amount, discount_percent, discount_amount,
                        grand_total, payment_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const invoiceResult = invoiceStmt.run(
                    invoiceNumber,
                    agencyName || null,
                    agencyContact || null,
                    agencyAddress || null,
                    agencyLogo || null,
                    clientName,
                    clientPhone || null,
                    clientAddress || null,
                    invoiceDate,
                    dueDate,
                    subtotal || 0,
                    taxPercent || 0,
                    taxAmount || 0,
                    discountPercent || 0,
                    discountAmount || 0,
                    grandTotal || 0,
                    paymentStatus || 'pending'
                );

                const invoiceId = invoiceResult.lastInsertRowid;

                // Insert services
                if (services && services.length > 0) {
                    const serviceStmt = db.prepare(`
                        INSERT INTO invoice_services (invoice_id, name, quantity, rate, amount)
                        VALUES (?, ?, ?, ?, ?)
                    `);

                    for (const service of services) {
                        serviceStmt.run(
                            invoiceId,
                            service.name,
                            service.quantity || 1,
                            service.rate || 0,
                            service.amount || 0
                        );
                    }
                }

                return invoiceId;
            });

            const newInvoiceId = insertInvoice();

            // Fetch the created invoice
            const newInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(newInvoiceId);
            const newServices = db.prepare('SELECT * FROM invoice_services WHERE invoice_id = ?').all(newInvoiceId);

            res.status(201).json({
                success: true,
                data: {
                    id: newInvoice.id,
                    invoiceNumber: newInvoice.invoice_number,
                    agencyName: newInvoice.agency_name,
                    agencyContact: newInvoice.agency_contact,
                    agencyAddress: newInvoice.agency_address,
                    agencyLogo: newInvoice.agency_logo,
                    clientName: newInvoice.client_name,
                    clientPhone: newInvoice.client_phone,
                    clientAddress: newInvoice.client_address,
                    invoiceDate: newInvoice.invoice_date,
                    dueDate: newInvoice.due_date,
                    subtotal: newInvoice.subtotal,
                    taxPercent: newInvoice.tax_percent,
                    taxAmount: newInvoice.tax_amount,
                    discountPercent: newInvoice.discount_percent,
                    discountAmount: newInvoice.discount_amount,
                    grandTotal: newInvoice.grand_total,
                    paymentStatus: newInvoice.payment_status,
                    services: newServices.map(s => ({
                        id: s.id,
                        name: s.name,
                        quantity: s.quantity,
                        rate: s.rate,
                        amount: s.amount
                    })),
                    createdAt: newInvoice.created_at,
                    updatedAt: newInvoice.updated_at
                },
                message: 'Invoice created successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update an invoice
     */
    update: (req, res, next) => {
        try {
            const { id } = req.params;
            const {
                agencyName,
                agencyContact,
                agencyAddress,
                agencyLogo,
                clientName,
                clientPhone,
                clientAddress,
                invoiceDate,
                dueDate,
                subtotal,
                taxPercent,
                taxAmount,
                discountPercent,
                discountAmount,
                grandTotal,
                paymentStatus,
                services
            } = req.body;

            const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invoice not found' }
                });
            }

            const updateInvoice = db.transaction(() => {
                // Update invoice
                db.prepare(`
                    UPDATE invoices SET
                        agency_name = COALESCE(?, agency_name),
                        agency_contact = COALESCE(?, agency_contact),
                        agency_address = COALESCE(?, agency_address),
                        agency_logo = COALESCE(?, agency_logo),
                        client_name = COALESCE(?, client_name),
                        client_phone = COALESCE(?, client_phone),
                        client_address = COALESCE(?, client_address),
                        invoice_date = COALESCE(?, invoice_date),
                        due_date = COALESCE(?, due_date),
                        subtotal = COALESCE(?, subtotal),
                        tax_percent = COALESCE(?, tax_percent),
                        tax_amount = COALESCE(?, tax_amount),
                        discount_percent = COALESCE(?, discount_percent),
                        discount_amount = COALESCE(?, discount_amount),
                        grand_total = COALESCE(?, grand_total),
                        payment_status = COALESCE(?, payment_status),
                        updated_at = datetime('now')
                    WHERE id = ?
                `).run(
                    agencyName, agencyContact, agencyAddress, agencyLogo,
                    clientName, clientPhone, clientAddress, invoiceDate, dueDate,
                    subtotal, taxPercent, taxAmount, discountPercent, discountAmount,
                    grandTotal, paymentStatus, id
                );

                // Update services if provided
                if (services) {
                    // Delete existing services
                    db.prepare('DELETE FROM invoice_services WHERE invoice_id = ?').run(id);

                    // Insert new services
                    const serviceStmt = db.prepare(`
                        INSERT INTO invoice_services (invoice_id, name, quantity, rate, amount)
                        VALUES (?, ?, ?, ?, ?)
                    `);

                    for (const service of services) {
                        serviceStmt.run(id, service.name, service.quantity, service.rate, service.amount);
                    }
                }
            });

            updateInvoice();

            // Fetch updated invoice
            const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
            const updatedServices = db.prepare('SELECT * FROM invoice_services WHERE invoice_id = ?').all(id);

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    invoiceNumber: updated.invoice_number,
                    agencyName: updated.agency_name,
                    agencyContact: updated.agency_contact,
                    agencyAddress: updated.agency_address,
                    agencyLogo: updated.agency_logo,
                    clientName: updated.client_name,
                    clientPhone: updated.client_phone,
                    clientAddress: updated.client_address,
                    invoiceDate: updated.invoice_date,
                    dueDate: updated.due_date,
                    subtotal: updated.subtotal,
                    taxPercent: updated.tax_percent,
                    taxAmount: updated.tax_amount,
                    discountPercent: updated.discount_percent,
                    discountAmount: updated.discount_amount,
                    grandTotal: updated.grand_total,
                    paymentStatus: updated.payment_status,
                    services: updatedServices.map(s => ({
                        id: s.id,
                        name: s.name,
                        quantity: s.quantity,
                        rate: s.rate,
                        amount: s.amount
                    })),
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at
                },
                message: 'Invoice updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete an invoice
     */
    delete: (req, res, next) => {
        try {
            const { id } = req.params;

            const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invoice not found' }
                });
            }

            // Services will be deleted automatically due to CASCADE
            db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

            res.json({
                success: true,
                message: 'Invoice deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Import invoices (Bulk Create)
     */
    import: (req, res, next) => {
        try {
            const { invoices } = req.body;

            if (!Array.isArray(invoices) || invoices.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid data format. Expected array of invoices.' }
                });
            }

            const importInfo = {
                total: invoices.length,
                success: 0,
                failed: 0,
                errors: []
            };

            const importTransaction = db.transaction((items) => {
                for (const inv of items) {
                    try {
                        // Basic validation
                        if (!inv.clientName || !inv.invoiceNumber) {
                            throw new Error('Missing clientName or invoiceNumber');
                        }

                        // Check duplicate
                        const existing = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(inv.invoiceNumber);
                        if (existing) {
                            throw new Error(`Invoice ${inv.invoiceNumber} already exists`);
                        }

                        // Insert invoice
                        const invoiceStmt = db.prepare(`
                            INSERT INTO invoices (
                                invoice_number, agency_name, agency_contact, agency_address,
                                client_name, client_phone, client_address, invoice_date, due_date,
                                subtotal, tax_percent, tax_amount, discount_percent, discount_amount,
                                grand_total, payment_status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);

                        const result = invoiceStmt.run(
                            inv.invoiceNumber,
                            inv.agencyName || null,
                            inv.agencyContact || null,
                            inv.agencyAddress || null,
                            inv.clientName,
                            inv.clientPhone || null,
                            inv.clientAddress || null,
                            inv.invoiceDate || new Date().toISOString().split('T')[0],
                            inv.dueDate || new Date().toISOString().split('T')[0],
                            inv.subtotal || 0,
                            inv.taxPercent || 0,
                            inv.taxAmount || 0,
                            inv.discountPercent || 0,
                            inv.discountAmount || 0,
                            inv.grandTotal || 0,
                            inv.paymentStatus || 'pending'
                        );

                        const invoiceId = result.lastInsertRowid;

                        // Insert services
                        if (inv.services && Array.isArray(inv.services)) {
                            const serviceStmt = db.prepare(`
                                INSERT INTO invoice_services (invoice_id, name, quantity, rate, amount)
                                VALUES (?, ?, ?, ?, ?)
                            `);

                            for (const s of inv.services) {
                                serviceStmt.run(
                                    invoiceId,
                                    s.name || 'Service',
                                    s.quantity || 1,
                                    s.rate || 0,
                                    s.amount || 0
                                );
                            }
                        }

                        importInfo.success++;
                    } catch (err) {
                        importInfo.failed++;
                        importInfo.errors.push({ invoice: inv.invoiceNumber, error: err.message });
                    }
                }
            });

            importTransaction(invoices);

            res.json({
                success: true,
                data: importInfo,
                message: `Imported ${importInfo.success} invoices. Failed: ${importInfo.failed}`
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = invoicesController;
