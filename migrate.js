const { db } = require('./database/db');

try {
    console.log('Checking schema...');

    // Check if avatar column exists in users
    const tableInfo = db.pragma('table_info(users)');
    const hasAvatar = tableInfo.some(col => col.name === 'avatar');

    if (!hasAvatar) {
        console.log('Adding avatar column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
        console.log('Avatar column added.');
    } else {
        console.log('Avatar column already exists.');
    }

    console.log('Migration complete.');
} catch (err) {
    console.error('Migration failed:', err);
}
