const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/thesis-flow');
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log('Users:');
  for (const u of users) {
    console.log(` - Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
