/**
 * Settings Controller
 * Handles all settings-related business logic
 */

const { db } = require('../database/db');

const settingsController = {
    /**
     * Get all settings
     */
    getAll: (req, res, next) => {
        try {
            const settings = db.prepare('SELECT * FROM settings').all();

            const result = {};
            settings.forEach(s => {
                try {
                    // Try to parse JSON values
                    result[s.key] = JSON.parse(s.value);
                } catch {
                    result[s.key] = s.value;
                }
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get setting by key
     */
    getByKey: (req, res, next) => {
        try {
            const { key } = req.params;
            const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);

            if (!setting) {
                return res.json({
                    success: true,
                    data: null
                });
            }

            let value;
            try {
                value = JSON.parse(setting.value);
            } catch {
                value = setting.value;
            }

            res.json({
                success: true,
                data: { key: setting.key, value }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update a setting (upsert)
     */
    update: (req, res, next) => {
        try {
            const { key } = req.params;
            const { value } = req.body;

            if (value === undefined) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Value is required' }
                });
            }

            // Stringify value if it's an object
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

            // Upsert - insert or update
            db.prepare(`
                INSERT INTO settings (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = datetime('now')
            `).run(key, valueStr);

            res.json({
                success: true,
                data: { key, value },
                message: 'Setting updated successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete a setting
     */
    delete: (req, res, next) => {
        try {
            const { key } = req.params;

            db.prepare('DELETE FROM settings WHERE key = ?').run(key);

            res.json({
                success: true,
                message: 'Setting deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = settingsController;
