const { MongoClient } = require('mongodb');

async function checkAdmin() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    const admin = await db.collection('users').findOne({ 
      email: 'testadmin@test.com' 
    });
    
    if (admin) {
      console.log('Found admin user:');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Status:', admin.status);
      console.log('Password hash length:', admin.password_hash?.length);
      console.log('Hash starts with:', admin.password_hash?.substring(0, 20) + '...');
    } else {
      console.log('Admin user not found');
    }
    
    // Check if any admin users exist
    const adminCount = await db.collection('users').countDocuments({ role: 'ADMIN' });
    console.log('Total admin users:', adminCount);
    
  } finally {
    await client.close();
  }
}

checkAdmin().catch(console.error);
