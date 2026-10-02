const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

const email = 'rajwarish38@gmail.com';
const newPassword = process.argv[2] || '123@Wariya#prince990';

const user = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());

if (!user) {
  console.error(`User with email ${email} not found in data/users.json.`);
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
user.passwordHash = `scrypt$${salt}$${hash}`;

fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
console.log(`Admin password for ${email} successfully set to: ${newPassword}`);
