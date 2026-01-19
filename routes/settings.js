/**
 * Settings Routes
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET /api/settings - Get all settings
router.get('/', settingsController.getAll);

// GET /api/settings/:key - Get setting by key
router.get('/:key', settingsController.getByKey);

// PUT /api/settings/:key - Update setting (upsert)
router.put('/:key', settingsController.update);

// DELETE /api/settings/:key - Delete setting
router.delete('/:key', settingsController.delete);

module.exports = router;
