const { db } = require('./database/db');

const email = process.argv[2];

if (!email) {
    console.error('Usage: node promote_admin.js <email>');
    process.exit(1);
}

const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);

if (!user) {
    console.error('❌ User not found');
    process.exit(1);
}

db.prepare('UPDATE users SET role = \'admin\' WHERE id = ?').run(user.id);
console.log(`✅ User ${user.name} (${email}) has been promoted to ADMIN.`);
