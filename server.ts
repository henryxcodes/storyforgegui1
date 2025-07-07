import express, { Request, Response } from 'express';
import cors from 'cors';
import { expandStory, expandStoryWithCustomPrompt, getKnowledgeBaseStats } from './main.js';
import { generateVoiceover, VoiceoverResult } from './fish-audio.js';
import { generateElevenLabsVoiceover, VoiceoverResult as ElevenLabsResult } from './elevenlabs-audio.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Simple logger replacement
const logger = {
  logStorySave: (wordCount: number, isExpanded: boolean) => {
    console.log(`📝 Story saved: ${wordCount} words, expanded: ${isExpanded}`);
  }
};

// Story storage types
interface StoryData {
  id: string;
  content: string;
  timestamp: number;
  expiresAt: number;
}


// Default fallback API keys - users can provide their own dynamically
const DEFAULT_ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DEFAULT_ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const DEFAULT_FISH_API_KEY = process.env.FISH_API_KEY || '';

// Helper function to get API keys from request or fallback to defaults
function getApiKeys(req: any) {
  const keys = {
    anthropic: req.body.anthropic_api_key || DEFAULT_ANTHROPIC_API_KEY,
    elevenlabs: req.body.elevenlabs_api_key || DEFAULT_ELEVENLABS_API_KEY,
    fish: req.body.fish_api_key || DEFAULT_FISH_API_KEY
  };
  
  // Log API key confirmations when user keys are detected
  const userKeys = {
    anthropic: !!req.body.anthropic_api_key,
    elevenlabs: !!req.body.elevenlabs_api_key,
    fish: !!req.body.fish_api_key
  };
  
  if (userKeys.anthropic || userKeys.elevenlabs || userKeys.fish) {
    console.log('🔑 API Key Confirmations:');
    if (userKeys.anthropic) {
      console.log('   ✅ Anthropic API key received and confirmed');
    }
    if (userKeys.elevenlabs) {
      console.log('   ✅ ElevenLabs API key received and confirmed');
    }
    if (userKeys.fish) {
      console.log('   ✅ Fish Audio API key received and confirmed');
    }
    
    // Log any fallback usage
    if (!userKeys.anthropic) {
      console.log('   🔄 Using fallback Anthropic API key');
    }
    if (!userKeys.elevenlabs) {
      console.log('   🔄 Using fallback ElevenLabs API key');
    }
    if (!userKeys.fish) {
      console.log('   🔄 Using fallback Fish Audio API key');
    }
  }
  
  return keys;
}

// Startup diagnostics
console.log('🚀 Starting Claude Longform Generator...');
console.log(`📂 Working directory: ${process.cwd()}`);
console.log(`🐧 Platform: ${process.platform}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🗂️  Files in working directory:`);
try {
  const files = fs.readdirSync(process.cwd());
  console.log(files.slice(0, 10).join(', '));
} catch (err) {
  console.error('❌ Error reading directory:', err);
}

