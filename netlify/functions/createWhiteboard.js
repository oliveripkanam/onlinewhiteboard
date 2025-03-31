const { MongoClient } = require('mongodb');

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

  let client = null;
  try {
    console.log("Connecting to MongoDB...");
    // Connect to MongoDB with simple options
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    console.log("Connected to MongoDB successfully");
    
    // In a production app, we'd verify the Google token
    // For now, we'll just use the token as user ID 
    // to simplify the process
    const userId = token;
    
    // Generate a unique whiteboard ID
    const whiteboardId = `wb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const database = client.db('whiteboardly');
    const whiteboardsCollection = database.collection('whiteboards');
    
    // Create a new whiteboard
    const newWhiteboard = {
      id: whiteboardId,
      owner: userId,
      name: `Whiteboard ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thumbnail: null
    };
    
    const result = await whiteboardsCollection.insertOne(newWhiteboard);
    console.log("Whiteboard created:", result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        whiteboard: newWhiteboard
      })
    };
  } catch (error) {
    console.error('Error in createWhiteboard:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error creating whiteboard',
        details: error.message,
        stack: error.stack
      })
    };
  } finally {
    if (client) {
      try {
        await client.close();
        console.log("MongoDB connection closed");
      } catch (closeError) {
        console.error("Error closing MongoDB connection:", closeError);
      }
    }
  }
}; 