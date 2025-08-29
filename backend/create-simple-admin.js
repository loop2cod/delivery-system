const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

async function createSimpleAdmin() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    // First, clean up existing test admin
    await db.collection('users').deleteOne({ email: 'testassign@admin.com' });
    
    // Create simple admin with known password
    const passwordHash = await bcrypt.hash('test123', 12);
    
    const adminUser = {
      _id: new ObjectId(),
      email: 'testassign@admin.com',
      name: 'Test Assignment Admin',
      phone: '+971501234567',
      role: 'ADMIN',
      status: 'ACTIVE',
      password_hash: passwordHash,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('users').insertOne(adminUser);
    console.log('✅ Created test admin:', result.insertedId.toString());
    console.log('📧 Email: testassign@admin.com');
    console.log('🔑 Password: test123');
    
    return result.insertedId.toString();
  } finally {
    await client.close();
  }
}

createSimpleAdmin().catch(console.error);
