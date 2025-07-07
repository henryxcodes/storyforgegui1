import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv as vercelKV } from '@vercel/kv';
import { localKV } from './localKV';

// Use local KV in development, Vercel KV in production
const kv = process.env.NODE_ENV === 'production' ? vercelKV : localKV;

/**
 * Cleanup expired stories - can be triggered by a cron job
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // This endpoint should only be called with a GET request
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Check for API key if this is a production environment
    // This prevents unauthorized access to the cleanup endpoint
    const apiKey = req.headers['x-api-key'] || req.query.key;
    const expectedKey = process.env.CLEANUP_API_KEY;
    
    if (process.env.NODE_ENV === 'production' && (!apiKey || apiKey !== expectedKey)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get all story keys
    const keys = await kv.keys('story:*');
    let expiredCount = 0;
    
    // Process each story
    for (const key of keys) {
      try {
        // Get the story data
        const storyDataStr = await kv.get(key);
        
        if (storyDataStr) {
          const storyData = JSON.parse(String(storyDataStr));
          
          // Check if the story has expired
          if (storyData.expiresAt && storyData.expiresAt < Date.now()) {
            // Delete the expired story
            await kv.del(key);
            expiredCount++;
            console.log(`Deleted expired story: ${key}`);
          }
        }
      } catch (error) {
        console.error(`Error processing story ${key}:`, error);
        // Continue with other stories even if one fails
      }
    }
    
    // Return success with count of deleted stories
    return res.status(200).json({
      success: true,
      message: `Cleanup completed. Deleted ${expiredCount} expired stories.`,
      deletedCount: expiredCount,
      totalProcessed: keys.length
    });
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return res.status(500).json({ 
      error: 'Failed to complete cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
