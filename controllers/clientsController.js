/**
 * Clients Controller - Supabase Version
 */

const { supabase } = require('../database/db');

const clientsController = {
    /**
     * Get all clients
     */
    getAll: async (req, res, next) => {
        try {
            const { data: clients, error } = await supabase
                .from('clients')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

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
    getById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { data: client, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !client) {
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
    create: async (req, res, next) => {
        try {
            const { name, phone, address } = req.body;

            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Name and phone are required' }
                });
            }

            const { data: newClient, error } = await supabase
                .from('clients')
                .insert({ name, phone, address: address || null })
                .select()
                .single();

            if (error) throw error;

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
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, phone, address } = req.body;

            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Client not found' }
                });
            }

            const updates = { updated_at: new Date().toISOString() };
            if (name) updates.name = name;
            if (phone) updates.phone = phone;
            if (address !== undefined) updates.address = address;

            await supabase
                .from('clients')
                .update(updates)
                .eq('id', id);

            const { data: updated } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

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
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;

            const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Client not found' }
                });
            }

            await supabase.from('clients').delete().eq('id', id);

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
