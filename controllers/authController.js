const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'financeflow-secret-key-change-it-in-prod';

/**
 * Register a new user
 */
exports.signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Please provide name, email, and password' }
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' }
            });
        }

        // Check if email exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_EMAIL', message: 'Email already registered' }
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        const result = stmt.run(name, email, hashedPassword);

        // Create token
        const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            success: true,
            token,
            user: { id: result.lastInsertRowid, name, email },
            message: 'User registered successfully'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Please provide email and password' }
            });
        }

        // Find user
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: 'Invalid email or password' }
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: 'Invalid email or password' }
            });
        }

        // Create token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email },
            message: 'Login successful'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get current user info
 */
exports.getMe = (req, res, next) => {
    try {
        const user = db.prepare('SELECT id, name, email, phone, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            });
        }
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email, phone, avatar, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get current user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Email update check
        if (email && email !== user.email) {
            const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (exists) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
        }

        // Password update check
        let passwordHash = user.password;
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: 'Current password required to change password' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect current password' });
            }
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(newPassword, salt);
        }

        // Update DB
        const stmt = db.prepare(`
            UPDATE users 
            SET name = COALESCE(?, name), 
                email = COALESCE(?, email), 
                phone = COALESCE(?, phone),
                avatar = COALESCE(?, avatar),
                password = ? 
            WHERE id = ?
        `);

        stmt.run(name || null, email || null, phone || null, avatar || null, passwordHash, userId);

        // Fetch updated user
        const updatedUser = db.prepare('SELECT id, name, email, phone, avatar, created_at FROM users WHERE id = ?').get(userId);

        res.json({
            success: true,
            user: updatedUser,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        next(error);
    }
};
