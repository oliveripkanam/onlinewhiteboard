const { MongoClient, ObjectId } = require('mongodb');

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
    
    console.log("Processing whiteboard with ID:", whiteboard.id);
    
    // If whiteboard has an id, update it; otherwise create a new one
    let whiteboardId = whiteboard.id;
    let isNew = false;
    
    if (whiteboardId) {
      console.log("Updating existing whiteboard");
      // This is an existing whiteboard, update it
      try {
        const result = await whiteboardsCollection.updateOne(
          { id: whiteboardId, owner: userId },
          { 
            $set: { 
              name: whiteboard.name,
              updatedAt: new Date().toISOString(),
              thumbnail: whiteboard.thumbnail || null
            } 
          }
        );
        
        console.log("Update result:", result);
        
        // If no document matched, the whiteboard doesn't exist or doesn't belong to this user
        if (result.matchedCount === 0) {
          console.log("No matching whiteboard found, creating new");
          isNew = true;
        }
      } catch (updateError) {
        console.error("Error updating whiteboard:", updateError);
        isNew = true; // Fall back to creating a new one
      }
    } else {
      isNew = true;
    }
    
    if (isNew) {
      // Create a new whiteboard
      console.log("Creating new whiteboard");
      whiteboardId = `wb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      try {
        const newWhiteboard = {
          id: whiteboardId,
          owner: userId,
          name: whiteboard.name || `Whiteboard ${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thumbnail: whiteboard.thumbnail || null
        };
        
        const result = await whiteboardsCollection.insertOne(newWhiteboard);
        console.log("Insert result:", result);
      } catch (insertError) {
        console.error("Error creating whiteboard:", insertError);
        throw insertError; // Rethrow to trigger error response
      }
    }
    
    // Save content if provided
    if (content) {
      console.log("Saving whiteboard content");
      try {
        const result = await contentsCollection.updateOne(
          { whiteboardId },
          { $set: { content, owner: userId, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        console.log("Content save result:", result);
      } catch (contentError) {
        console.error("Error saving content:", contentError);
        // Continue even if content save fails
      }
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
      body: JSON.stringify({ 
        error: 'Error saving whiteboard',
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