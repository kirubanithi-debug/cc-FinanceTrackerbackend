const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'financeflow-secret-key-change-it-in-prod';

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
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Invalid or expired token' }
        });
    }
};

module.exports = verifyToken;
