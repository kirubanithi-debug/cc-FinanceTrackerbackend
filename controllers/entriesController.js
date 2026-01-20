/**
 * Finance Entries Controller - Supabase Version
 */

const { supabase } = require('../database/db');

const entriesController = {
    /**
     * Get all entries with optional filters
     */
    getAll: async (req, res, next) => {
        try {
            const { startDate, endDate, month, year, type, status, paymentMode, search } = req.query;

            let query = supabase.from('finance_entries').select('*');

            if (startDate) query = query.gte('date', startDate);
            if (endDate) query = query.lte('date', endDate);
            if (type) query = query.eq('type', type);
            if (status) query = query.eq('status', status);
            if (paymentMode) query = query.eq('payment_mode', paymentMode);
            if (search) query = query.or(`client_name.ilike.%${search}%,description.ilike.%${search}%`);

            // Month and Year filtering (PostgreSQL date functions)
            if (month !== undefined && month !== '') {
                const monthNum = parseInt(month) + 1;
                const monthStr = monthNum.toString().padStart(2, '0');
                // Supabase doesn't have direct month extractions in query builder, will filter client-side if needed
                // For simplicity, we'll rely on startDate/endDate or do post-filtering
            }

            query = query.order('date', { ascending: false }).order('created_at', { ascending: false });

            const { data: entries, error } = await query;

            if (error) throw error;

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
    getById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { data: entry, error } = await supabase
                .from('finance_entries')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !entry) {
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
    create: async (req, res, next) => {
        try {
            const { date, clientName, description, amount, type, status, paymentMode } = req.body;

            if (!date || !clientName || amount === undefined || !type || !status || !paymentMode) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
                });
            }

            const { data: newEntry, error } = await supabase
                .from('finance_entries')
                .insert({
                    date,
                    client_name: clientName,
                    description: description || null,
                    amount,
                    type,
                    status,
                    payment_mode: paymentMode
                })
                .select()
                .single();

            if (error) throw error;

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
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { date, clientName, description, amount, type, status, paymentMode } = req.body;

            const { data: existing } = await supabase
                .from('finance_entries')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Entry not found' }
                });
            }

            const updates = { updated_at: new Date().toISOString() };
            if (date) updates.date = date;
            if (clientName) updates.client_name = clientName;
            if (description !== undefined) updates.description = description;
            if (amount !== undefined) updates.amount = amount;
            if (type) updates.type = type;
            if (status) updates.status = status;
            if (paymentMode) updates.payment_mode = paymentMode;

            await supabase.from('finance_entries').update(updates).eq('id', id);

            const { data: updated } = await supabase
                .from('finance_entries')
                .select('*')
                .eq('id', id)
                .single();

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
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;

            const { data: existing } = await supabase
                .from('finance_entries')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Entry not found' }
                });
            }

            await supabase.from('finance_entries').delete().eq('id', id);

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
