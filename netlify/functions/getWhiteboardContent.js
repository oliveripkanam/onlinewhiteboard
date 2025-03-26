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

  // Get whiteboard ID from query params
  const whiteboardId = event.queryStringParameters.id;
  
  if (!whiteboardId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Whiteboard ID is required' })
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
    const contentsCollection = database.collection('whiteboard_contents');
    
    // First verify the user has access to this whiteboard
    const whiteboard = await whiteboardsCollection.findOne({ id: whiteboardId, userId });
    
    if (!whiteboard) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied or whiteboard not found' })
      };
    }
    
    // Get the whiteboard content
    const contentDoc = await contentsCollection.findOne({ whiteboardId });
    const content = contentDoc ? contentDoc.content : null;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        whiteboardId,
        content
      })
    };
  } catch (error) {
    console.error('Error in getWhiteboardContent:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    await client.close();
  }
}; 