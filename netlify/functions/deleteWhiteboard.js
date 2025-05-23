// Netlify function to delete a whiteboard
const { MongoClient } = require('mongodb');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Support both DELETE and POST methods
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use DELETE or POST.' })
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

  // Get the whiteboard ID 
  // Support both query parameters and JSON body
  let whiteboardId;
  if (event.queryStringParameters && event.queryStringParameters.id) {
    whiteboardId = event.queryStringParameters.id;
  } else if (event.body) {
    try {
      const body = JSON.parse(event.body);
      whiteboardId = body.id;
    } catch (e) {
      // If body parsing fails, continue with query parameters
    }
  }

  if (!whiteboardId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Whiteboard ID is required' })
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
    
    const database = client.db('whiteboardly');
    const whiteboardsCollection = database.collection('whiteboards');
    const contentsCollection = database.collection('whiteboard_contents');
    
    console.log(`Deleting whiteboard: ${whiteboardId} for user: ${userId}`);
    
    // Delete the whiteboard
    const deleteResult = await whiteboardsCollection.deleteOne({
      id: whiteboardId,
      owner: userId
    });
    
    console.log("Whiteboard deletion result:", deleteResult);
    
    if (deleteResult.deletedCount === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Whiteboard not found or not owned by this user' 
        })
      };
    }
    
    // Also delete the content
    const contentDeleteResult = await contentsCollection.deleteOne({
      whiteboardId
    });
    
    console.log("Content deletion result:", contentDeleteResult);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Whiteboard deleted successfully'
      })
    };
  } catch (error) {
    console.error('Error in deleteWhiteboard:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error deleting whiteboard',
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