// API key status - now supports dynamic keys
console.log('🔑 API Key System:');
console.log(`   📡 Listening for Anthropic API keys (fallback available)`);
console.log(`   📡 Listening for ElevenLabs API keys (fallback available)`);
console.log(`   📡 Listening for Fish Audio API keys (fallback available)`);
console.log(`   🔄 Dynamic key system enabled`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

console.log(`🔌 Server will bind to port: ${PORT}`);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve static files from public directory for audio downloads (legacy support)
app.use('/files', express.static(path.join(process.cwd(), 'public')));

// Create storage directory if it doesn't exist
const storageDir = path.join(process.cwd(), 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  console.log(`Created storage directory at ${storageDir}`);
}

// In-memory cache for stories
const storyCache = new Map<string, StoryData>();

// Constants
const EXPIRATION_HOURS = 48;
const EXPIRATION_MS = EXPIRATION_HOURS * 60 * 60 * 1000;

// Story storage API endpoints
// Main endpoint for creating new stories or saving complete stories
app.post('/api/stories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    
    if (!content) {
      res.status(400).json({ error: 'Story content is required' });
      return;
    }
    
    // Generate a unique ID for the story
    const storyId = uuidv4();
    const now = Date.now();
    const expiresAt = now + EXPIRATION_MS;
    
    // Create story data
    const storyData: StoryData = {
      id: storyId,
      content,
      timestamp: now,
      expiresAt
    };
    
    // Save to in-memory cache
    storyCache.set(storyId, storyData);
    
    // Save to file for persistence
    const storyFile = path.join(storageDir, `${storyId}.json`);
    fs.writeFileSync(storyFile, JSON.stringify(storyData));
    
    // Log the story save
    const wordCount = content.split(/\s+/).length;
    logger.logStorySave(wordCount, false);
    
    console.log(`Story saved with ID: ${storyId}`);
    
    res.status(200).json({
      success: true,
      storyId,
      message: `Story saved successfully. It will expire in ${EXPIRATION_HOURS} hours.`,
      expiresAt
    });
  } catch (error) {
    console.error('Error saving story:', error);
    res.status(500).json({ 
      error: 'Failed to save story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/stories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Story ID is required' });
      return;
    }
    
    // Try to get from in-memory cache first
    let storyData = storyCache.get(id);
    
    // If not in memory, try to load from file
    if (!storyData) {
      const storyFile = path.join(storageDir, `${id}.json`);
      if (fs.existsSync(storyFile)) {
        const fileData = fs.readFileSync(storyFile, 'utf8');
        const parsedData = JSON.parse(fileData) as StoryData;
        storyData = parsedData;
        
        // Add back to memory cache
        storyCache.set(id, storyData);
      }
    }
    
    if (!storyData) {
      res.status(404).json({ error: 'Story not found' });
      return;
    }
    
    // Check if expired
    if (storyData.expiresAt < Date.now()) {
      // Remove expired story
      storyCache.delete(id);
      const storyFile = path.join(storageDir, `${id}.json`);
      if (fs.existsSync(storyFile)) {
        fs.unlinkSync(storyFile);
      }
      res.status(404).json({ error: 'Story has expired' });
      return;
    }
    
    res.status(200).json({
      success: true,
      story: storyData
    });
  } catch (error) {
    console.error('Error retrieving story:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.delete('/api/stories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Story ID is required' });
      return;
    }
    
    // Remove from in-memory cache
    storyCache.delete(id);
    
    // Remove file if exists
    const storyFile = path.join(storageDir, `${id}.json`);
    if (fs.existsSync(storyFile)) {
      fs.unlinkSync(storyFile);
    }
    
    res.status(200).json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ 
      error: 'Failed to delete story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint for appending chunks to an existing story
app.post('/api/stories/append', async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, storyId, chunkIndex, isLastChunk } = req.body;
    
    if (!content || !storyId) {
      res.status(400).json({ error: 'Story content and storyId are required' });
      return;
    }
    
    // Try to get the existing story
    let storyData = storyCache.get(storyId);
    
    // If not in memory, try to load from file
    if (!storyData) {
      const storyFile = path.join(storageDir, `${storyId}.json`);
      if (fs.existsSync(storyFile)) {
        const fileData = fs.readFileSync(storyFile, 'utf8');
        storyData = JSON.parse(fileData) as StoryData;
        
        // Add back to memory cache
        storyCache.set(storyId, storyData);
      } else {
        res.status(404).json({ error: 'Story not found' });
        return;
      }
    }
    
    // Append the new content to the existing story
    storyData.content += content;
    
    // Update in-memory cache
    storyCache.set(storyId, storyData);
    
    // Save to file for persistence
    const storyFile = path.join(storageDir, `${storyId}.json`);
    fs.writeFileSync(storyFile, JSON.stringify(storyData));
    
    console.log(`Chunk ${chunkIndex || 'unknown'} appended to story ID: ${storyId}`);
    
    res.status(200).json({
      success: true,
      storyId,
      message: `Chunk ${chunkIndex || 'unknown'} appended successfully.`,
      isComplete: isLastChunk === true
    });
  } catch (error) {
    console.error('Error appending to story:', error);
    res.status(500).json({ 
      error: 'Failed to append to story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup endpoint for expired stories
app.get('/api/cleanup', async (req: Request, res: Response): Promise<void> => {
  try {
    let deletedCount = 0;
    const now = Date.now();
    
    // Check in-memory cache
    for (const [id, story] of storyCache.entries()) {
      if (story.expiresAt < now) {
        storyCache.delete(id);
        
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
    
    res.status(200).json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} expired stories.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error in cleanup process:', error);
    res.status(500).json({ 
      error: 'Failed to complete cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Removed duplicate API endpoints

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// GUI Interface - serve index.html at root
app.get('/', (req: Request, res: Response) => {
  // Check if request accepts HTML (browser request)
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  } else {
    // API health check for non-browser requests
    res.json({ 
      status: 'OK', 
      message: 'StoryForge GUI - Claude Story Expander API with RAG Knowledge Base and Dual Voiceover is running',
      gui_url: 'Open this URL in a browser to access the GUI interface',
      endpoints: {
        'POST /expand-story': 'Expand a story using Claude with RAG context',
        'POST /generate-story-only': 'Story generation only (n8n optimized)',
        'POST /generate-complete': 'Complete flow: Story + ElevenLabs + Fish Audio voiceovers (base64)',
        'POST /test-audio': 'Quick audio test (30 seconds) - returns BINARY audio file',
        'POST /generate-elevenlabs-binary': '🎯 ElevenLabs: Story + ElevenLabs MP3 (4k chars intro) - BINARY file (3 min)',
        'POST /generate-fish-binary': '🎯 Fish Audio: Story + Fish Audio MP3 (full story) - BINARY file (10 min)',
        'POST /generate-dual-binary': 'DEPRECATED: Use separate endpoints above for Telegram compatibility',
        'GET /knowledge-stats': 'Get knowledge base statistics'
      }
    });
  }
});

// API Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'StoryForge GUI - Claude Story Expander API with RAG Knowledge Base and Dual Voiceover is running',
    endpoints: {
      'POST /expand-story': 'Expand a story using Claude with RAG context',
      'POST /generate-story-only': 'Story generation only (n8n optimized)',
      'POST /generate-complete': 'Complete flow: Story + ElevenLabs + Fish Audio voiceovers (base64)',
      'POST /test-audio': 'Quick audio test (30 seconds) - returns BINARY audio file',
      'POST /generate-elevenlabs-binary': '🎯 ElevenLabs: Story + ElevenLabs MP3 (4k chars intro) - BINARY file (3 min)',
      'POST /generate-fish-binary': '🎯 Fish Audio: Story + Fish Audio MP3 (full story) - BINARY file (10 min)',
      'POST /generate-dual-binary': 'DEPRECATED: Use separate endpoints above for Telegram compatibility',
      'GET /knowledge-stats': 'Get knowledge base statistics'
    }
  });
});

// Knowledge base stats endpoint
app.get('/knowledge-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getKnowledgeBaseStats();
    
    if (!stats) {
      res.status(503).json({
        error: 'Knowledge base not available',
        message: 'The knowledge base could not be initialized'
      });
      return;
    }

    res.json({
      success: true,
      knowledge_base: stats,
      description: 'Statistics from the Data.txt knowledge base used for RAG context generation'
    });

  } catch (error) {
    console.error('Error getting knowledge base stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to get knowledge base statistics', 
      details: errorMessage 
    });
  }
});

// Story expansion endpoint
app.post('/expand-story', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt, api_key, custom_prompt } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

          // Log the generation request
      console.log(`📝 Story generation request: ${story_prompt.length} chars, custom prompt: ${!!custom_prompt}`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    let msg;
    if (custom_prompt) {
      // Use custom prompt for expansion
      msg = await expandStoryWithCustomPrompt(story_prompt, custom_prompt, apiKeys.anthropic);
    } else {
      // Use the default expansion function
      msg = await expandStory(story_prompt, apiKeys.anthropic);
    }

    // Extract text content from the response
    const textContent = msg.content.find(block => block.type === 'text');
    const expandedStory = textContent ? textContent.text : 'No text content found in response';

    // Log the successful generation
    logger.logStorySave(expandedStory.split(/\s+/).length, true);

    res.json({
      success: true,
      expanded_story: expandedStory,
      usage: msg.usage,
      model: msg.model
    });

  } catch (error) {
    console.error('Error expanding story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to expand story', 
      details: errorMessage 
    });
  }
});

