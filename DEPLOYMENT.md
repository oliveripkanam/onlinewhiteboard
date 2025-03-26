# Deploying Whiteboardly to Netlify

This guide will walk you through deploying your Whiteboardly application to Netlify with MongoDB Atlas integration.

## Prerequisites

- A GitHub repository with your Whiteboardly code
- MongoDB Atlas account with a cluster created
- Google OAuth credentials

## Step 1: Push Your Code to GitHub

Make sure your code is in a GitHub repository.

## Step 2: Connect to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click "New site from Git"
3. Select GitHub as your Git provider
4. Authorize Netlify to access your GitHub account
5. Select your Whiteboardly repository
6. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.`

## Step 3: Configure Environment Variables

In your Netlify site dashboard:

1. Go to Site settings > Environment variables
2. Add the following variables:
   - `MONGODB_URI`: `mongodb+srv://nickgurr0812:Mymongodb2004%21@whiteboardly.e0tnc9c.mongodb.net/?retryWrites=true&w=majority&appName=Whiteboardly`
   - `GOOGLE_CLIENT_ID`: `73818709117-rsd8h42cbu2obm6t2rbo9f8jc0ojdl8c.apps.googleusercontent.com`

## Step 4: Deploy

1. Click "Deploy site"
2. Wait for the deployment to complete

## Step 5: Configure Google OAuth Redirect

1. Go back to Google Cloud Console
2. Add your Netlify domain (e.g., `https://whiteboardly.netlify.app`) to the authorized JavaScript origins

## Testing Your Deployment

1. Visit your Netlify site URL
2. Sign in with Google
3. Create and save whiteboards
4. Verify that data is being stored in MongoDB Atlas

## Troubleshooting

If you encounter issues:

1. Check Netlify Function logs in the Netlify dashboard
2. Verify your MongoDB connection string
3. Make sure your Google OAuth client ID is correct
4. Check that your MongoDB Network Access allows connections from Netlify's IPs (you might need to allow access from 0.0.0.0/0 during testing)

## Local Development

For local development:

1. Create a `.env` file in your project root with your environment variables
2. Run `netlify dev` to test locally with Netlify Functions 