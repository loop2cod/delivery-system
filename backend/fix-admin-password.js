const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');

async function fixAdminPassword() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    // Generate proper password hash for 'testadmin123'
    const passwordHash = await bcrypt.hash('testadmin123', 12);
    console.log('Generated password hash:', passwordHash);
    
    // Update the admin user
    const result = await db.collection('users').updateOne(
      { email: 'testadmin@test.com' },
      { 
        $set: { 
          password_hash: passwordHash,
          updated_at: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      console.log('Admin user not found, creating new one...');
      
      const adminUser = {
        _id: new ObjectId(),
        email: 'testadmin@test.com',
        name: 'Test Admin',
        phone: '+971501234567',
        role: 'ADMIN',
        status: 'ACTIVE',
        password_hash: passwordHash,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const insertResult = await db.collection('users').insertOne(adminUser);
      console.log('Created new admin user:', insertResult.insertedId.toString());
    } else {
      console.log('Updated admin password');
    }
    
  } finally {
    await client.close();
  }
}

fixAdminPassword().catch(console.error);
