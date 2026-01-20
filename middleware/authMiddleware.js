const jwt = require('jsonwebtoken');
const { supabase } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'financeflow-secret-key-change-it-in-prod';

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'No token provided' }
        });
    }

    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];

    if (!bearerToken) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid token format' }
        });
    }

    try {
        const decoded = jwt.verify(bearerToken, JWT_SECRET);
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
 */
const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (error || !user || user.role !== 'admin') {
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
