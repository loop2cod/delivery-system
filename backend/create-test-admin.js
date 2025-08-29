const { MongoClient, ObjectId } = require('mongodb');

async function createTestAdmin() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    // Create admin user
    const adminUser = {
      _id: new ObjectId(),
      email: 'testadmin@test.com',
      name: 'Test Admin',
      phone: '+971501234567',
      role: 'ADMIN',
      status: 'ACTIVE',
      password_hash: '$2b$12$LQv3c1yqBFVyHlyGMFwzCOl8yDzQZrWPJGJM2zOc7HTjJ7RKqKqVe', // hashed 'testadmin123'
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('users').insertOne(adminUser);
    console.log('Created admin user:', result.insertedId.toString());
    console.log('Admin credentials:');
    console.log('Email: testadmin@test.com');
    console.log('Password: testadmin123');
    
    return result.insertedId.toString();
  } finally {
    await client.close();
  }
}

createTestAdmin().catch(console.error);
