const { MongoClient, ObjectId } = require('mongodb');
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

  // Parse request body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const { whiteboard, content } = data;

  if (!whiteboard) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Whiteboard data is required' })
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
    
    // If whiteboard has an id, update it; otherwise create a new one
    let whiteboardId = whiteboard.id;
    let isNew = false;
    
    if (whiteboardId && whiteboardId.startsWith('wb-')) {
      // This is an existing whiteboard, update it
      const result = await whiteboardsCollection.updateOne(
        { id: whiteboardId, userId },
        { 
          $set: { 
            name: whiteboard.name,
            updatedAt: new Date().toISOString(),
            thumbnail: whiteboard.thumbnail || null
          } 
        }
      );
      
      // If no document matched, the whiteboard doesn't exist or doesn't belong to this user
      if (result.matchedCount === 0) {
        isNew = true;
      }
    } else {
      isNew = true;
    }
    
    if (isNew) {
      // Create a new whiteboard
      whiteboardId = `wb-${Date.now()}`;
      await whiteboardsCollection.insertOne({
        id: whiteboardId,
        userId,
        name: whiteboard.name || `Whiteboard ${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: whiteboard.thumbnail || null
      });
    }
    
    // Save content if provided
    if (content) {
      await contentsCollection.updateOne(
        { whiteboardId },
        { $set: { content, userId, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        whiteboardId,
        isNew
      })
    };
  } catch (error) {
    console.error('Error in saveWhiteboard:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    await client.close();
  }
}; 