const { MongoClient, ObjectId } = require('mongodb');

async function createTestRequest() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    // Create a test delivery request
    const testRequest = {
      _id: new ObjectId(),
      tracking_number: 'TEST' + Date.now(),
      status: 'PENDING',
      pickup_location: {
        name: 'Test Pickup Location',
        address: 'Dubai Marina, Dubai, UAE',
        latitude: 25.0736,
        longitude: 55.1379,
        phone: '+971501234567',
        notes: 'Test pickup location'
      },
      delivery_location: {
        name: 'Test Delivery Location', 
        address: 'Downtown Dubai, Dubai, UAE',
        latitude: 25.1972,
        longitude: 55.2744,
        phone: '+971501234568',
        notes: 'Test delivery location'
      },
      package_details: {
        description: 'Test package',
        weight: 1.5,
        dimensions: { length: 20, width: 15, height: 10 },
        value: 100,
        fragile: false
      },
      special_instructions: 'Test delivery request for assignment testing',
      estimated_cost: 25,
      payment_method: 'CASH_ON_DELIVERY',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const result = await db.collection('delivery_requests').insertOne(testRequest);
    console.log('Created test delivery request:', result.insertedId.toString());
    console.log('Tracking number:', testRequest.tracking_number);
    
    return result.insertedId.toString();
  } finally {
    await client.close();
  }
}

createTestRequest().catch(console.error);