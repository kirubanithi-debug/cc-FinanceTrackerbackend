/**
 * FinanceFlow Backend - Supabase Database Connection
 * Replaces SQLite with Supabase PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration (from Environment Variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for backend

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables!');
    process.exit(1);
}

// Create Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase client initialized');

/**
 * Initialize database - No longer needed as schema is managed via Supabase Dashboard/MCP
 * Kept for legacy compatibility
 */
function initializeDatabase() {
    console.log('✅ Database initialized (Supabase - schema managed externally)');
}

module.exports = { supabase, initializeDatabase };