// Complete generation endpoint - Story + Dual Voiceovers
app.post('/generate-complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      story_prompt, 
      api_key,
      elevenlabs_api_key,
      fish_api_key,
      elevenlabs_voice_id,
      remove_silence = true,
      elevenlabs_remove_silence = true
    } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

    console.log(`📥 Received complete generation request for: ${story_prompt.substring(0, 100)}...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Step 1: Generate story
    console.log('⚡ Generating story with Claude + RAG...');
    const storyResult = await expandStory(story_prompt, apiKeys.anthropic);
    const textContent = storyResult.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';

    console.log(`✅ Story generated: ${story.split(/\s+/).length.toLocaleString()} words`);

    // Step 2: Generate both voiceovers in parallel
    console.log('🎤 Starting dual voiceover generation...');
    
    const voiceoverPromises: Promise<any>[] = [];
    
    // ElevenLabs voiceover (first 4000 characters)
    console.log('🎵 Starting ElevenLabs voiceover...');
    voiceoverPromises.push(
      generateElevenLabsVoiceover(story, {
        apiKey: apiKeys.elevenlabs,
          voiceId: elevenlabs_voice_id || 'jpjWfzKyhJIgrlqr39h8',
          removeSilence: elevenlabs_remove_silence,
          silenceThreshold: -45,
          silenceLength: 45,
          outputPath: undefined // Will generate temp file
        }).then(result => ({ type: 'elevenlabs', result }))
        .catch(error => ({ type: 'elevenlabs', error: error.message }))
      );

    // Fish Audio voiceover (full story)
    console.log('🐠 Starting Fish Audio voiceover...');
    voiceoverPromises.push(
      generateVoiceover(story, {
        apiKey: apiKeys.fish,
        model: 's1',
        format: 'mp3',
        speed: 1.0,
        removeSilence: remove_silence,
        silenceThreshold: -45,
        silenceLength: 45,
        outputPath: undefined // Will generate temp file
      }).then(result => ({ type: 'fish', result }))
      .catch(error => ({ type: 'fish', error: error.message }))
    );

    // Wait for both voiceovers to complete
    const voiceoverResults = await Promise.all(voiceoverPromises);

    // Process results
    let elevenLabsResult: ElevenLabsResult | null = null;
    let fishAudioResult: VoiceoverResult | null = null;
    const errors: string[] = [];

    for (const result of voiceoverResults) {
      if (result.error) {
        errors.push(`${result.type}: ${result.error}`);
      } else {
        if (result.type === 'elevenlabs') {
          elevenLabsResult = result.result;
        } else if (result.type === 'fish') {
          fishAudioResult = result.result;
        }
      }
    }

    // Convert audio files to base64 for HTTP response
    const response: any = {
      success: true,
      story: {
        text: story,
        word_count: story.split(/\s+/).length,
        character_count: story.length
      },
      voiceovers: {},
      usage: storyResult.usage,
      model: storyResult.model
    };

    if (elevenLabsResult) {
      try {
        const elevenLabsData = fs.readFileSync(elevenLabsResult.audioPath);
        response.voiceovers.elevenlabs = {
          audio_base64: elevenLabsData.toString('base64'),
          file_size: elevenLabsResult.fileSize,
          duration: elevenLabsResult.duration,
          character_count: elevenLabsResult.characterCount,
          format: 'mp3'
        };
        // Clean up temp file
        fs.unlinkSync(elevenLabsResult.audioPath);
        console.log('✅ ElevenLabs voiceover completed and encoded');
      } catch (error) {
        errors.push(`ElevenLabs file processing: ${error}`);
      }
    }

    if (fishAudioResult) {
      try {
        const fishAudioData = fs.readFileSync(fishAudioResult.audioPath);
        response.voiceovers.fish_audio = {
          audio_base64: fishAudioData.toString('base64'),
          file_size: fishAudioResult.fileSize,
          duration: fishAudioResult.duration,
          format: fishAudioResult.format
        };
        // Clean up temp file
        fs.unlinkSync(fishAudioResult.audioPath);
        console.log('✅ Fish Audio voiceover completed and encoded');
      } catch (error) {
        errors.push(`Fish Audio file processing: ${error}`);
      }
    }

    if (errors.length > 0) {
      response.warnings = errors;
    }

    console.log('🎉 Complete generation finished successfully!');
    res.json(response);

  } catch (error) {
    console.error('Error in complete generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to complete generation', 
      details: errorMessage 
    });
  }
});

// Story-only endpoint optimized for n8n (no large audio files)
app.post('/generate-story-only', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt, api_key } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

    console.log(`📥 Received story-only request for: ${story_prompt.substring(0, 100)}...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Generate story
    console.log('⚡ Generating story with Claude Opus 4 + RAG...');
    const storyResult = await expandStory(story_prompt, apiKeys.anthropic);
    const textContent = storyResult.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';

    console.log(`✅ Story generated: ${story.split(/\s+/).length.toLocaleString()} words`);

    // Return just the story (no audio files for n8n compatibility)
    const response = {
      success: true,
      story: {
        text: story,
        word_count: story.split(/\s+/).length,
        character_count: story.length
      },
      usage: storyResult.usage,
      model: storyResult.model,
      note: "Use /generate-complete endpoint for audio files"
    };

    console.log('🎉 Story-only generation finished successfully!');
    res.json(response);

  } catch (error) {
    console.error('Error in story-only generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate story', 
      details: errorMessage 
    });
  }
});

