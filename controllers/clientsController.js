/**
 * Clients Controller
 * Handles all client-related business logic
 */

const { db } = require('../database/db');

const clientsController = {
    /**
     * Get all clients
     */
    getAll: (req, res, next) => {
        try {
            const clients = db.prepare(`
                SELECT * FROM clients 
                ORDER BY name ASC
            `).all();

            res.json({
                success: true,
                data: clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    createdAt: c.created_at,
                    updatedAt: c.updated_at
                }))
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get client by ID
     */
    getById: (req, res, next) => {
        try {
            const { id } = req.params;
            const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Client not found' }
                });
            }

            res.json({
                success: true,
                data: {
                    id: client.id,
                    name: client.name,
                    phone: client.phone,
                    address: client.address,
                    createdAt: client.created_at,
                    updatedAt: client.updated_at
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Create a new client
     */
    create: (req, res, next) => {
        try {
            const { name, phone, address } = req.body;

            // Validation
            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Name and phone are required' }
                });
            }

            const stmt = db.prepare(`
                INSERT INTO clients (name, phone, address) 
                VALUES (?, ?, ?)
            `);

            const result = stmt.run(name, phone, address || null);

            const newClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);

            res.status(201).json({
                success: true,
                data: {
                    id: newClient.id,
                    name: newClient.name,
                    phone: newClient.phone,
                    address: newClient.address,
                    createdAt: newClient.created_at,
                    updatedAt: newClient.updated_at
                },
                message: 'Client created successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update a client
     */
    update: (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, phone, address } = req.body;

            // Check if client exists
            const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Client not found' }
                });
            }

            const stmt = db.prepare(`
                UPDATE clients 
                SET name = COALESCE(?, name),
                    phone = COALESCE(?, phone),
                    address = COALESCE(?, address),
                    updated_at = datetime('now')
                WHERE id = ?
            `);

            stmt.run(name, phone, address, id);

            const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    name: updated.name,
                    phone: updated.phone,
                    address: updated.address,
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at
                },
                message: 'Client updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete a client
     */
    delete: (req, res, next) => {
        try {
            const { id } = req.params;

            const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Client not found' }
                });
            }

            db.prepare('DELETE FROM clients WHERE id = ?').run(id);

            res.json({
                success: true,
                message: 'Client deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = clientsController;
