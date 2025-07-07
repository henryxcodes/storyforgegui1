# 🚀 Vercel Deployment Checklist for StoryForge GUI

## ✅ Pre-Deployment Checklist

### 1. **Build Verification**
- [x] TypeScript compilation succeeds (`npm run build`)
- [x] All dependencies are installed (`npm install`)
- [x] Dynamic API key system implemented
- [x] Data management system implemented
- [x] Vercel serverless functions configured

### 2. **Environment Variables Setup**
Set these in your Vercel project dashboard or via CLI:

```bash
# Required API Keys (set your actual keys here)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
FISH_API_KEY=your_fish_api_key_here

# Production Environment
NODE_ENV=production

# Vercel KV Database (Auto-configured when you add KV storage)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Security
CLEANUP_API_KEY=generate_a_secure_random_key_here
```

### 3. **Vercel Configuration**
- [x] `vercel.json` configured with correct routes
- [x] Build settings configured
- [x] Function timeout set to 300 seconds (5 minutes)
- [x] Static file serving configured

### 4. **Storage Setup**
- [x] Vercel KV database will be created during deployment
- [x] Local fallback system in place for development
- [x] 48-hour auto-expiration configured

## 🔧 Deployment Steps

### Step 1: Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy to Vercel
```bash
# For first deployment
vercel

# For production deployment
vercel --prod
```

### Step 4: Set up Vercel KV Storage
1. Go to your Vercel project dashboard
2. Navigate to "Storage" tab
3. Click "Create" → "KV Database"
4. Name it `storyforge-kv`
5. Environment variables will be auto-added

### Step 5: Configure Environment Variables
In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add all required variables listed above
3. Make sure to set them for "Production", "Preview", and "Development"

### Step 6: Set up Automatic Cleanup (Optional)
1. Go to Vercel dashboard → Settings → Functions
2. Add a cron job integration:
   - URL: `https://your-domain.vercel.app/api/cleanup?key=YOUR_CLEANUP_API_KEY`
   - Schedule: `0 */6 * * *` (every 6 hours)

## 📋 Post-Deployment Verification

### 1. **Test Core Functionality**
- [ ] App loads correctly
- [ ] Dynamic API key system works (test with user-provided keys)
- [ ] Story generation works
- [ ] Voiceover generation works (ElevenLabs & Fish Audio)
- [ ] Story saving/loading works
- [ ] Data management panel works
- [ ] Story database functionality works

### 2. **Test API Endpoints**
- [ ] `GET /` - Main app loads
- [ ] `POST /expand-story` - Story expansion works
- [ ] `POST /generate-elevenlabs` - ElevenLabs voiceover
- [ ] `POST /generate-fish` - Fish Audio voiceover
- [ ] `POST /api/stories` - Story saving
- [ ] `GET /api/stories?id=xxx` - Story retrieval
- [ ] `DELETE /api/stories?id=xxx` - Story deletion
- [ ] `GET /api/cleanup?key=xxx` - Cleanup endpoint

### 3. **Performance Checks**
- [ ] Function execution time < 300 seconds
- [ ] File uploads work correctly
- [ ] Audio generation completes successfully
- [ ] No timeout errors

## 🛠️ Configuration Files Overview

### `vercel.json`
```json
{
  "version": 2,
  "builds": [
    { "src": "dist/server.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "dist/server.js" },
    { "src": "/expand-story", "dest": "dist/server.js" },
    { "src": "/generate-(.*)", "dest": "dist/server.js" },
    { "src": "/", "dest": "dist/server.js" },
    { "src": "/(.*)", "dest": "public/index.html" }
  ],
  "functions": {
    "dist/server.js": { "maxDuration": 300 }
  }
}
```

### Environment Variables
- **Development**: Local storage fallback
- **Production**: Vercel KV with auto-expiration
- **API Keys**: Dynamic system with hardcoded fallbacks

## 🚨 Troubleshooting

### Common Issues:

1. **Build Errors**
   - Run `npm run build` locally first
   - Check TypeScript errors
   - Verify all imports are correct

2. **Function Timeouts**
   - Reduce story length for faster processing
   - Check network connectivity
   - Verify API key validity

3. **Storage Issues**
   - Verify Vercel KV is properly set up
   - Check environment variables are set
   - Test with local storage fallback

4. **API Key Issues**
   - User can provide their own keys in UI
   - Fallback keys are available
   - Check key format validation

### Debug Commands:
```bash
# Check build locally
npm run build && npm start

# Test specific endpoints
curl https://your-domain.vercel.app/api/stories

# Check Vercel logs
vercel logs --since=1h
```

## 🔄 Continuous Deployment

### GitHub Integration
1. Connect your GitHub repository to Vercel
2. Enable automatic deployments on push
3. Set up preview deployments for pull requests

### Branch Strategy
- `main` → Production deployment
- `develop` → Preview deployment
- Feature branches → Preview deployment

## 🌟 Features Ready for Production

✅ **Dynamic API Key System**
- Users can enter their own API keys
- Session-based storage (cleared on browser close)
- Fallback to hardcoded keys when needed
- Real-time validation and feedback

✅ **Comprehensive Data Management**
- Individual storage area clearing
- Complete data wipe functionality
- Real-time storage usage display
- Safe deletion with confirmations

✅ **Robust Story Storage**
- 48-hour auto-expiration
- Vercel KV integration
- Local storage fallback
- Chunked saving for large stories

✅ **Professional UI/UX**
- Modern purple-themed design
- Mobile-responsive layout
- Loading states and progress indicators
- User-friendly notifications

✅ **Production-Ready Features**
- Error handling and logging
- Memory management
- Graceful degradation
- Security best practices

## 🎯 Your App is Ready for Deployment!

All systems are configured and tested. Simply run `vercel --prod` to deploy to production. 