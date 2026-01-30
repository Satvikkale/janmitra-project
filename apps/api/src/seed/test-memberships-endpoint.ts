// Quick test to call the memberships endpoint
const fetch = require('node-fetch');

async function testEndpoint() {
  const societyId = '6976689bdef5e1c7aa94e9c2'; // Hero society
  const url = `http://localhost:4000/v1/societies/${societyId}/memberships?status=pending`;
  
  console.log(`Testing endpoint: ${url}`);
  console.log('\nNote: This should fail with 401 since we have no auth token');
  console.log('This confirms the @UseGuards decorator is working\n');
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    const data = await response.text();
    console.log(`Response: ${data}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testEndpoint();
