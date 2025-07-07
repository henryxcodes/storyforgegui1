import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Setup for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory storage for testing
const storyStorage = new Map();

// Create Express app
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// API endpoints for story storage
app.post('/api/stories', (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Story content is required' });
    }
    
    // Generate ID and create story data
    const storyId = uuidv4();
    const now = Date.now();
    const expiresAt = now + (48 * 60 * 60 * 1000); // 48 hours
    
    const storyData = {
      id: storyId,
      content,
      timestamp: now,
      expiresAt
    };
    
    // Save to in-memory storage
    storyStorage.set(storyId, storyData);
    
    // Also save to file for persistence
    const storyFile = path.join(storageDir, `${storyId}.json`);
    fs.writeFileSync(storyFile, JSON.stringify(storyData));
    
    console.log(`Story saved with ID: ${storyId}`);
    
    return res.status(200).json({
      success: true,
      storyId,
      message: `Story saved successfully. It will expire in 48 hours.`,
      expiresAt
    });
  } catch (error) {
    console.error('Error saving story:', error);
    return res.status(500).json({ error: 'Failed to save story' });
  }
});

app.get('/api/stories', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Story ID is required' });
    }
    
    // Try to get from in-memory storage first
    let storyData = storyStorage.get(id);
    
    // If not in memory, try to load from file
    if (!storyData) {
      const storyFile = path.join(storageDir, `${id}.json`);
      if (fs.existsSync(storyFile)) {
        const fileData = fs.readFileSync(storyFile, 'utf8');
        storyData = JSON.parse(fileData);
        
        // Add back to memory cache
        storyStorage.set(id, storyData);
      }
    }
    
    if (!storyData) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Check if expired
    if (storyData.expiresAt < Date.now()) {
      // Remove expired story
      storyStorage.delete(id);
      const storyFile = path.join(storageDir, `${id}.json`);
      if (fs.existsSync(storyFile)) {
        fs.unlinkSync(storyFile);
      }
      return res.status(404).json({ error: 'Story has expired' });
    }
    
    return res.status(200).json({
      success: true,
      story: storyData
    });
  } catch (error) {
    console.error('Error retrieving story:', error);
    return res.status(500).json({ error: 'Failed to retrieve story' });
  }
});

app.delete('/api/stories', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Story ID is required' });
    }
    
    // Remove from in-memory storage
    storyStorage.delete(id);
    
    // Remove file if exists
    const storyFile = path.join(storageDir, `${id}.json`);
    if (fs.existsSync(storyFile)) {
      fs.unlinkSync(storyFile);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    return res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Cleanup endpoint
app.get('/api/cleanup', (req, res) => {
  try {
    let deletedCount = 0;
    const now = Date.now();
    
    // Check in-memory storage
    for (const [id, story] of storyStorage.entries()) {
      if (story.expiresAt < now) {
        storyStorage.delete(id);
        
        // Also delete file
        const storyFile = path.join(storageDir, `${id}.json`);
        if (fs.existsSync(storyFile)) {
          fs.unlinkSync(storyFile);
        }
        
        deletedCount++;
      }
    }
    
    // Also check files that might not be in memory
    const files = fs.readdirSync(storageDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const storyFile = path.join(storageDir, file);
        try {
          const fileData = fs.readFileSync(storyFile, 'utf8');
          const storyData = JSON.parse(fileData);
          
          if (storyData.expiresAt < now) {
            fs.unlinkSync(storyFile);
            deletedCount++;
          }
        } catch (err) {
          // If file is corrupted, delete it
          fs.unlinkSync(storyFile);
          deletedCount++;
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} expired stories.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return res.status(500).json({ error: 'Failed to complete cleanup' });
  }
});

// Mock story generation endpoints
app.post('/expand-story', (req, res) => {
  try {
    const { story_prompt } = req.body;
    
    if (!story_prompt) {
      return res.status(400).json({ error: 'Story prompt is required' });
    }
    
    console.log('Received story generation request with prompt:', story_prompt);
    
    // Mock response - in a real scenario this would call Claude API
    setTimeout(() => {
      const mockStory = `This is a mock story generated from your prompt: "${story_prompt}".\n\nOnce upon a time in a land far away, there was a kingdom filled with wonder and magic. The people lived in harmony with nature, and the rulers were just and fair.\n\nOne day, a mysterious traveler arrived with tales of distant lands and incredible adventures. The kingdom was forever changed by the knowledge this traveler brought.\n\nThe End.`;
      
      res.status(200).json({
        success: true,
        expanded_story: mockStory,
        message: 'Story generated successfully (mock data)'
      });
    }, 1500); // Simulate API delay
    
  } catch (error) {
    console.error('Error in mock story generation:', error);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

// Legacy endpoint for compatibility
app.post('/generate-story-only', (req, res) => {
  try {
    const { story_prompt } = req.body;
    
    if (!story_prompt) {
      return res.status(400).json({ error: 'Story prompt is required' });
    }
    
    console.log('Received story generation request with prompt:', story_prompt);
    
    // Mock response - in a real scenario this would call Claude API
    setTimeout(() => {
      const mockStory = `This is a mock story generated from your prompt: "${story_prompt}".\n\nOnce upon a time in a land far away, there was a kingdom filled with wonder and magic. The people lived in harmony with nature, and the rulers were just and fair.\n\nOne day, a mysterious traveler arrived with tales of distant lands and incredible adventures. The kingdom was forever changed by the knowledge this traveler brought.\n\nThe End.`;
      
      res.status(200).json({
        success: true,
        story: mockStory,
        message: 'Story generated successfully (mock data)'
      });
    }, 1500); // Simulate API delay
    
  } catch (error) {
    console.error('Error in mock story generation:', error);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

// Mock voiceover generation endpoints
app.post('/generate-elevenlabs-binary', (req, res) => {
  try {
    console.log('Received ElevenLabs voiceover request');
    res.status(200).json({
      success: true,
      message: 'This is a mock response. In production, this would return audio data.'
    });
  } catch (error) {
    console.error('Error in mock voiceover generation:', error);
    res.status(500).json({ error: 'Failed to generate voiceover' });
  }
});

app.post('/generate-fish-binary', (req, res) => {
  try {
    console.log('Received Fish audio voiceover request');
    res.status(200).json({
      success: true,
      message: 'This is a mock response. In production, this would return audio data.'
    });
  } catch (error) {
    console.error('Error in mock voiceover generation:', error);
    res.status(500).json({ error: 'Failed to generate voiceover' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}`);
  console.log(`📂 Storage directory: ${storageDir}`);
  console.log('Mock endpoints available:');
  console.log('  - POST /generate-story-only (mock story generation)');
  console.log('  - POST /generate-elevenlabs-binary (mock voiceover)');
  console.log('  - POST /generate-fish-binary (mock voiceover)');
  console.log('  - POST /api/stories (story storage)');
  console.log('  - GET /api/stories?id=<storyId> (story retrieval)');
  console.log('  - DELETE /api/stories?id=<storyId> (story deletion)');
  console.log('  - GET /api/cleanup (cleanup expired stories)');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});
