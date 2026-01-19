/**
 * Clients Routes
 */

const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');

// GET /api/clients - Get all clients
router.get('/', clientsController.getAll);

// GET /api/clients/:id - Get client by ID
router.get('/:id', clientsController.getById);

// POST /api/clients - Create new client
router.post('/', clientsController.create);

// PUT /api/clients/:id - Update client
router.put('/:id', clientsController.update);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', clientsController.delete);

module.exports = router;
