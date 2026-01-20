/**
 * Settings Controller - Supabase Version
 */

const { supabase } = require('../database/db');

const settingsController = {
    /**
     * Get all settings
     */
    getAll: async (req, res, next) => {
        try {
            const { data: settings, error } = await supabase.from('settings').select('*');
            if (error) throw error;

            const result = {};
            (settings || []).forEach(s => {
                try {
                    result[s.key] = JSON.parse(s.value);
                } catch {
                    result[s.key] = s.value;
                }
            });

            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get setting by key
     */
    getByKey: async (req, res, next) => {
        try {
            const { key } = req.params;
            const { data: setting } = await supabase
                .from('settings')
                .select('*')
                .eq('key', key)
                .single();

            if (!setting) {
                return res.json({ success: true, data: null });
            }

            let value;
            try {
                value = JSON.parse(setting.value);
            } catch {
                value = setting.value;
            }

            res.json({ success: true, data: { key: setting.key, value } });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update a setting (upsert)
     */
    update: async (req, res, next) => {
        try {
            const { key } = req.params;
            const { value } = req.body;

            if (value === undefined) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Value is required' }
                });
            }

            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

            // Upsert
            await supabase
                .from('settings')
                .upsert({ key, value: valueStr, updated_at: new Date().toISOString() }, { onConflict: 'key' });

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
    delete: async (req, res, next) => {
        try {
            const { key } = req.params;
            await supabase.from('settings').delete().eq('key', key);
            res.json({ success: true, message: 'Setting deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = settingsController;
