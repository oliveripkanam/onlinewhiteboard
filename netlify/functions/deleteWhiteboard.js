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

  // Log start of function execution
  console.log("DeleteWhiteboard function started");
  console.log("HTTP Method:", event.httpMethod);
  
  // Log masked URI to debug connection string issues
  const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log("MongoDB URI format:", maskedUri);
  console.log("Database name:", DB_NAME);

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

  let client = null;
  try {
    // Get whiteboard ID from query parameters
    const whiteboardId = event.queryStringParameters?.id;
    console.log("Whiteboard ID to delete:", whiteboardId);
    
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
    console.log("Auth token present:", !!token);

    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    console.log("Attempting to connect to MongoDB...");
    
    // Simple connection options
    const options = { 
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    };
    
    try {
      // Create client
      console.log("Creating MongoDB client...");
      client = new MongoClient(MONGODB_URI, options);
      
      // Connect to MongoDB
      console.log("Connecting to MongoDB...");
      await client.connect();
      console.log("Successfully connected to MongoDB!");
      
      // Access database and collection
      console.log(`Accessing database '${DB_NAME}'...`);
      const db = client.db(DB_NAME);
      console.log(`Accessing collection '${COLLECTION_NAME}'...`);
      const collection = db.collection(COLLECTION_NAME);
      
      console.log("MongoDB setup complete");
    } catch (connectionError) {
      console.error("MongoDB connection error:", connectionError);
      if (connectionError.name === 'MongoServerSelectionError') {
        console.error("Server selection timed out. Check network or credentials.");
      }
      if (connectionError.message && connectionError.message.includes('auth')) {
        console.error("Authentication error details:", connectionError.message);
      }
      throw connectionError;
    }

    // First try to find the whiteboard - handle both string IDs and ObjectIds
    console.log("Searching for whiteboard...");
    let whiteboard;
    try {
      // Try with ObjectId first
      console.log("Attempting to find whiteboard with ObjectId...");
      try {
        const objectId = new ObjectId(whiteboardId);
        console.log("Valid ObjectId format");
        whiteboard = await collection.findOne({ _id: objectId });
      } catch (idError) {
        console.log("Not a valid ObjectId, will try string ID");
      }
      
      // If not found with ObjectId, try with string ID
      if (!whiteboard) {
        console.log("Attempting to find whiteboard with string ID...");
        whiteboard = await collection.findOne({ id: whiteboardId });
      }
    } catch (findError) {
      console.error("Error finding whiteboard:", findError);
      throw findError;
    }
    
    if (!whiteboard) {
      console.log(`Whiteboard not found: ${whiteboardId}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Whiteboard not found' })
      };
    }

    console.log(`Found whiteboard:`, JSON.stringify(whiteboard, null, 2));

    // Delete using the appropriate ID field
    let deleteResult;
    try {
      console.log("Attempting to delete whiteboard...");
      if (whiteboard._id) {
        console.log(`Deleting by _id: ${whiteboard._id}`);
        deleteResult = await collection.deleteOne({ _id: whiteboard._id });
      } else {
        console.log(`Deleting by id: ${whiteboardId}`);
        deleteResult = await collection.deleteOne({ id: whiteboardId });
      }
      console.log(`Deletion result:`, JSON.stringify(deleteResult, null, 2));
    } catch (deleteError) {
      console.error("Error deleting whiteboard:", deleteError);
      throw deleteError;
    }
    
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
    // More detailed error logging
    if (error.name) console.error('Error name:', error.name);
    if (error.code) console.error('Error code:', error.code);
    if (error.codeName) console.error('Error codeName:', error.codeName);
    if (error.errInfo) console.error('Error info:', error.errInfo);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error deleting whiteboard', 
        details: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      })
    };
  } finally {
    // Make sure to close the connection in all cases
    if (client) {
      try {
        console.log("Closing MongoDB connection...");
        await client.close();
        console.log("MongoDB connection closed successfully");
      } catch (closeError) {
        console.error("Error closing MongoDB connection:", closeError);
      }
    }
  }
}; 