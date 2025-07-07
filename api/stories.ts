import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv as vercelKV } from '@vercel/kv';
import { localKV } from './localKV';
import { v4 as uuidv4 } from 'uuid';

// Use local KV in development, Vercel KV in production
const kv = process.env.NODE_ENV === 'production' ? vercelKV : localKV;

// Type definitions
interface StoryData {
  id: string;
  content: string;
  timestamp: number;
  expiresAt: number;
}

// Constants
const EXPIRATION_HOURS = 48;
const EXPIRATION_SECONDS = EXPIRATION_HOURS * 60 * 60;

/**
 * Save a story with 48-hour expiration
 */
export async function saveStory(req: VercelRequest, res: VercelResponse) {
  try {
    // Validate request
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Story content is required' });
    }

    // Generate a unique ID for the story
    const storyId = uuidv4();
    const now = Date.now();

    // Create story data with expiration
    const storyData: StoryData = {
      id: storyId,
      content,
      timestamp: now,
      expiresAt: now + (EXPIRATION_HOURS * 60 * 60 * 1000)
    };

    // Save to KV storage with expiration
    await kv.set(`story:${storyId}`, JSON.stringify(storyData), { ex: EXPIRATION_SECONDS });

    // Return success with story ID and expiration info
    return res.status(200).json({
      success: true,
      storyId,
      message: `Story saved successfully. It will expire in ${EXPIRATION_HOURS} hours.`,
      expiresAt: storyData.expiresAt
    });
  } catch (error) {
    console.error('Error saving story:', error);
    return res.status(500).json({ 
      error: 'Failed to save story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get a story by ID
 */
export async function getStory(req: VercelRequest, res: VercelResponse) {
  try {
    // Validate request
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Story ID is required' });
    }

    // Get story from KV storage
    const storyData = await kv.get(`story:${id}`);

    if (!storyData) {
      return res.status(404).json({ error: 'Story not found or expired' });
    }

    // Return the story data
    return res.status(200).json({
      success: true,
      story: storyData
    });
  } catch (error) {
    console.error('Error retrieving story:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Delete a story by ID
 */
export async function deleteStory(req: VercelRequest, res: VercelResponse) {
  try {
    // Validate request
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Story ID is required' });
    }

    // Delete story from KV storage
    await kv.del(`story:${id}`);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    return res.status(500).json({ 
      error: 'Failed to delete story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Append chunk to existing story (for chunking large stories)
 */
export async function appendStoryChunk(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { storyId, content, chunkIndex, isLastChunk } = req.body;

    if (!storyId || !content || chunkIndex === undefined) {
      return res.status(400).json({ error: 'Story ID, content, and chunk index are required' });
    }

    // Get existing story
    const existingStoryData = await kv.get(`story:${storyId}`);
    if (!existingStoryData) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const storyData = typeof existingStoryData === 'string' ? 
      JSON.parse(existingStoryData) : existingStoryData;

    // Append content to existing story
    storyData.content += content;
    storyData.timestamp = Date.now();

    // Update story in KV storage
    await kv.set(`story:${storyId}`, JSON.stringify(storyData), { ex: EXPIRATION_SECONDS });

    return res.status(200).json({
      success: true,
      message: `Chunk ${chunkIndex} appended successfully${isLastChunk ? ' (final chunk)' : ''}`,
      storyId
    });
  } catch (error) {
    console.error('Error appending story chunk:', error);
    return res.status(500).json({ 
      error: 'Failed to append story chunk',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Default handler to route to appropriate function based on HTTP method
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle /api/stories/append endpoint
  if (req.url?.endsWith('/append')) {
    return appendStoryChunk(req, res);
  }

  switch (req.method) {
    case 'POST':
      return saveStory(req, res);
    case 'GET':
      return getStory(req, res);
    case 'DELETE':
      return deleteStory(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
