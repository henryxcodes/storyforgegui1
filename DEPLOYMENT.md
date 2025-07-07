# 🚀 Render Node.js Deployment Guide

## Claude Longform Generator with Dual Voiceovers

This service generates 12k-16k word stories using Claude Sonnet 4 and creates dual voiceovers (ElevenLabs + Fish Audio) with automatic silence removal.

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to GitHub
3. **API Keys**:
   - Anthropic API Key (Claude)
   - ElevenLabs API Key
   - Fish Audio API Key (optional - has fallback)

## 🔧 Render Deployment Steps

### 1. Connect Repository
1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select this repository

### 2. Configure Service
- **Name**: `claude-longform-generator`
- **Environment**: `Node`
- **Plan**: `Starter ($7/month)` - required for audio processing memory
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: `18` (or latest)

### 3. Set Environment Variables
In Render Dashboard → Environment tab:

```
NODE_ENV=production
ANTHROPIC_API_KEY=your-claude-api-key-here
ELEVENLABS_API_KEY=sk_2f08313cf36c7ff4d765c89dd8157761c3cddfc10b8e0111
FISH_API_KEY=your-fish-key-here
PORT=10000
```

### 4. Deploy
Click "Create Web Service" - Render will automatically:
- Install Node.js dependencies
- Build TypeScript code
- Install FFmpeg (available in Render's Node.js environment)
- Start the server

## 🎯 API Endpoints

Your service will be available at: `https://your-service-name.onrender.com`

### Health Check
```
GET https://your-service-name.onrender.com/
```

### Complete Generation (Story + Dual Voiceovers)
```
POST https://your-service-name.onrender.com/generate-complete

Body:
{
  "story_prompt": "Your story script here",
  "elevenlabs_voice_id": "jpjWfzKyhJIgrlqr39h8",
  "remove_silence": true,
  "elevenlabs_remove_silence": true
}
```

### Story Only
```
POST https://your-service-name.onrender.com/expand-story

Body:
{
  "story_prompt": "Your story script here"
}
```

## 📊 Response Format

```json
{
  "success": true,
  "story": {
    "text": "Full 12k-16k word story...",
    "word_count": 15000,
    "character_count": 75000
  },
  "voiceovers": {
    "elevenlabs": {
      "audio_base64": "UklGRjwAAABXQVZF...",
      "file_size": 2500000,
      "duration": 300,
      "character_count": 4000,
      "format": "mp3"
    },
    "fish_audio": {
      "audio_base64": "UklGRjwAAABXQVZF...",
      "file_size": 25000000,
      "duration": 5400,
      "format": "mp3"
    }
  },
  "usage": {...},
  "model": "claude-sonnet-4-20250514"
}
```

## ⚡ Features

- ✅ Claude Sonnet 4 for premium story generation
- ✅ RAG-enhanced context from knowledge base
- ✅ 12,000-16,000 word stories (90-minute content)
- ✅ Dual voiceover system:
  - **ElevenLabs**: First 4,000 characters (premium quality)
  - **Fish Audio**: Full story (complete 90 minutes)
- ✅ Automatic silence removal with FFmpeg (-45dB, 45ms)
- ✅ Male perspective enforcement
- ✅ Parallel voiceover generation
- ✅ Base64 audio response for easy integration
- ✅ Automatic temp file cleanup

## 🔒 Security

- API keys stored as environment variables
- No sensitive data in code repository
- Temporary audio files automatically deleted
- CORS enabled for web integration

## 📈 Performance

- **Plan**: Starter ($7/month) - required for audio processing
- **Memory**: Handles large audio files efficiently
- **Timeout**: 35-minute requests for full dual voiceover generation
- **Parallel Processing**: ElevenLabs + Fish Audio generated simultaneously
- **Typical Generation Time**: 10-15 minutes for 12k-16k word stories

## 🛠️ Local Testing

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Test endpoint
curl -X POST http://localhost:3000/generate-complete \
  -H "Content-Type: application/json" \
  -d '{"story_prompt": "Test story"}'
```

## 📞 Support

- Logs available in Render Dashboard
- Health check endpoint for monitoring
- Error responses include detailed messages
- FFmpeg automatically available in Render Node.js environment 