// Quick test endpoint - story only (fast for testing)
app.post('/test-story', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt, api_key } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

    console.log(`📥 Test story request: ${story_prompt.substring(0, 50)}...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Generate story only (no audio for speed)  
    const storyResult = await expandStory(story_prompt, apiKeys.anthropic);
    const textContent = storyResult.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';

    res.json({
      success: true,
      story: {
        text: story,
        word_count: story.split(/\s+/).length,
        character_count: story.length
      },
      usage: storyResult.usage,
      model: storyResult.model,
      processing_time: "Story only - no audio generated"
    });

  } catch (error) {
    console.error('Error in test story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate test story', 
      details: errorMessage 
    });
  }
});

// Quick audio test endpoint - returns BINARY audio file for n8n (30 seconds max)
app.post('/test-audio', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt, test_text } = req.body;
    
    // Use story_prompt if provided, otherwise fall back to test_text or default
    const textToSpeak = story_prompt || test_text || "Hello world! This is a quick audio test for n8n integration.";

    console.log(`🧪 Audio test request: ${textToSpeak.substring(0, 100)}...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Use ElevenLabs for quick test (under 30 seconds)
    console.log('🎤 Generating test audio with ElevenLabs...');
    const audioResult = await generateElevenLabsVoiceover(textToSpeak, {
      apiKey: apiKeys.elevenlabs,
      voiceId: 'jpjWfzKyhJIgrlqr39h8', // Your preferred voice
      removeSilence: true,
      silenceThreshold: -45,
      silenceLength: 45,
      outputPath: undefined // Will generate temp file
    });

    // Read binary audio data
    const audioData = fs.readFileSync(audioResult.audioPath);

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `test_audio_${timestamp}.mp3`;

    // Set headers for binary audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('X-Audio-Duration', audioResult.duration || '4s');
    res.setHeader('X-Audio-Size', audioResult.fileSize || '0.02 MB');
    res.setHeader('X-Voice-ID', 'jpjWfzKyhJIgrlqr39h8');

    console.log('✅ Test audio generated successfully - returning binary data');

    // Send binary audio data
    res.send(audioData);

    // Clean up temp file
    fs.unlinkSync(audioResult.audioPath);

  } catch (error) {
    console.error('Error in audio test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate test audio', 
      details: errorMessage 
    });
  }
});

