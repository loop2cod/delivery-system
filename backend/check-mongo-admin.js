const { MongoClient } = require('mongodb');

async function checkAdmin() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    const admins = await db.collection('users').find({ role: 'ADMIN' }).toArray();
    console.log('Found', admins.length, 'admin users:');
    
    admins.forEach((admin, i) => {
      console.log(`\n${i + 1}. Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Password hash: ${admin.password ? admin.password.substring(0, 20) + '...' : 'N/A'}`);
      console.log(`   Password_hash: ${admin.password_hash ? admin.password_hash.substring(0, 20) + '...' : 'N/A'}`);
    });
    
  } finally {
    await client.close();
  }
}

checkAdmin().catch(console.error);
