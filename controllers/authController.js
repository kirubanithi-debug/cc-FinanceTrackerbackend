const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email Transporter (Mock for now, replace with real credentials)
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'ethereal.user', // Replace with real one
        pass: 'ethereal.pass'
    }
});

// Helper to send email
async function sendEmail(to, subject, text, html) {
    try {
        console.log(`📧 Simulation: Sending email to ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text}`);
        // In production: await transporter.sendMail({ from: '"FinanceFlow" <noreply@financeflow.com>', to, subject, text, html });
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
}

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

        // Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert user (is_verified = 0 by default)
        const stmt = db.prepare('INSERT INTO users (name, email, password, verification_token, is_verified) VALUES (?, ?, ?, ?, 0)');
        const result = stmt.run(name, email, hashedPassword, verificationToken);

        // Send Verification Email
        const verifyLink = `http://localhost:3000/verify?token=${verificationToken}`; // Adjust domain in prod
        await sendEmail(email, 'Verify your Email', `Please click here to verify: ${verifyLink}`, `<a href="${verifyLink}">Verify Email</a>`);

        res.status(201).json({
            success: true,
            message: 'User registered. Please check your email to verify account.',
            // userId: result.lastInsertRowid // Optional
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
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress;

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

        // Check Verification
        if (user.is_verified === 0) {
            return res.status(403).json({
                success: false,
                error: { code: 'NOT_VERIFIED', message: 'Please verify your email address to login.' }
            });
        }

        // New Device Detection
        const knownDevice = db.prepare('SELECT id FROM login_history WHERE user_id = ? AND user_agent = ?').get(user.id, userAgent);

        // If not a known device (or first time), trigger OTP. 
        // Note: For simplicity, if it's the very first login ever, we might want to skip OTP, but strictly "new device" means "never seen".
        // Let's implement a strict check: if history exists for user but not this device => OTP.
        // Or if simple "New Device" logic requested: always check history.
        // If login_history is empty for user, is it a new device? Technically yes. 
        // But maybe we can auto-trust the very first login after verification (optional optimization).
        // For now, I'll follow strict "New Device" logic.

        let requiresOtp = false;
        if (!knownDevice) {
            // Check if user has ANY history. If not, maybe we trust this first device? 
            // Logic: "Login flow now handles requiresOtp response... If New Device: Generate OTP."
            requiresOtp = true;
        }

        if (requiresOtp) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins

            db.prepare('UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?').run(otp, otpExpiry, user.id);

            await sendEmail(user.email, 'Login OTP', `Your OTP is: ${otp}`, `<p>Your OTP is: <strong>${otp}</strong></p>`);

            return res.status(202).json({
                success: true,
                requiresOtp: true,
                message: 'OTP sent to email'
            });
        }

        // Record Login
        db.prepare('INSERT INTO login_history (user_id, ip_address, user_agent) VALUES (?, ?, ?)').run(user.id, ipAddress, userAgent);

        // Create token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
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
        const { name, email, phone, currentPassword, newPassword } = req.body;
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
        // Note: Avatar is handled by separate endpoint now, but we'll leave it in query in case manual text update used?
        // Actually, user text updates shouldn't touch avatar unless specified.
        // We'll remove avatar from this generic update to avoid issues, or support it if sent as text (URL).
        // The user mentioned "Profile Update (Fix Crash): likely crashes on large Body (Base64)... Recommended: dedicated ... endpoint".
        // So I will remove `avatar` from input here, or check if it's a URL. 
        // I'll leave it but only if it's small? No, safer to just rely on the other endpoint for files.
        // If the frontend sends safety text updates, it probably excludes avatar now.

        const stmt = db.prepare(`
            UPDATE users 
            SET name = COALESCE(?, name), 
                email = COALESCE(?, email), 
                phone = COALESCE(?, phone),
                password = ? 
            WHERE id = ?
        `);

        stmt.run(name || null, email || null, phone || null, passwordHash, userId);

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

/**
 * Verify OTP
 */
exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.otp !== otp || user.otp_expiry < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Clear OTP & Verify User (if not already)
        db.prepare('UPDATE users SET otp = NULL, otp_expiry = NULL, is_verified = 1 WHERE id = ?').run(user.id);

        // Record Device
        db.prepare('INSERT INTO login_history (user_id, ip_address, user_agent) VALUES (?, ?, ?)').run(user.id, ipAddress, userAgent);

        // Generate Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }, // Include avatar
            message: 'OTP verified, login successful'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Forgot Password
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
        // Always return success even if user not found (security)
        if (!user) {
            return res.json({ success: true, message: 'If account exists, reset link sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiry = Date.now() + 60 * 60 * 1000; // 1 hr

        db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(resetToken, expiry, user.id);

        await sendEmail(email, 'Reset Password', `Use this token to reset: ${resetToken}`, `<p>Reset Token: <strong>${resetToken}</strong></p>`);

        res.json({ success: true, message: 'Reset link sent' });

    } catch (error) {
        next(error);
    }
};

/**
 * Upload Avatar
 */
exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const userId = req.user.id;

        db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, userId);

        const user = db.prepare('SELECT id, name, email, phone, avatar FROM users WHERE id = ?').get(userId);

        res.json({
            success: true,
            avatar: avatarUrl,
            user,
            message: 'Avatar uploaded successfully'
        });
    } catch (error) {
        next(error);
    }
};
