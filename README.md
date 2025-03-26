# Online Whiteboard

A collaborative drawing tool with Google authentication and cloud storage.

## Features

- Draw with pen, shapes, text, and more
- Multiple pages with Jamboard-like navigation
- Dark/light mode
- Google login and cloud storage
- Real-time collaboration

## Usage

Visit [whiteboardly.netlify.app](https://whiteboardly.netlify.app) to use the whiteboard.

### Drawing Tools
- Pen (P): Free drawing
- Eraser (E): Remove content
- Rectangle (R): Draw rectangles
- Circle (C): Draw circles
- Line (L): Draw straight lines
- Text (T): Add text
- Select (S): Select and move objects

### Page Navigation
- Use the slide thumbnails at the bottom to switch between pages
- Click "+ New Slide" to add a new page

### Saving Your Work
- Sign in with Google to save your whiteboards
- Create multiple whiteboards from the dashboard
- Your work is automatically saved

## Development

For local development:
```
npm install
npm run dev
```

For Google authentication to work locally, add `http://localhost:8888` to your Google OAuth origins.

## Google Authentication in Local Development

When developing locally, you need to set up Google OAuth properly:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) 
2. Navigate to APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Find your client ID and click "Edit"
4. Add these authorized JavaScript origins:
   - `http://localhost:8888`
   - `http://localhost:3000`
   - Any other local ports you plan to use

If you don't add these origins, you'll see error messages like:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

## Netlify Functions in Local Development

The application is set up to work with MongoDB via Netlify functions when deployed. For local development:

1. Without Netlify CLI: The app automatically falls back to localStorage
2. With Netlify CLI:
   - Install: `npm install -g netlify-cli`
   - Run: `netlify dev`
   - Set up `.env` file with your MongoDB connection string

## Environment Variables

Create a `.env` file with:
```
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
```

## Deployment

This project is ready to be deployed on Netlify or any static site hosting service.

## License

MIT 