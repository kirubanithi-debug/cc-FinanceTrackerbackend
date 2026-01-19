const { db } = require('./database/db');

try {
    console.log('Checking schema for phone column...');

    // Check if phone column exists in users
    const tableInfo = db.pragma('table_info(users)');
    const hasPhone = tableInfo.some(col => col.name === 'phone');

    if (!hasPhone) {
        console.log('Adding phone column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
        console.log('Phone column added.');
    } else {
        console.log('Phone column already exists.');
    }

    console.log('Migration complete.');
} catch (err) {
    console.error('Migration failed:', err);
}
