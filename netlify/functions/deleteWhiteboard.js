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

    // Connect to MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find the whiteboard and check if the user is the owner
    const whiteboard = await collection.findOne({ _id: new ObjectId(whiteboardId) });
    
    if (!whiteboard) {
      await client.close();
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Whiteboard not found' })
      };
    }

    // Delete the whiteboard
    await collection.deleteOne({ _id: new ObjectId(whiteboardId) });
    
    await client.close();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Whiteboard deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting whiteboard:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error deleting whiteboard', details: error.message })
    };
  }
}; 