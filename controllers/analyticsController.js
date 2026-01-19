/**
 * Analytics Controller
 * Handles financial analytics and reporting
 */

const { db } = require('../database/db');

const analyticsController = {
    /**
     * Get financial summary
     */
    getFinancialSummary: (req, res, next) => {
        try {
            const { startDate, endDate, month, year, type, status, paymentMode } = req.query;

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

            const entries = db.prepare(query).all(...params);

            const summary = {
                totalIncome: 0,
                totalExpense: 0,
                pendingAmount: 0,
                receivedAmount: 0,
                netBalance: 0
            };

            entries.forEach(entry => {
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

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get monthly data for a specific year
     */
    getMonthlyData: (req, res, next) => {
        try {
            const { year } = req.params;

            const entries = db.prepare(`
                SELECT * FROM finance_entries 
                WHERE strftime('%Y', date) = ?
            `).all(year.toString());

            // Initialize monthly data array (12 months)
            const monthlyData = Array(12).fill(null).map(() => ({ income: 0, expense: 0 }));

            entries.forEach(entry => {
                const month = new Date(entry.date).getMonth();
                const amount = entry.amount || 0;

                if (entry.type === 'income') {
                    monthlyData[month].income += amount;
                } else {
                    monthlyData[month].expense += amount;
                }
            });

            res.json({
                success: true,
                data: monthlyData
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get payment mode distribution
     */
    getPaymentModeDistribution: (req, res, next) => {
        try {
            const entries = db.prepare('SELECT * FROM finance_entries').all();

            const distribution = {};

            entries.forEach(entry => {
                const mode = entry.payment_mode || 'other';
                const amount = entry.amount || 0;

                if (!distribution[mode]) {
                    distribution[mode] = 0;
                }
                distribution[mode] += amount;
            });

            res.json({
                success: true,
                data: distribution
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get status distribution (pending vs received)
     */
    getStatusDistribution: (req, res, next) => {
        try {
            const entries = db.prepare('SELECT * FROM finance_entries').all();

            const distribution = { pending: 0, received: 0 };

            entries.forEach(entry => {
                const amount = entry.amount || 0;
                if (entry.status === 'pending') {
                    distribution.pending += amount;
                } else {
                    distribution.received += amount;
                }
            });

            res.json({
                success: true,
                data: distribution
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get yearly revenue data
     */
    getYearlyRevenue: (req, res, next) => {
        try {
            const entries = db.prepare('SELECT * FROM finance_entries').all();

            const yearlyData = {};

            entries.forEach(entry => {
                const year = new Date(entry.date).getFullYear();
                const amount = entry.amount || 0;

                if (!yearlyData[year]) {
                    yearlyData[year] = { income: 0, expense: 0 };
                }

                if (entry.type === 'income') {
                    yearlyData[year].income += amount;
                } else {
                    yearlyData[year].expense += amount;
                }
            });

            res.json({
                success: true,
                data: yearlyData
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = analyticsController;
