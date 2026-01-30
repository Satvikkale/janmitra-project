import 'dotenv/config';
import mongoose from 'mongoose';
import { User, UserSchema } from '../users/user.schema';

/**
 * Script to add platform_admin role to a user
 * Usage: npx ts-node src/seed/add-platform-admin.ts <email_or_phone>
 * Example: npx ts-node src/seed/add-platform-admin.ts admin@example.com
 */

async function run() {
  const identifier = process.argv[2];
  
  if (!identifier) {
    console.error('Usage: npx ts-node src/seed/add-platform-admin.ts <email_or_phone>');
    console.error('Example: npx ts-node src/seed/add-platform-admin.ts admin@example.com');
    process.exit(1);
  }

  const uri = process.env.MONGO_URI!;
  if (!uri) {
    console.error('MONGO_URI not found in environment variables');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const UserModel = mongoose.model(User.name, UserSchema);

  // Try to find user by email or phone
  const user = await UserModel.findOne({
    $or: [
      { email: identifier },
      { phone: identifier }
    ]
  });

  if (!user) {
    console.error(`❌ User not found with email/phone: ${identifier}`);
    console.log('\nAvailable users:');
    const allUsers = await UserModel.find().select('name email phone roles').lean();
    allUsers.forEach((u: any) => {
      console.log(`  - ${u.name} (${u.email || u.phone}) - Roles: ${u.roles.join(', ')}`);
    });
    process.exit(1);
  }

  // Check if already has platform_admin role
  if (user.roles.includes('platform_admin')) {
    console.log(`✅ User "${user.name}" already has platform_admin role`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Current roles: ${user.roles.join(', ')}`);
    process.exit(0);
  }

  // Add platform_admin role
  user.roles.push('platform_admin');
  await user.save();

  console.log(`✅ Successfully added platform_admin role to user "${user.name}"`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Phone: ${user.phone}`);
  console.log(`   Updated roles: ${user.roles.join(', ')}`);
  console.log('\n🔑 Please log out and log in again for changes to take effect.');
  
  process.exit(0);
}

run().catch(e => { 
  console.error('Error:', e); 
  process.exit(1); 
});
