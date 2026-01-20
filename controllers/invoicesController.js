/**
 * Invoices Controller - Supabase Version
 */

const { supabase } = require('../database/db');

const invoicesController = {
    /**
     * Get all invoices
     */
    getAll: async (req, res, next) => {
        try {
            const { data: invoices, error } = await supabase
                .from('invoices')
                .select('*')
                .order('invoice_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get services for each invoice
            const result = await Promise.all(invoices.map(async (inv) => {
                const { data: services } = await supabase
                    .from('invoice_services')
                    .select('*')
                    .eq('invoice_id', inv.id);

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
                    services: (services || []).map(s => ({
                        id: s.id,
                        name: s.name,
                        quantity: s.quantity,
                        rate: s.rate,
                        amount: s.amount
                    })),
                    createdAt: inv.created_at,
                    updatedAt: inv.updated_at
                };
            }));

            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get invoice by ID
     */
    getById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { data: invoice, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !invoice) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invoice not found' }
                });
            }

            const { data: services } = await supabase
                .from('invoice_services')
                .select('*')
                .eq('invoice_id', id);

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
                    services: (services || []).map(s => ({
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
    getNextNumber: async (req, res, next) => {
        try {
            const { data: lastInvoice } = await supabase
                .from('invoices')
                .select('invoice_number')
                .order('id', { ascending: false })
                .limit(1)
                .single();

            let nextNumber = 'INV-0001';

            if (lastInvoice) {
                const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
                if (match) {
                    const num = parseInt(match[1]) + 1;
                    nextNumber = `INV-${num.toString().padStart(4, '0')}`;
                }
            }

            res.json({ success: true, data: { invoiceNumber: nextNumber } });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Create a new invoice
     */
    create: async (req, res, next) => {
        try {
            const {
                invoiceNumber, agencyName, agencyContact, agencyAddress, agencyLogo,
                clientName, clientPhone, clientAddress, invoiceDate, dueDate,
                subtotal, taxPercent, taxAmount, discountPercent, discountAmount,
                grandTotal, paymentStatus, services
            } = req.body;

            if (!invoiceNumber || !clientName || !invoiceDate || !dueDate) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
                });
            }

            // Insert invoice
            const { data: newInvoice, error } = await supabase
                .from('invoices')
                .insert({
                    invoice_number: invoiceNumber,
                    agency_name: agencyName || null,
                    agency_contact: agencyContact || null,
                    agency_address: agencyAddress || null,
                    agency_logo: agencyLogo || null,
                    client_name: clientName,
                    client_phone: clientPhone || null,
                    client_address: clientAddress || null,
                    invoice_date: invoiceDate,
                    due_date: dueDate,
                    subtotal: subtotal || 0,
                    tax_percent: taxPercent || 0,
                    tax_amount: taxAmount || 0,
                    discount_percent: discountPercent || 0,
                    discount_amount: discountAmount || 0,
                    grand_total: grandTotal || 0,
                    payment_status: paymentStatus || 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Insert services
            if (services && services.length > 0) {
                const serviceInserts = services.map(s => ({
                    invoice_id: newInvoice.id,
                    name: s.name,
                    quantity: s.quantity || 1,
                    rate: s.rate || 0,
                    amount: s.amount || 0
                }));
                await supabase.from('invoice_services').insert(serviceInserts);
            }

            const { data: newServices } = await supabase
                .from('invoice_services')
                .select('*')
                .eq('invoice_id', newInvoice.id);

            res.status(201).json({
                success: true,
                data: {
                    id: newInvoice.id,
                    invoiceNumber: newInvoice.invoice_number,
                    agencyName: newInvoice.agency_name,
                    clientName: newInvoice.client_name,
                    grandTotal: newInvoice.grand_total,
                    paymentStatus: newInvoice.payment_status,
                    services: (newServices || []).map(s => ({
                        id: s.id, name: s.name, quantity: s.quantity, rate: s.rate, amount: s.amount
                    })),
                    createdAt: newInvoice.created_at
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
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const {
                agencyName, agencyContact, agencyAddress, agencyLogo,
                clientName, clientPhone, clientAddress, invoiceDate, dueDate,
                subtotal, taxPercent, taxAmount, discountPercent, discountAmount,
                grandTotal, paymentStatus, services
            } = req.body;

            const { data: existing } = await supabase
                .from('invoices')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invoice not found' }
                });
            }

            const updates = { updated_at: new Date().toISOString() };
            if (agencyName !== undefined) updates.agency_name = agencyName;
            if (agencyContact !== undefined) updates.agency_contact = agencyContact;
            if (agencyAddress !== undefined) updates.agency_address = agencyAddress;
            if (agencyLogo !== undefined) updates.agency_logo = agencyLogo;
            if (clientName !== undefined) updates.client_name = clientName;
            if (clientPhone !== undefined) updates.client_phone = clientPhone;
            if (clientAddress !== undefined) updates.client_address = clientAddress;
            if (invoiceDate !== undefined) updates.invoice_date = invoiceDate;
            if (dueDate !== undefined) updates.due_date = dueDate;
            if (subtotal !== undefined) updates.subtotal = subtotal;
            if (taxPercent !== undefined) updates.tax_percent = taxPercent;
            if (taxAmount !== undefined) updates.tax_amount = taxAmount;
            if (discountPercent !== undefined) updates.discount_percent = discountPercent;
            if (discountAmount !== undefined) updates.discount_amount = discountAmount;
            if (grandTotal !== undefined) updates.grand_total = grandTotal;
            if (paymentStatus !== undefined) updates.payment_status = paymentStatus;

            await supabase.from('invoices').update(updates).eq('id', id);

            // Update services if provided
            if (services) {
                await supabase.from('invoice_services').delete().eq('invoice_id', id);
                if (services.length > 0) {
                    const serviceInserts = services.map(s => ({
                        invoice_id: parseInt(id),
                        name: s.name,
                        quantity: s.quantity || 1,
                        rate: s.rate || 0,
                        amount: s.amount || 0
                    }));
                    await supabase.from('invoice_services').insert(serviceInserts);
                }
            }

            const { data: updated } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', id)
                .single();

            const { data: updatedServices } = await supabase
                .from('invoice_services')
                .select('*')
                .eq('invoice_id', id);

            res.json({
                success: true,
                data: {
                    id: updated.id,
                    invoiceNumber: updated.invoice_number,
                    clientName: updated.client_name,
                    grandTotal: updated.grand_total,
                    paymentStatus: updated.payment_status,
                    services: (updatedServices || []).map(s => ({
                        id: s.id, name: s.name, quantity: s.quantity, rate: s.rate, amount: s.amount
                    })),
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
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;

            const { data: existing } = await supabase
                .from('invoices')
                .select('id')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Invoice not found' }
                });
            }

            // Services will be deleted automatically due to CASCADE
            await supabase.from('invoices').delete().eq('id', id);

            res.json({ success: true, message: 'Invoice deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Import invoices (Bulk Create)
     */
    import: async (req, res, next) => {
        try {
            const { invoices } = req.body;

            if (!Array.isArray(invoices) || invoices.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid data format. Expected array of invoices.' }
                });
            }

            const importInfo = { total: invoices.length, success: 0, failed: 0, errors: [] };

            for (const inv of invoices) {
                try {
                    if (!inv.clientName || !inv.invoiceNumber) {
                        throw new Error('Missing clientName or invoiceNumber');
                    }

                    const { data: existingCheck } = await supabase
                        .from('invoices')
                        .select('id')
                        .eq('invoice_number', inv.invoiceNumber)
                        .single();

                    if (existingCheck) {
                        throw new Error(`Invoice ${inv.invoiceNumber} already exists`);
                    }

                    const { data: newInv, error } = await supabase
                        .from('invoices')
                        .insert({
                            invoice_number: inv.invoiceNumber,
                            agency_name: inv.agencyName || null,
                            agency_contact: inv.agencyContact || null,
                            agency_address: inv.agencyAddress || null,
                            client_name: inv.clientName,
                            client_phone: inv.clientPhone || null,
                            client_address: inv.clientAddress || null,
                            invoice_date: inv.invoiceDate || new Date().toISOString().split('T')[0],
                            due_date: inv.dueDate || new Date().toISOString().split('T')[0],
                            subtotal: inv.subtotal || 0,
                            tax_percent: inv.taxPercent || 0,
                            tax_amount: inv.taxAmount || 0,
                            discount_percent: inv.discountPercent || 0,
                            discount_amount: inv.discountAmount || 0,
                            grand_total: inv.grandTotal || 0,
                            payment_status: inv.paymentStatus || 'pending'
                        })
                        .select()
                        .single();

                    if (error) throw error;

                    if (inv.services && Array.isArray(inv.services)) {
                        const serviceInserts = inv.services.map(s => ({
                            invoice_id: newInv.id,
                            name: s.name || 'Service',
                            quantity: s.quantity || 1,
                            rate: s.rate || 0,
                            amount: s.amount || 0
                        }));
                        await supabase.from('invoice_services').insert(serviceInserts);
                    }

                    importInfo.success++;
                } catch (err) {
                    importInfo.failed++;
                    importInfo.errors.push({ invoice: inv.invoiceNumber, error: err.message });
                }
            }

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
