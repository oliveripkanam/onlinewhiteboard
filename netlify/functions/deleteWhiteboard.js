// Netlify function to delete a whiteboard
const { MongoClient, ObjectId } = require('mongodb');

// Constants for MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'whiteboardly';
const COLLECTION_NAME = 'whiteboards';

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Check if the request is DELETE or POST
  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use DELETE or POST.' })
    };
  }

  let client;
  try {
    // Get whiteboard ID from query parameters
    const whiteboardId = event.queryStringParameters?.id;
    
    if (!whiteboardId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Whiteboard ID is required' })
      };
    }

    // Extract user ID from Authorization header token
    const authHeader = event.headers.authorization || '';
    const token = authHeader.split(' ')[1];

    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Connect to MongoDB with new connection options
    const options = { 
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    };
    
    client = new MongoClient(MONGODB_URI, options);
    await client.connect();
    console.log("Connected to MongoDB successfully");
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // First try to find the whiteboard - handle both string IDs and ObjectIds
    let whiteboard;
    try {
      // Try with ObjectId first
      whiteboard = await collection.findOne({ _id: new ObjectId(whiteboardId) });
    } catch (err) {
      // If ObjectId fails, try with string ID
      whiteboard = await collection.findOne({ id: whiteboardId });
    }
    
    if (!whiteboard) {
      console.log(`Whiteboard not found: ${whiteboardId}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Whiteboard not found' })
      };
    }

    console.log(`Found whiteboard: ${JSON.stringify(whiteboard)}`);

    // Delete using the appropriate ID field
    let deleteResult;
    if (whiteboard._id) {
      deleteResult = await collection.deleteOne({ _id: whiteboard._id });
    } else {
      deleteResult = await collection.deleteOne({ id: whiteboardId });
    }
    
    console.log(`Deletion result: ${JSON.stringify(deleteResult)}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Whiteboard deleted successfully',
        result: deleteResult
      })
    };
  } catch (error) {
    console.error('Error deleting whiteboard:', error);
    
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
    // Make sure to close the connection in all cases
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  }
}; 