/**
 * Admin Controller - Supabase Version
 */

const { supabase } = require('../database/db');

const adminController = {
    /**
     * List all users
     */
    getAllUsers: async (req, res, next) => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name, email, role, is_verified, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get last login for each user
            const enrichedUsers = await Promise.all(users.map(async (user) => {
                const { data: lastLogin } = await supabase
                    .from('login_history')
                    .select('created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    ...user,
                    last_login: lastLogin ? lastLogin.created_at : null
                };
            }));

            res.json({
                success: true,
                data: enrichedUsers
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete a user
     */
    deleteUser: async (req, res, next) => {
        try {
            const { id } = req.params;

            if (parseInt(id) === req.user.id) {
                return res.status(400).json({ success: false, message: 'Cannot delete your own admin account.' });
            }

            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('id', id)
                .single();

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            await supabase.from('users').delete().eq('id', id);

            res.json({
                success: true,
                message: 'User deleted successfully.'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = adminController;