// Binary audio endpoints for full generation
app.post('/generate-elevenlabs-binary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt, elevenlabs_voice_id } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

    console.log(`📥 ElevenLabs binary generation (intro/hook) for: ${story_prompt.substring(0, 100)}...`);
    console.log('⚡ Generating story with Claude + RAG...');

    // Log the request
    logger.logStorySave(story_prompt.length, false);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Generate story
    const storyResult = await expandStory(story_prompt, apiKeys.anthropic);
    const textContent = storyResult.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';

    console.log(`✅ Story generated: ${story.split(/\s+/).length.toLocaleString()} words`);

    // Generate ElevenLabs audio with retry logic (first 4000 characters)
    console.log('🎵 Generating ElevenLabs voiceover with retry logic...');
    const maxRetries = 3;
    let elevenLabsRetryCount = 0;
    let audioResult: any = null;
    
    while (elevenLabsRetryCount < maxRetries && !audioResult) {
      try {
        if (elevenLabsRetryCount > 0) {
          const delay = Math.pow(2, elevenLabsRetryCount) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay/1000}s before ElevenLabs retry ${elevenLabsRetryCount + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`🎵 ElevenLabs attempt ${elevenLabsRetryCount + 1}/${maxRetries}...`);
        audioResult = await generateElevenLabsVoiceover(story, {
          apiKey: apiKeys.elevenlabs,
          voiceId: elevenlabs_voice_id || 'jpjWfzKyhJIgrlqr39h8',
          removeSilence: true,
          silenceThreshold: -45,
          silenceLength: 45,
          outputPath: undefined
        });
        console.log('✅ ElevenLabs voiceover completed successfully');
        
        // Log successful audio generation
        logger.logStorySave(audioResult.duration, true);
        
        break;
      } catch (error: any) {
        elevenLabsRetryCount++;
        console.warn(`⚠️  ElevenLabs attempt ${elevenLabsRetryCount} failed: ${error.message}`);
        
        if (elevenLabsRetryCount >= maxRetries) {
          throw new Error(`ElevenLabs failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }

    // Read binary audio data
    const audioData = fs.readFileSync(audioResult.audioPath);

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `elevenlabs_${timestamp}.mp3`;

    // Set headers for binary audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('X-Audio-Duration', audioResult.duration || 'unknown');
    res.setHeader('X-Audio-Size', audioResult.fileSize || 'unknown');
    res.setHeader('X-Story-Words', story.split(/\s+/).length.toString());

    console.log('✅ ElevenLabs binary generation complete');

    // Send binary audio data
    res.send(audioData);

    // Clean up temp file
    fs.unlinkSync(audioResult.audioPath);

  } catch (error) {
    console.error('Error in ElevenLabs binary generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate ElevenLabs audio', 
      details: errorMessage 
    });
  }
});

app.post('/generate-fish-binary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

    console.log(`📥 Fish Audio binary generation (full story) for: ${story_prompt.substring(0, 100)}...`);
    console.log('⚡ Generating story with Claude + RAG...');

    // Log the request
    logger.logStorySave(story_prompt.length, false);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Generate story
    const storyResult = await expandStory(story_prompt, apiKeys.anthropic);
    const textContent = storyResult.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';

    console.log(`✅ Story generated: ${story.split(/\s+/).length.toLocaleString()} words`);

    // Generate Fish Audio (full story)
    console.log('🐠 Generating Fish Audio voiceover (full story with parallel processing)...');
    const audioResult = await generateVoiceover(story, {
      apiKey: apiKeys.fish,
      model: 's1',
      format: 'mp3',
      speed: 1.0,
      removeSilence: true,
      silenceThreshold: -45,
      silenceLength: 45,
      outputPath: undefined
    });

    // Log successful audio generation
    logger.logStorySave(audioResult.duration, true);

    // Read binary audio data
    const audioData = fs.readFileSync(audioResult.audioPath);

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `fish_audio_${timestamp}.mp3`;

    // Set headers for binary audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('X-Audio-Duration', audioResult.duration || 'unknown');
    res.setHeader('X-Audio-Size', audioResult.fileSize || 'unknown');
    res.setHeader('X-Story-Words', story.split(/\s+/).length.toString());

    console.log('✅ Fish Audio binary generation complete');

    // Send binary audio data
    res.send(audioData);

    // Clean up temp file
    fs.unlinkSync(audioResult.audioPath);

  } catch (error) {
    console.error('Error in Fish Audio binary generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate Fish Audio', 
      details: errorMessage 
    });
  }
});

// Dual Binary Endpoint - Story + Both ElevenLabs + Fish Audio (returns ZIP)
app.post('/generate-dual-binary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_prompt } = req.body;

    if (!story_prompt) {
      res.status(400).json({ 
        error: 'Missing required field: story_prompt' 
      });
      return;
    }

    console.log(`📥 Dual binary generation for: ${story_prompt.substring(0, 100)}...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Step 1: Generate story
    console.log('⚡ Generating story with Claude + RAG...');
    const storyResult = await expandStory(story_prompt, apiKeys.anthropic);
    const textContent = storyResult.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';

    console.log(`✅ Story generated: ${story.split(/\s+/).length.toLocaleString()} words`);

    // Step 2: Generate voiceovers sequentially (ElevenLabs first to avoid rate limits)
    console.log('🎤 Starting dual voiceover generation (sequential)...');
    
    let elevenLabsResult: any = null;
    let fishAudioResult: any = null;
    const errors: string[] = [];

    // Generate ElevenLabs voiceover first with retry logic
    console.log('🎵 Starting ElevenLabs voiceover with retry logic (4000 chars)...');
    const maxRetries = 3;
    let elevenLabsRetryCount = 0;
    
    while (elevenLabsRetryCount < maxRetries && !elevenLabsResult) {
      try {
        if (elevenLabsRetryCount > 0) {
          const delay = Math.pow(2, elevenLabsRetryCount) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay/1000}s before ElevenLabs retry ${elevenLabsRetryCount + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`🎵 ElevenLabs attempt ${elevenLabsRetryCount + 1}/${maxRetries}...`);
        elevenLabsResult = await generateElevenLabsVoiceover(story, {
          apiKey: apiKeys.elevenlabs,
          voiceId: 'jpjWfzKyhJIgrlqr39h8',
          removeSilence: true,
          silenceThreshold: -45,
          silenceLength: 45,
          outputPath: undefined
        });
        console.log('✅ ElevenLabs voiceover completed successfully');
        break;
      } catch (error: any) {
        elevenLabsRetryCount++;
        console.warn(`⚠️  ElevenLabs attempt ${elevenLabsRetryCount} failed: ${error.message}`);
        
        if (elevenLabsRetryCount >= maxRetries) {
          errors.push(`elevenlabs: Failed after ${maxRetries} attempts - ${error.message}`);
          console.error('❌ ElevenLabs failed all retry attempts');
        }
      }
    }

    // Small delay before Fish Audio to give ElevenLabs breathing room
    console.log('⏳ Brief pause before Fish Audio to avoid API conflicts...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    
    // Generate Fish Audio voiceover second (full story with parallel processing)
    try {
      console.log('🐠 Starting Fish Audio voiceover (full story)...');
      fishAudioResult = await generateVoiceover(story, {
        apiKey: apiKeys.fish,
        model: 's1',
        format: 'mp3',
        speed: 1.0,
        removeSilence: true,
        silenceThreshold: -45,
        silenceLength: 45,
        outputPath: undefined
      });
      console.log('✅ Fish Audio voiceover completed');
    } catch (error: any) {
      console.warn('⚠️  Fish Audio failed:', error.message);
      errors.push(`fish: ${error.message}`);
    }

    // BOTH voiceovers must succeed for video production
    if (!elevenLabsResult || !fishAudioResult || errors.length > 0) {
      console.error('❌ Dual voiceover generation failed - BOTH services required for video production');
      res.status(500).json({ 
        error: 'Both ElevenLabs and Fish Audio required for video production', 
        details: errors.length > 0 ? errors : ['One or both voiceover services failed']
      });
      return;
    }

    console.log('✅ Both voiceover services completed successfully!');

    // Return both MP3s as multipart response (no ZIP)
    console.log('🎉 Dual binary generation complete - returning both MP3s as multipart response');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    
    // Read both MP3 files
    const elevenLabsBuffer = fs.readFileSync(elevenLabsResult.audioPath);
    const fishAudioBuffer = fs.readFileSync(fishAudioResult.audioPath);
    
    // Create multipart boundary
    const boundary = `----formdata-${Date.now()}`;
    
    // Build multipart response
    let multipartBody = '';
    
    // ElevenLabs MP3 part
    multipartBody += `--${boundary}\r\n`;
    multipartBody += `Content-Disposition: form-data; name="elevenlabs"; filename="elevenlabs_intro_${timestamp}.mp3"\r\n`;
    multipartBody += `Content-Type: audio/mpeg\r\n\r\n`;
    
    // Fish Audio MP3 part  
    const fishPart = `\r\n--${boundary}\r\n`;
    const fishHeaders = `Content-Disposition: form-data; name="fish_audio"; filename="fish_audio_full_${timestamp}.mp3"\r\n`;
    const fishContentType = `Content-Type: audio/mpeg\r\n\r\n`;
    
    // End boundary
    const endBoundary = `\r\n--${boundary}--\r\n`;
    
    // Calculate total content length
    const headerBuffer = Buffer.from(multipartBody);
    const fishPartBuffer = Buffer.from(fishPart + fishHeaders + fishContentType);
    const endBoundaryBuffer = Buffer.from(endBoundary);
    const totalLength = headerBuffer.length + elevenLabsBuffer.length + fishPartBuffer.length + fishAudioBuffer.length + endBoundaryBuffer.length;
    
    // Set multipart headers
    res.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
    res.setHeader('Content-Length', totalLength);
    res.setHeader('X-ElevenLabs-Size', elevenLabsResult.fileSize || 'unknown');
    res.setHeader('X-Fish-Audio-Size', fishAudioResult.fileSize || 'unknown');
    res.setHeader('X-Story-Words', story.split(/\s+/).length.toString());
    
    // Send multipart response
    res.write(headerBuffer);
    res.write(elevenLabsBuffer);
    res.write(fishPartBuffer);
    res.write(fishAudioBuffer);
    res.write(endBoundaryBuffer);
    res.end();
    
    // Clean up temporary files
    try {
      fs.unlinkSync(elevenLabsResult.audioPath);
      fs.unlinkSync(fishAudioResult.audioPath);
      console.log('🧹 Cleaned up temporary audio files');
    } catch (cleanupError) {
      console.warn('⚠️  Could not clean up temporary files:', cleanupError);
    }

  } catch (error) {
    console.error('Error in dual binary generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate dual audio', 
      details: errorMessage 
    });
  }
});

// Binary audio endpoints for pre-generated stories
app.post('/generate-elevenlabs-with-story', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_text, elevenlabs_voice_id } = req.body;

    if (!story_text) {
      res.status(400).json({ 
        error: 'Missing required field: story_text' 
      });
      return;
    }

    console.log(`📥 ElevenLabs generation with pre-generated story (${story_text.split(/\s+/).length} words)...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Generate ElevenLabs audio with retry logic (first 4000 characters)
    console.log('🎵 Generating ElevenLabs voiceover with retry logic...');
    const maxRetries = 3;
    let elevenLabsRetryCount = 0;
    let audioResult: any = null;
    
    while (elevenLabsRetryCount < maxRetries && !audioResult) {
      try {
        if (elevenLabsRetryCount > 0) {
          const delay = Math.pow(2, elevenLabsRetryCount) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay/1000}s before ElevenLabs retry ${elevenLabsRetryCount + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        console.log(`🎵 ElevenLabs attempt ${elevenLabsRetryCount + 1}/${maxRetries}...`);
        audioResult = await generateElevenLabsVoiceover(story_text, {
          apiKey: apiKeys.elevenlabs,
          voiceId: elevenlabs_voice_id || 'jpjWfzKyhJIgrlqr39h8',
          removeSilence: true,
          silenceThreshold: -45,
          silenceLength: 45,
          outputPath: undefined
        });
        console.log('✅ ElevenLabs voiceover completed successfully');
        break;
      } catch (error: any) {
        elevenLabsRetryCount++;
        console.warn(`⚠️  ElevenLabs attempt ${elevenLabsRetryCount} failed: ${error.message}`);
        
        if (elevenLabsRetryCount >= maxRetries) {
          throw new Error(`ElevenLabs failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }

    // Read binary audio data
    const audioData = fs.readFileSync(audioResult.audioPath);

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `elevenlabs_${timestamp}.mp3`;

    // Set headers for binary audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('X-Audio-Duration', audioResult.duration || 'unknown');
    res.setHeader('X-Audio-Size', audioResult.fileSize || 'unknown');
    res.setHeader('X-Story-Words', story_text.split(/\s+/).length.toString());

    console.log('✅ ElevenLabs generation with pre-generated story complete');

    // Send binary audio data
    res.send(audioData);

    // Clean up temp file
    fs.unlinkSync(audioResult.audioPath);

  } catch (error) {
    console.error('Error in ElevenLabs generation with story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate ElevenLabs audio with story', 
      details: errorMessage 
    });
  }
});

