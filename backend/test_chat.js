const axios = require('axios');

async function test() {
  try {
    console.log('Testing connection to Django AI service on http://localhost:8000/ai/chat...');
    const response = await axios.post(
      'http://localhost:8000/ai/chat',
      { message: 'Hello', sessionId: 'test-session', userId: '1a1549d4-b9d8-47a4-ada3-80645f61b631' },
      { headers: { 'X-Internal-API-Key': 'trusthire_internal_key_dev_secret_32chars' }, timeout: 10000 }
    );
    console.log('Success!', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Data:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

test();
