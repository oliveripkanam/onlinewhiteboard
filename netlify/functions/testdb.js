// Simple function to test MongoDB connectivity
const { MongoClient } = require('mongodb');

exports.handler = async function(event) {
  console.log("TestDB function started");
  
  // Get the MongoDB URI from environment variables
  const MONGODB_URI = process.env.MONGODB_URI;
  
  // Log masked URI to debug connection string issues
  const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log("MongoDB URI format:", maskedUri);
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  let client = null;
  try {
    console.log("Creating MongoDB client...");
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    
    // Get list of databases
    console.log("Listing databases...");
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();
    console.log("Databases:", JSON.stringify(dbList.databases.map(db => db.name)));
    
    // Try to access our specific database
    const db = client.db('whiteboardly');
    console.log("Accessing whiteboardly database...");
    
    // List collections in our database
    const collections = await db.listCollections().toArray();
    console.log("Collections:", JSON.stringify(collections.map(coll => coll.name)));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Successfully connected to MongoDB",
        databases: dbList.databases.map(db => db.name),
        collections: collections.map(coll => coll.name)
      })
    };
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.errInfo) console.error("Error info:", error.errInfo);
    
    // Try parsing the connection string to identify issues
    let uriIssue = "Unknown";
    try {
      // Check for basic URI structure (don't log sensitive parts)
      const uriParts = MONGODB_URI.split('@');
      if (uriParts.length !== 2) {
        uriIssue = "URI format is invalid - missing @ symbol separator";
      } else {
        const hostPart = uriParts[1];
        // Check if database name is specified
        if (!hostPart.includes('/')) {
          uriIssue = "No database name specified in URI";
        } else if (!hostPart.includes('?')) {
          uriIssue = "No query parameters in URI";
        } else {
          uriIssue = "URI structure seems valid, credentials may be incorrect";
        }
      }
    } catch (parseError) {
      uriIssue = "Error parsing URI: " + parseError.message;
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        name: error.name,
        code: error.code,
        uriAnalysis: uriIssue
      })
    };
  } finally {
    if (client) {
      try {
        console.log("Closing MongoDB connection...");
        await client.close();
        console.log("MongoDB connection closed");
      } catch (closeError) {
        console.error("Error closing connection:", closeError);
      }
    }
  }
}; 