app.post('/generate-fish-with-story', async (req: Request, res: Response): Promise<void> => {
  try {
    const { story_text } = req.body;

    if (!story_text) {
      res.status(400).json({ 
        error: 'Missing required field: story_text' 
      });
      return;
    }

    console.log(`📥 Fish Audio generation with pre-generated story (${story_text.split(/\s+/).length} words)...`);

    // Get API keys from request or use defaults
    const apiKeys = getApiKeys(req);

    // Generate Fish Audio (full story)
    console.log('🐠 Generating Fish Audio voiceover (full story with parallel processing)...');
    const audioResult = await generateVoiceover(story_text, {
      apiKey: apiKeys.fish,
      model: 's1',
      format: 'mp3',
      speed: 1.0,
      removeSilence: true,
      silenceThreshold: -45,
      silenceLength: 45,
      outputPath: undefined
    });

    // Read binary audio data
    const audioData = fs.readFileSync(audioResult.audioPath);

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `fish_audio_${timestamp}.mp3`;

    // Set headers for binary audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('X-Audio-Duration', audioResult.duration || 'unknown');
    res.setHeader('X-Audio-Size', audioResult.fileSize || 'unknown');
    res.setHeader('X-Story-Words', story_text.split(/\s+/).length.toString());

    console.log('✅ Fish Audio generation with pre-generated story complete');

    // Send binary audio data
    res.send(audioData);

    // Clean up temp file
    fs.unlinkSync(audioResult.audioPath);

  } catch (error) {
    console.error('Error in Fish Audio generation with story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to generate Fish Audio with story', 
      details: errorMessage 
    });
  }
});

