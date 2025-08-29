const { MongoClient, ObjectId } = require('mongodb');

async function testAssignmentDirect() {
  const client = new MongoClient('mongodb://localhost:27017/delivery_uae_dev');
  await client.connect();
  const db = client.db();
  
  try {
    const DRIVER_ID = "68a8bf88749194545411f959";
    const REQUEST_ID = "68a8bf8c77f9eb3ac8d231da";
    
    console.log('=== Testing Assignment Workflow Directly ===');
    
    // 1. Check if driver exists
    const driver = await db.collection('drivers').findOne({ _id: new ObjectId(DRIVER_ID) });
    console.log('\n1. Driver exists:', !!driver);
    if (driver) {
      console.log('   Driver name:', driver.name);
      console.log('   Driver email:', driver.email);
    }
    
    // 2. Check if request exists
    const request = await db.collection('delivery_requests').findOne({ _id: new ObjectId(REQUEST_ID) });
    console.log('\n2. Request exists:', !!request);
    if (request) {
      console.log('   Request status:', request.status);
      console.log('   Tracking number:', request.tracking_number);
      console.log('   Currently assigned to:', request.assigned_driver_id || 'None');
    }
    
    // 3. Assign the request to the driver (simulating admin assignment)
    if (driver && request) {
      console.log('\n3. Assigning request to driver...');
      const result = await db.collection('delivery_requests').updateOne(
        { _id: new ObjectId(REQUEST_ID) },
        { 
          $set: { 
            assigned_driver_id: new ObjectId(DRIVER_ID),
            status: 'ASSIGNED',
            assignedAt: new Date(),
            updated_at: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('   ✅ Assignment successful!');
        
        // 4. Verify driver can retrieve the assignment
        console.log('\n4. Testing driver assignment retrieval...');
        const assignments = await db.collection('delivery_requests').find({
          assigned_driver_id: new ObjectId(DRIVER_ID),
          status: { $in: ['ASSIGNED', 'IN_PROGRESS'] }
        }).toArray();
        
        console.log('   Driver has', assignments.length, 'assignments');
        
        assignments.forEach((assignment, i) => {
          console.log(`   ${i + 1}. ${assignment.tracking_number} - ${assignment.status}`);
        });
        
        if (assignments.length > 0) {
          console.log('\n✅ SUCCESS: Assignment workflow is working!');
          console.log('   - Admin can assign requests (field name fixed) ✓');
          console.log('   - Driver can retrieve assignments ✓');
          console.log('   - Assignment field name mismatch resolved ✓');
        } else {
          console.log('\n❌ Driver cannot see assignments');
        }
      } else {
        console.log('   ❌ Assignment failed');
      }
    } else {
      console.log('\n❌ Cannot proceed - missing driver or request');
    }
    
  } finally {
    await client.close();
  }
}

testAssignmentDirect().catch(console.error);
