const { db } = require('../database/db');

const adminController = {
    /**
     * List all users
     */
    getAllUsers: (req, res, next) => {
        try {
            // Fetch users with their last login info
            const users = db.prepare(`
                SELECT 
                    u.id, u.name, u.email, u.role, u.is_verified, 
                    u.created_at, 
                    (SELECT created_at FROM login_history WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_login
                FROM users u
                ORDER BY u.created_at DESC
            `).all();

            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete a user
     */
    deleteUser: (req, res, next) => {
        try {
            const { id } = req.params;

            // Prevent deleting self
            if (parseInt(id) === req.user.id) {
                return res.status(400).json({ success: false, message: 'Cannot delete your own admin account.' });
            }

            const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Delete user (Cascading delete handles login_history, but clients are kept)
            db.prepare('DELETE FROM users WHERE id = ?').run(id);

            res.json({
                success: true,
                message: 'User deleted successfully. (Related data retained due to shared model)'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = adminController;
