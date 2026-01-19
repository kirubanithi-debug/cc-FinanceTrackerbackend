/**
 * Data Routes (Export, Import, Clear)
 */

const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// GET /api/export - Export all data
router.get('/export', dataController.exportAll);

// POST /api/import - Import data
router.post('/import', dataController.importAll);

// DELETE /api/clear - Clear all data
router.delete('/clear', dataController.clearAll);

module.exports = router;
