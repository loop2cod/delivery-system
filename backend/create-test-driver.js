const { MongoClient, ObjectId } = require('mongodb');

async function createTestDriver() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    // First create a user account
    const driverUser = {
      _id: new ObjectId(),
      email: 'testdriverprofile@test.com',
      name: 'Test Driver Profile',
      phone: '+971501234567',
      role: 'DRIVER',
      status: 'ACTIVE',
      password_hash: '$2b$12$LQv3c1yqBFVyHlyGMFwzCOl8yDzQZrWPJGJM2zOc7HTjJ7RKqKqVe', // hashed 'testdriver123'
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const userResult = await db.collection('users').insertOne(driverUser);
    console.log('Created driver user:', userResult.insertedId.toString());
    
    // Then create a driver profile
    const driverProfile = {
      _id: new ObjectId(),
      user_id: userResult.insertedId,
      name: 'Test Driver Profile',
      email: 'testdriverprofile@test.com',
      phone: '+971501234567',
      license_number: 'DL' + Date.now(), // Unique license number
      vehicle_type: 'motorcycle',
      vehicle_plate: 'DXB' + Date.now(),
      status: 'ACTIVE',
      availability_status: 'AVAILABLE',
      rating: 5.0,
      total_deliveries: 0,
      completed_deliveries: 0,
      documents_verified: true,
      joined_date: new Date(),
      last_active: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const driverResult = await db.collection('drivers').insertOne(driverProfile);
    console.log('Created driver profile:', driverResult.insertedId.toString());
    
    console.log('\nTest driver credentials:');
    console.log('Email: testdriverprofile@test.com');
    console.log('Password: testdriver123');
    console.log('Driver Profile ID:', driverResult.insertedId.toString());
    
    return {
      userId: userResult.insertedId.toString(),
      driverId: driverResult.insertedId.toString()
    };
  } finally {
    await client.close();
  }
}

createTestDriver().catch(console.error);