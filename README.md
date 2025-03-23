# Online Whiteboard

A simple online whiteboard application for tutoring, brainstorming, and collaboration. Built with TypeScript.

## Features

- Drawing tools:
  - Pen tool with adjustable thickness
  - Eraser tool
  - Shape tools (rectangle, circle, line)
  - Text tool for adding annotations
- Multiple color options
- Undo/Redo functionality with keyboard shortcuts (Ctrl+Z, Ctrl+X)
- Save whiteboard as PNG image (Ctrl+S)
- Dark/light theme toggle
- Zoom and pan capabilities
- Responsive design for desktop and mobile
- Touch support for mobile devices
- Written in TypeScript for better type safety

## How to Use

1. **Drawing Tools**:
   - **Pen**: Click the pen button to draw freehand
   - **Eraser**: Click the eraser button to erase parts of your drawing
   - **Rectangle**: Draw rectangles by clicking and dragging
   - **Circle**: Draw circles by clicking and dragging (radius determined by drag distance)
   - **Line**: Draw straight lines by clicking and dragging
   - **Text**: Add text annotations by clicking where you want to place text, then type

2. **Colors**: Click on a color circle to change the drawing color

3. **Thickness**: Adjust the slider to change the pen/eraser/shape thickness

4. **Undo/Redo**: Use the buttons or keyboard shortcuts (Ctrl+Z for undo, Ctrl+X for redo)

5. **Clear All**: Click the clear button to erase the entire whiteboard

6. **Save**: Click the save button or use Ctrl+S to save your whiteboard as a PNG image

7. **Dark Mode**: Toggle between light and dark themes with the theme switch button

8. **Zoom & Pan**: 
   - Use mouse wheel to zoom in/out
   - On touch devices, use two fingers to pan around

## Live Demo

Visit [Online Whiteboard](https://your-netlify-url.netlify.app) to try it out!

## Local Development

To run the whiteboard locally:

1. Clone the repository:
```
git clone https://github.com/oliveripkanam/onlinewhiteboard.git
```

2. Open the project folder:
```
cd onlinewhiteboard
```

3. Install dependencies:
```
npm install
```

4. Build the TypeScript code:
```
npm run build
```

5. Start the development server:
```
npm start
```

You can also use `npm run watch` to automatically rebuild the TypeScript code when changes are made.

## Deployment

This project is ready to be deployed on Netlify or any static site hosting service.

## License

MIT 