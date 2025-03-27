# Online Whiteboard

A collaborative drawing tool with Google authentication and cloud storage. Create, edit, and share whiteboards with friends and colleagues in real-time.

## Features

- Advanced drawing tools with support for various shapes and text
- Object selection, editing, and manipulation with glow highlighting
- Multiple pages with Jamboard-like navigation
- Google login and cloud storage for saving your work
- Real-time collaboration capabilities
- Responsive design that works on desktop and tablets
- Image upload and manipulation support
- Dark/light mode toggle

## Drawing Tools

- **Pen Tool**: Freehand drawing with adjustable thickness and color
- **Shape Tools**:
  - Rectangle: Create rectangles with fill or outline options
  - Circle: Draw circles with customizable properties
  - Line: Draw straight lines with adjustable thickness
- **Text Tool**: Add text with customizable font and color
- **Selection Tool**: Select objects by left-clicking or right-clicking anywhere
  - Drag to move selected objects
  - Manipulate individual or multiple objects
  - Delete selected objects with Delete or Backspace key
- **Eraser Tool**: Remove drawn objects with adjustable eraser size
- **Image Tool**: Upload and place images on your whiteboard

## Advanced Features

- **Selection Highlighting**: Objects are highlighted with a glow effect that follows their exact contours
- **Multi-select**: Hold Shift while selecting to add to your current selection
- **Right-click Selection**: Use right-click to select objects regardless of current tool
- **Object Movement**: Drag selected objects to reposition them
- **Eraser Visual Trail**: See where your eraser will affect the canvas
- **Toolbar Panels**: Tool options appear when hovering over toolbar icons

## Usage

Visit [whiteboardly.netlify.app](https://whiteboardly.netlify.app) to use the whiteboard.

### Keyboard Shortcuts
- Pen (P): Activate the pen tool
- Eraser (E): Activate the eraser tool
- Rectangle (R): Activate the rectangle tool
- Circle (C): Activate the circle tool
- Line (L): Activate the line tool
- Text (T): Activate the text tool
- Select (S): Activate the selection tool
- Delete/Backspace: Delete selected objects

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