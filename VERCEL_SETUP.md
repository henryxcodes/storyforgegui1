# Setting Up StoryForgeGUI with Vercel KV for Auto-Deletion

This guide explains how to deploy StoryForgeGUI to Vercel with the auto-deletion feature that removes stories after 48 hours.

## Prerequisites

- A [Vercel](https://vercel.com) account
- [Vercel CLI](https://vercel.com/docs/cli) installed (optional, but recommended)
- Node.js and npm installed

## Step 1: Install Dependencies

First, install the required dependencies:

```bash
npm install
```

## Step 2: Set Up Vercel KV Storage

The auto-deletion feature uses Vercel KV (based on Redis) to store stories with an expiration time.

1. Log in to your Vercel account
2. Create a new project or select your existing StoryForgeGUI project
3. Go to the "Storage" tab
4. Click "Create" and select "KV Database"
5. Follow the prompts to create a new KV database
6. Once created, Vercel will provide connection details

## Step 3: Configure Environment Variables

Create a `.env` file in your project root (or configure via Vercel dashboard):

```
# API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
FISH_API_KEY=your_fish_api_key

# Vercel KV
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token

# Security
CLEANUP_API_KEY=your_custom_secure_key_for_cleanup_endpoint
```

## Step 4: Deploy to Vercel

Deploy your application to Vercel:

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Step 5: Set Up Automatic Cleanup

To ensure stories are properly cleaned up, set up a scheduled job to call the cleanup endpoint:

1. Go to your Vercel project settings
2. Navigate to "Integrations"
3. Install the "Cron Jobs" integration
4. Create a new cron job with the following settings:
   - Name: "Story Cleanup"
   - URL: `https://your-domain.vercel.app/api/cleanup?key=your_cleanup_api_key`
   - Schedule: `0 */6 * * *` (runs every 6 hours)

## How It Works

### Story Storage and Auto-Deletion

1. **When a story is saved:**
   - The story is saved to Vercel KV with a 48-hour expiration time
   - A local copy is also saved in the browser's localStorage as a backup

2. **When the app loads:**
   - It first tries to load the story from Vercel KV
   - If that fails, it falls back to the localStorage copy
   - Stories that have expired are automatically removed

3. **Scheduled cleanup:**
   - The cleanup cron job runs every 6 hours
   - It checks for and removes any expired stories that weren't automatically cleaned up

### API Endpoints

- `POST /api/stories` - Save a story with 48-hour expiration
- `GET /api/stories?id=<storyId>` - Retrieve a story by ID
- `DELETE /api/stories?id=<storyId>` - Delete a story by ID
- `GET /api/cleanup` - Force cleanup of expired stories (protected by API key)

## Local Development

For local development, the app will use localStorage only, without attempting to connect to Vercel KV.

## Troubleshooting

If you encounter issues with the KV storage:

1. Check that your KV environment variables are correctly set
2. Verify that your Vercel KV database is properly provisioned
3. Check the browser console and Vercel logs for error messages

For any persistent issues, you can manually trigger the cleanup endpoint or restart the KV database from the Vercel dashboard.
