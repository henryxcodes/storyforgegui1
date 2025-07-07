import { VercelRequest, VercelResponse } from '@vercel/node';
import { appendStoryChunk } from '../stories';

/**
 * Dedicated endpoint for appending story chunks
 * This creates a proper /api/stories/append endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return appendStoryChunk(req, res);
}