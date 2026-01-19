/**
 * FinanceFlow Backend - Express Application
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { initializeDatabase } = require('./database/db');

// Import routes
const clientsRoutes = require('./routes/clients');
const entriesRoutes = require('./routes/entries');
const invoicesRoutes = require('./routes/invoices');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const dataRoutes = require('./routes/data');
const authRoutes = require('./routes/auth');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Initialize database
initializeDatabase();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' })); // Increased limit for logo uploads
app.use(express.urlencoded({ extended: true }));



// API Routes
app.use('/api/clients', clientsRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'FinanceFlow API is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'FinanceFlow Backend is running'
    });
});


// Error handling middleware
app.use(errorHandler);

module.exports = app;