// API Key validation endpoint
app.post('/validate-api-keys', async (req: Request, res: Response): Promise<void> => {
  try {
    const { anthropic, elevenlabs, fish } = req.body;
    
    const validation = {
      anthropic: { 
        valid: !!(anthropic && anthropic.startsWith('sk-ant-')), 
        message: anthropic ? 'Valid format' : 'Missing key',
        provided: !!anthropic 
      },
      elevenlabs: { 
        valid: !!(elevenlabs && elevenlabs.startsWith('sk_')), 
        message: elevenlabs ? 'Valid format' : 'Missing key',
        provided: !!elevenlabs 
      },
      fish: { 
        valid: !!(fish && fish.length > 10), 
        message: fish ? 'Valid format' : 'Missing key',
        provided: !!fish 
      }
    };
    
    // Console confirmation for validation
    console.log('🔍 API Key Validation Request:');
    if (validation.anthropic.provided) {
      console.log(`   ${validation.anthropic.valid ? '✅' : '❌'} Anthropic API key - ${validation.anthropic.message}`);
    }
    if (validation.elevenlabs.provided) {
      console.log(`   ${validation.elevenlabs.valid ? '✅' : '❌'} ElevenLabs API key - ${validation.elevenlabs.message}`);
    }
    if (validation.fish.provided) {
      console.log(`   ${validation.fish.valid ? '✅' : '❌'} Fish Audio API key - ${validation.fish.message}`);
    }
    
    const validCount = [validation.anthropic.valid, validation.elevenlabs.valid, validation.fish.valid].filter(Boolean).length;
    const providedCount = [validation.anthropic.provided, validation.elevenlabs.provided, validation.fish.provided].filter(Boolean).length;
    
    console.log(`   📊 Validation Summary: ${validCount}/${providedCount} keys valid`);
    
    // Log validation attempt
    console.log('📝 API key validation completed');
    
    res.json({
      success: true,
      validation,
      message: 'API key validation completed'
    });
  } catch (error) {
    console.log('❌ API Key Validation Failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('📝 API key validation error logged');
    res.status(500).json({
      success: false,
      error: 'Failed to validate API keys'
    });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Claude Story Expander API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Expand story: POST http://localhost:${PORT}/expand-story`);
});

// Set server timeout to 35 minutes (for long dual voiceover generation)
server.timeout = 35 * 60 * 1000; // 35 minutes in milliseconds
console.log('🕒 Server timeout set to 35 minutes for dual voiceover generation');

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err: Error | undefined) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 