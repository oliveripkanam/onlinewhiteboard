// Netlify function to get a user's whiteboards
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
    
    const database = client.db('whiteboardly');
    const whiteboardsCollection = database.collection('whiteboards');
    
    console.log("Finding whiteboards...");
    
    // In a production app, we'd verify the Google token
    // For now, we'll just use the token as user ID 
    // to simplify the process
    const userId = token;
    
    // Find all whiteboards for this user
    // Use a try/catch for the query just to be safe
    let whiteboards = [];
    try {
      whiteboards = await whiteboardsCollection.find({ owner: userId }).toArray();
      console.log(`Found ${whiteboards.length} whiteboards`);
    } catch (queryError) {
      console.error("Error querying whiteboards:", queryError);
      whiteboards = []; // Fallback to empty array
    }
    
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
      body: JSON.stringify({ 
        error: 'Error fetching whiteboards',
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