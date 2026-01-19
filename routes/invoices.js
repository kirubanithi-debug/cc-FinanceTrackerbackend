/**
 * Invoices Routes
 */

const express = require('express');
const router = express.Router();
const invoicesController = require('../controllers/invoicesController');

// GET /api/invoices/next-number - Get next invoice number (must be before /:id)
router.get('/next-number', invoicesController.getNextNumber);

// GET /api/invoices - Get all invoices
router.get('/', invoicesController.getAll);

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', invoicesController.getById);

// POST /api/invoices/import - Import invoices (Bulk Create)
router.post('/import', invoicesController.import);

// POST /api/invoices - Create new invoice
router.post('/', invoicesController.create);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', invoicesController.update);

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', invoicesController.delete);

module.exports = router;
