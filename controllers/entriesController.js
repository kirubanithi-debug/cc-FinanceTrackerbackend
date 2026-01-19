/**
 * Finance Entries Controller
 * Handles all finance entry-related business logic
 */

const { db } = require('../database/db');

const entriesController = {
    /**
     * Get all entries with optional filters
     */
    getAll: (req, res, next) => {
        try {
            const {
                startDate,
                endDate,
                month,
                year,
                type,
                status,
                paymentMode,
                search
            } = req.query;

            let query = 'SELECT * FROM finance_entries WHERE 1=1';
            const params = [];

            // Apply filters
            if (startDate) {
                query += ' AND date >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND date <= ?';
                params.push(endDate);
            }
            if (month !== undefined && month !== '') {
                // SQLite months are 1-indexed in strftime, JS months are 0-indexed
                const monthNum = parseInt(month) + 1;
                const monthStr = monthNum.toString().padStart(2, '0');
                query += ' AND strftime("%m", date) = ?';
                params.push(monthStr);
            }
            if (year) {
                query += ' AND strftime("%Y", date) = ?';
                params.push(year.toString());
            }
            if (type) {
                query += ' AND type = ?';
                params.push(type);
            }
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            if (paymentMode) {
                query += ' AND payment_mode = ?';
                params.push(paymentMode);
            }
            if (search) {
                query += ' AND (client_name LIKE ? OR description LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern);
            }

            query += ' ORDER BY date DESC, created_at DESC';

            const entries = db.prepare(query).all(...params);

            res.json({
                success: true,
                data: entries.map(e => ({
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
                }))
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get entry by ID
     */
    getById: (req, res, next) => {
        try {
            const { id } = req.params;
            const entry = db.prepare('SELECT * FROM finance_entries WHERE id = ?').get(id);

            if (!entry) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Entry not found' }
                });
            }

            res.json({
                success: true,
                data: {
                    id: entry.id,
                    date: entry.date,
                    clientName: entry.client_name,
                    description: entry.description,
                    amount: entry.amount,
                    type: entry.type,
                    status: entry.status,
                    paymentMode: entry.payment_mode,
                    createdAt: entry.created_at,
                    updatedAt: entry.updated_at
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Create a new entry
     */
    create: (req, res, next) => {
        try {
            const { date, clientName, description, amount, type, status, paymentMode } = req.body;

            // Validation
            if (!date || !clientName || amount === undefined || !type || !status || !paymentMode) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
                });
            }

            const stmt = db.prepare(`
                INSERT INTO finance_entries (date, client_name, description, amount, type, status, payment_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(date, clientName, description || null, amount, type, status, paymentMode);

            const newEntry = db.prepare('SELECT * FROM finance_entries WHERE id = ?').get(result.lastInsertRowid);

            res.status(201).json({
                success: true,
                data: {
                    id: newEntry.id,
                    date: newEntry.date,
                    clientName: newEntry.client_name,
                    description: newEntry.description,
                    amount: newEntry.amount,
                    type: newEntry.type,
                    status: newEntry.status,
                    paymentMode: newEntry.payment_mode,
                    createdAt: newEntry.created_at,
                    updatedAt: newEntry.updated_at
                },
                message: 'Entry created successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update an entry
     */
    update: (req, res, next) => {
        try {
            const { id } = req.params;
            const { date, clientName, description, amount, type, status, paymentMode } = req.body;

            const existing = db.prepare('SELECT * FROM finance_entries WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Entry not found' }
                });
            }

            const stmt = db.prepare(`
                UPDATE finance_entries 
                SET date = COALESCE(?, date),
                    client_name = COALESCE(?, client_name),
                    description = COALESCE(?, description),
                    amount = COALESCE(?, amount),
                    type = COALESCE(?, type),
                    status = COALESCE(?, status),
                    payment_mode = COALESCE(?, payment_mode),
                    updated_at = datetime('now')
                WHERE id = ?
            `);

            stmt.run(date, clientName, description, amount, type, status, paymentMode, id);

            const updated = db.prepare('SELECT * FROM finance_entries WHERE id = ?').get(id);

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    date: updated.date,
                    clientName: updated.client_name,
                    description: updated.description,
                    amount: updated.amount,
                    type: updated.type,
                    status: updated.status,
                    paymentMode: updated.payment_mode,
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at
                },
                message: 'Entry updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete an entry
     */
    delete: (req, res, next) => {
        try {
            const { id } = req.params;

            const existing = db.prepare('SELECT * FROM finance_entries WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Entry not found' }
                });
            }

            db.prepare('DELETE FROM finance_entries WHERE id = ?').run(id);

            res.json({
                success: true,
                message: 'Entry deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = entriesController;
