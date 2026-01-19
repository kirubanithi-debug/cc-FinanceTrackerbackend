/**
 * Database Initialization Script
 * Run with: npm run init-db
 */

require('dotenv').config();
const { initializeDatabase } = require('./db');

console.log('🔧 Initializing FinanceFlow database...');
initializeDatabase();
console.log('✅ Database setup complete!');
process.exit(0);
