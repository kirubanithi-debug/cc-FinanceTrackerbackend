/**
 * Analytics Routes
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/financial-summary - Get financial summary
router.get('/financial-summary', analyticsController.getFinancialSummary);

// GET /api/analytics/monthly/:year - Get monthly data for a year
router.get('/monthly/:year', analyticsController.getMonthlyData);

// GET /api/analytics/payment-modes - Get payment mode distribution
router.get('/payment-modes', analyticsController.getPaymentModeDistribution);

// GET /api/analytics/status-distribution - Get status distribution
router.get('/status-distribution', analyticsController.getStatusDistribution);

// GET /api/analytics/yearly-revenue - Get yearly revenue
router.get('/yearly-revenue', analyticsController.getYearlyRevenue);

module.exports = router;
