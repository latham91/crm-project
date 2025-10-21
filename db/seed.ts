import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await db.insert(users).values({
    username: 'superadmin',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'SUPER_ADMIN',
  });

  console.log('✅ Super admin user created!');
  console.log('Username: superadmin');
  console.log('Password: admin123');
  console.log('⚠️  Remember to change this password in production!');
  
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

