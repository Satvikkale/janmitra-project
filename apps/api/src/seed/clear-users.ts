import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGO_URI!;
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not established');
  
  const result = await db.collection('users').deleteMany({});
  console.log(`Deleted ${result.deletedCount} users from database.`);
  
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
