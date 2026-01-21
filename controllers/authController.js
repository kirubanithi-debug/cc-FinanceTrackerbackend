const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../database/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email Transporter (Production Configuration)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'financeflow-secret-key-change-it-in-prod';

// Helper to send email
async function sendEmail(to, subject, text, html) {
    try {
        console.log(`📧 Sending email to ${to}`);

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials missing. Email not sent (Logged only).');
            return true;
        }

        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"FinanceFlow" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log('✅ Email sent successfully');
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
}

/**
 * Register a new user
 */
exports.signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Please provide name, email, and password' }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' }
            });
        }

        // Check if email exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_EMAIL', message: 'Email already registered' }
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(8); // Reduced from 10 for faster processing on free-tier hosting
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password: hashedPassword,
                verification_token: verificationToken,
                is_verified: 0
            })
            .select()
            .single();

        if (error) throw error;

        // Send Verification Email
        const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;
        await sendEmail(email, 'Verify your Email', `Please click here to verify: ${verifyLink}`, `<a href="${verifyLink}">Verify Email</a>`);

        res.status(201).json({
            success: true,
            message: 'User registered. Please check your email to verify account.'
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
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
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
        const { data: knownDevice } = await supabase
            .from('login_history')
            .select('id')
            .eq('user_id', user.id)
            .eq('user_agent', userAgent)
            .single();

        if (!knownDevice) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = Date.now() + 10 * 60 * 1000;

            await supabase
                .from('users')
                .update({ otp, otp_expiry: otpExpiry })
                .eq('id', user.id);

            await sendEmail(user.email, 'Login OTP', `Your OTP is: ${otp}`, `<p>Your OTP is: <strong>${otp}</strong></p>`);

            return res.status(202).json({
                success: true,
                requiresOtp: true,
                message: 'OTP sent to email'
            });
        }

        // Record Login
        await supabase.from('login_history').insert({
            user_id: user.id,
            ip_address: ipAddress,
            user_agent: userAgent
        });

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
exports.getMe = async (req, res, next) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, phone, avatar, created_at')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
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

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (email && email !== user.email) {
            const { data: exists } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (exists) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }
        }

        let passwordHash = user.password;
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: 'Current password required to change password' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Incorrect current password' });
            }
            const salt = await bcrypt.genSalt(8); // Reduced from 10 for faster processing on free-tier hosting
            passwordHash = await bcrypt.hash(newPassword, salt);
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (phone) updates.phone = phone;
        updates.password = passwordHash;

        await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        const { data: updatedUser } = await supabase
            .from('users')
            .select('id, name, email, phone, avatar, created_at')
            .eq('id', userId)
            .single();

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

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.otp !== otp || user.otp_expiry < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        await supabase
            .from('users')
            .update({ otp: null, otp_expiry: null, is_verified: 1 })
            .eq('id', user.id);

        await supabase.from('login_history').insert({
            user_id: user.id,
            ip_address: ipAddress,
            user_agent: userAgent
        });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
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

        const { data: user } = await supabase
            .from('users')
            .select('id, name')
            .eq('email', email)
            .single();

        if (!user) {
            return res.json({ success: true, message: 'If account exists, reset link sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiry = Date.now() + 60 * 60 * 1000;

        await supabase
            .from('users')
            .update({ reset_token: resetToken, reset_token_expiry: expiry })
            .eq('id', user.id);

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

        await supabase
            .from('users')
            .update({ avatar: avatarUrl })
            .eq('id', userId);

        const { data: user } = await supabase
            .from('users')
            .select('id, name, email, phone, avatar')
            .eq('id', userId)
            .single();

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
