// Netlify function to get a user's whiteboards
const { MongoClient } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Check for authentication
  const authHeader = event.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required' })
    };
  }

  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    // Verify the Google token
    const oAuth2Client = new OAuth2Client();
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const userId = payload.sub; // Google user ID
    
    // Connect to MongoDB
    await client.connect();
    const database = client.db('whiteboardly');
    const whiteboardsCollection = database.collection('whiteboards');
    
    // Find all whiteboards for this user
    const whiteboards = await whiteboardsCollection.find({ userId }).toArray();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ whiteboards })
    };
  } catch (error) {
    console.error('Error in getWhiteboards:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    await client.close();
  }
}; 