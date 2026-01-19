/**
 * Finance Entries Routes
 */

const express = require('express');
const router = express.Router();
const entriesController = require('../controllers/entriesController');

// GET /api/entries - Get all entries (with optional filters)
router.get('/', entriesController.getAll);

// GET /api/entries/:id - Get entry by ID
router.get('/:id', entriesController.getById);

// POST /api/entries - Create new entry
router.post('/', entriesController.create);

// PUT /api/entries/:id - Update entry
router.put('/:id', entriesController.update);

// DELETE /api/entries/:id - Delete entry
router.delete('/:id', entriesController.delete);

module.exports = router;
