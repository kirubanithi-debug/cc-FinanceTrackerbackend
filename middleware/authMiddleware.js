const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'financeflow-secret-key-change-it-in-prod';

const { db } = require('../database/db');

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
    // Get auth header value
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'No token provided' }
        });
    }

    // Format: "Bearer <token>"
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];

    if (!bearerToken) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(bearerToken, JWT_SECRET);
        // Add user to request object
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Verify Token Error:', err.message);
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Invalid or expired token' }
        });
    }
};

/**
 * Middleware to verify Admin Role
 * Must be placed AFTER verifyToken
 */
const verifyAdmin = (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Admin access required' }
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error checking admin role' });
    }
};

module.exports = { verifyToken, verifyAdmin };
