import { connect, connection } from 'mongoose';
import { ObjectId } from 'mongodb';

async function checkMemberships() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/janmitra_dev';
    console.log(`Connecting to: ${uri}`);
    await connect(uri);
    console.log('✅ Connected to MongoDB');

    const db = connection.db!;
    
    // Check all societies
    const societies = await db.collection('societies').find().toArray();
    console.log(`\n📋 Societies (${societies.length} total):`);
    societies.forEach(s => {
      console.log(`  - ${s.name} (${s._id})`);
      console.log(`    Status: ${s.status}`);
      console.log(`    Head: ${s.headUserSub}`);
    });

    // Check all memberships
    const memberships = await db.collection('societymemberships').find().toArray();
    console.log('\n👥 Memberships:');
    if (memberships.length === 0) {
      console.log('  ❌ No memberships found!');
    } else {
      memberships.forEach(m => {
        console.log(`  - User: ${m.userSub}`);
        console.log(`    Society: ${m.societyId}`);
        console.log(`    Role: ${m.role}`);
        console.log(`    Status: ${m.status}`);
        console.log('');
      });
    }

    // Check user Kumu
    const kumu = await db.collection('users').findOne({ email: 'kumu@gmail.com' });
    if (kumu) {
      console.log('\n👤 User Kumu:');
      console.log(`  ID: ${kumu._id}`);
      console.log(`  Name: ${kumu.name}`);
      console.log(`  Roles: ${JSON.stringify(kumu.roles)}`);
      console.log(`  SocietyIds: ${JSON.stringify(kumu.societyIds)}`);
    }

    // Check society head user
    const headId = '6976689bdef5e1c7aa94e9b8';
    const head = await db.collection('users').findOne({ _id: new ObjectId(headId) });
    if (head) {
      console.log('\n👤 Society Head User:');
      console.log(`  ID: ${head._id}`);
      console.log(`  Name: ${head.name}`);
      console.log(`  Email: ${head.email}`);
      console.log(`  Phone: ${head.phone}`);
      console.log(`  Roles: ${JSON.stringify(head.roles)}`);
      console.log(`  SocietyIds: ${JSON.stringify(head.societyIds)}`);
    } else {
      console.log(`\n❌ Could not find head user with ID: ${headId}`);
    }

    await connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMemberships();
