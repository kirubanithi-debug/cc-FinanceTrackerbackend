/**
 * Data Controller - Supabase Version
 * Handles export, import, and clear operations
 */

const { supabase } = require('../database/db');

const dataController = {
    /**
     * Export all data as JSON
     */
    exportAll: async (req, res, next) => {
        try {
            const { data: entries } = await supabase.from('finance_entries').select('*').order('date', { ascending: false });
            const { data: invoices } = await supabase.from('invoices').select('*').order('invoice_date', { ascending: false });
            const { data: clients } = await supabase.from('clients').select('*').order('name', { ascending: true });
            const { data: settings } = await supabase.from('settings').select('*');

            const invoicesWithServices = await Promise.all((invoices || []).map(async (inv) => {
                const { data: services } = await supabase.from('invoice_services').select('*').eq('invoice_id', inv.id);
                return {
                    ...inv,
                    services: (services || []).map(s => ({ name: s.name, quantity: s.quantity, rate: s.rate, amount: s.amount }))
                };
            }));

            const settingsObj = {};
            (settings || []).forEach(s => {
                try { settingsObj[s.key] = JSON.parse(s.value); } catch { settingsObj[s.key] = s.value; }
            });

            const exportData = {
                version: 2,
                exportDate: new Date().toISOString(),
                entries: (entries || []).map(e => ({
                    id: e.id, date: e.date, clientName: e.client_name, description: e.description,
                    amount: e.amount, type: e.type, status: e.status, paymentMode: e.payment_mode,
                    createdAt: e.created_at, updatedAt: e.updated_at
                })),
                invoices: invoicesWithServices.map(inv => ({
                    id: inv.id, invoiceNumber: inv.invoice_number, agencyName: inv.agency_name,
                    agencyContact: inv.agency_contact, agencyAddress: inv.agency_address, agencyLogo: inv.agency_logo,
                    clientName: inv.client_name, clientPhone: inv.client_phone, clientAddress: inv.client_address,
                    invoiceDate: inv.invoice_date, dueDate: inv.due_date, subtotal: inv.subtotal,
                    taxPercent: inv.tax_percent, taxAmount: inv.tax_amount, discountPercent: inv.discount_percent,
                    discountAmount: inv.discount_amount, grandTotal: inv.grand_total, paymentStatus: inv.payment_status,
                    services: inv.services, createdAt: inv.created_at, updatedAt: inv.updated_at
                })),
                clients: (clients || []).map(c => ({
                    id: c.id, name: c.name, phone: c.phone, address: c.address, createdAt: c.created_at, updatedAt: c.updated_at
                })),
                settings: settingsObj
            };

            res.json({ success: true, data: exportData });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Import data from JSON
     */
    importAll: async (req, res, next) => {
        try {
            const data = req.body;

            if (!data || !data.entries || !data.invoices) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid data format' }
                });
            }

            // Clear existing data
            await supabase.from('invoice_services').delete().neq('id', 0);
            await supabase.from('invoices').delete().neq('id', 0);
            await supabase.from('finance_entries').delete().neq('id', 0);
            await supabase.from('clients').delete().neq('id', 0);

            // Import clients
            if (data.clients && data.clients.length > 0) {
                const clientInserts = data.clients.map(c => ({
                    name: c.name, phone: c.phone, address: c.address || null
                }));
                await supabase.from('clients').insert(clientInserts);
            }

            // Import entries
            if (data.entries.length > 0) {
                const entryInserts = data.entries.map(e => ({
                    date: e.date, client_name: e.clientName, description: e.description || null,
                    amount: e.amount, type: e.type, status: e.status, payment_mode: e.paymentMode
                }));
                await supabase.from('finance_entries').insert(entryInserts);
            }

            // Import invoices
            for (const invoice of data.invoices) {
                const { data: newInv } = await supabase
                    .from('invoices')
                    .insert({
                        invoice_number: invoice.invoiceNumber,
                        agency_name: invoice.agencyName || null,
                        agency_contact: invoice.agencyContact || null,
                        agency_address: invoice.agencyAddress || null,
                        agency_logo: invoice.agencyLogo || null,
                        client_name: invoice.clientName,
                        client_phone: invoice.clientPhone || null,
                        client_address: invoice.clientAddress || null,
                        invoice_date: invoice.invoiceDate,
                        due_date: invoice.dueDate,
                        subtotal: invoice.subtotal || 0,
                        tax_percent: invoice.taxPercent || 0,
                        tax_amount: invoice.taxAmount || 0,
                        discount_percent: invoice.discountPercent || 0,
                        discount_amount: invoice.discountAmount || 0,
                        grand_total: invoice.grandTotal || 0,
                        payment_status: invoice.paymentStatus || 'pending'
                    })
                    .select()
                    .single();

                if (invoice.services && invoice.services.length > 0 && newInv) {
                    const serviceInserts = invoice.services.map(s => ({
                        invoice_id: newInv.id,
                        name: s.name,
                        quantity: s.quantity || 1,
                        rate: s.rate || 0,
                        amount: s.amount || 0
                    }));
                    await supabase.from('invoice_services').insert(serviceInserts);
                }
            }

            // Import settings
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    await supabase.from('settings').upsert({ key, value: valueStr, updated_at: new Date().toISOString() }, { onConflict: 'key' });
                }
            }

            res.json({ success: true, message: 'Data imported successfully' });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Clear all data
     */
    clearAll: async (req, res, next) => {
        try {
            await supabase.from('invoice_services').delete().neq('id', 0);
            await supabase.from('invoices').delete().neq('id', 0);
            await supabase.from('finance_entries').delete().neq('id', 0);
            await supabase.from('clients').delete().neq('id', 0);

            res.json({ success: true, message: 'All data cleared successfully' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = dataController;
