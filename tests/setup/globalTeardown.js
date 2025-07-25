// Global test teardown
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Stop and remove test containers
    await cleanupTestContainers();
    
    // Clean up test files
    await cleanupTestFiles();
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error.message);
  }
};

async function cleanupTestContainers() {
  const containers = ['postgres-test', 'redis-test'];
  
  for (const container of containers) {
    try {
      console.log(`Stopping ${container} container...`);
      execSync(`docker stop ${container}`, { stdio: 'ignore' });
      execSync(`docker rm ${container}`, { stdio: 'ignore' });
      console.log(`✅ ${container} container cleaned up`);
    } catch (error) {
      console.log(`⚠️ ${container} container was not running or already removed`);
    }
  }
}

async function cleanupTestFiles() {
  try {
    console.log('Cleaning up test files...');
    execSync('rm -rf coverage/.jest-cache', { stdio: 'ignore' });
    console.log('✅ Test files cleaned up');
  } catch (error) {
    console.log('⚠️ No test files to clean up');
  }
}