/**
 * Analytics Controller - Supabase Version
 */

const { supabase } = require('../database/db');

const analyticsController = {
    /**
     * Get financial summary
     */
    getFinancialSummary: async (req, res, next) => {
        try {
            const { startDate, endDate, type, status, paymentMode } = req.query;

            let query = supabase.from('finance_entries').select('*');

            if (startDate) query = query.gte('date', startDate);
            if (endDate) query = query.lte('date', endDate);
            if (type) query = query.eq('type', type);
            if (status) query = query.eq('status', status);
            if (paymentMode) query = query.eq('payment_mode', paymentMode);

            const { data: entries, error } = await query;
            if (error) throw error;

            const summary = {
                totalIncome: 0,
                totalExpense: 0,
                pendingAmount: 0,
                receivedAmount: 0,
                netBalance: 0
            };

            (entries || []).forEach(entry => {
                const amount = entry.amount || 0;
                if (entry.type === 'income') {
                    summary.totalIncome += amount;
                    if (entry.status === 'pending') {
                        summary.pendingAmount += amount;
                    } else {
                        summary.receivedAmount += amount;
                    }
                } else {
                    summary.totalExpense += amount;
                }
            });

            summary.netBalance = summary.totalIncome - summary.totalExpense;

            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get monthly data for a specific year
     */
    getMonthlyData: async (req, res, next) => {
        try {
            const { year } = req.params;

            const { data: entries, error } = await supabase
                .from('finance_entries')
                .select('*')
                .gte('date', `${year}-01-01`)
                .lte('date', `${year}-12-31`);

            if (error) throw error;

            const monthlyData = Array(12).fill(null).map(() => ({ income: 0, expense: 0 }));

            (entries || []).forEach(entry => {
                const month = new Date(entry.date).getMonth();
                const amount = entry.amount || 0;
                if (entry.type === 'income') {
                    monthlyData[month].income += amount;
                } else {
                    monthlyData[month].expense += amount;
                }
            });

            res.json({ success: true, data: monthlyData });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get payment mode distribution
     */
    getPaymentModeDistribution: async (req, res, next) => {
        try {
            const { data: entries, error } = await supabase.from('finance_entries').select('*');
            if (error) throw error;

            const distribution = {};
            (entries || []).forEach(entry => {
                const mode = entry.payment_mode || 'other';
                const amount = entry.amount || 0;
                if (!distribution[mode]) distribution[mode] = 0;
                distribution[mode] += amount;
            });

            res.json({ success: true, data: distribution });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get status distribution
     */
    getStatusDistribution: async (req, res, next) => {
        try {
            const { data: entries, error } = await supabase.from('finance_entries').select('*');
            if (error) throw error;

            const distribution = { pending: 0, received: 0 };
            (entries || []).forEach(entry => {
                const amount = entry.amount || 0;
                if (entry.status === 'pending') {
                    distribution.pending += amount;
                } else {
                    distribution.received += amount;
                }
            });

            res.json({ success: true, data: distribution });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get yearly revenue data
     */
    getYearlyRevenue: async (req, res, next) => {
        try {
            const { data: entries, error } = await supabase.from('finance_entries').select('*');
            if (error) throw error;

            const yearlyData = {};
            (entries || []).forEach(entry => {
                const year = new Date(entry.date).getFullYear();
                const amount = entry.amount || 0;
                if (!yearlyData[year]) yearlyData[year] = { income: 0, expense: 0 };
                if (entry.type === 'income') {
                    yearlyData[year].income += amount;
                } else {
                    yearlyData[year].expense += amount;
                }
            });

            res.json({ success: true, data: yearlyData });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = analyticsController;
