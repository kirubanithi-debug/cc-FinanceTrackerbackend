/**
 * Global Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // SQLite specific errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'CONSTRAINT_ERROR',
                message: 'Database constraint violation'
            }
        });
    }

    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'DUPLICATE_ERROR',
                message: 'A record with this value already exists'
            }
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: err.message
            }
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: {
            code: err.code || 'SERVER_ERROR',
            message
        }
    });
}

module.exports = errorHandler;
