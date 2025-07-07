# StoryForgeGUI: Claude Story Generator with RAG Knowledge Base

StoryForgeGUI is a graphical user interface application that extends Claude's story expansion capabilities with a powerful RAG (Retrieval-Augmented Generation) system. It uses `Data.txt` as a knowledge base for high-quality narrative generation with an intuitive user interface.

## 🚀 Features

- **RAG-Enhanced Story Expansion**: Uses knowledge base from `Data.txt` to inform story structure and style
- **Intelligent Context Generation**: Automatically finds relevant examples from the knowledge base
- **Theme-Based Matching**: Identifies and matches narrative themes (revenge, betrayal, family drama, etc.)
- **Reddit-Style Content**: Optimized for social media audiences aged 15-25
- **Professional API**: Clean REST endpoints with knowledge base statistics
- **Flexible Deployment**: Supports Vercel, Render, and Docker deployment

## 🧠 Knowledge Base System

The RAG system processes `Data.txt` containing multiple story examples and creates:

- **Story Chunking**: Breaks stories into searchable 800-word chunks with overlap
- **Theme Extraction**: Automatically identifies themes like revenge, betrayal, financial fraud
- **Style Analysis**: Detects writing patterns (first-person, dialogue-heavy, emotional intensity)
- **Plot Structure Recognition**: Identifies narrative elements (backstory, discovery, planning, execution)

### Available Themes
- `revenge` - Stories involving payback and retaliation
- `betrayal` - Deception and backstabbing narratives
- `family_drama` - Sister/family relationship conflicts
- `financial_fraud` - Money theft and credit schemes
- `relationships` - Wedding and dating drama
- `legal_consequences` - Court, police, FBI involvement
- `social_humiliation` - Public embarrassment scenarios
- `manipulation` - Scheming and control tactics

## 📡 API Endpoints

### POST /expand-story
Expands a story prompt using RAG-enhanced context from the knowledge base.

**Request Body:**
```json
{
  "story_prompt": "Your story prompt here...",
  "api_key": "optional-claude-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "expanded_story": "Full expanded story with RAG context...",
  "usage": {
    "input_tokens": 150,
    "output_tokens": 8000
  },
  "model": "claude-sonnet-4-20250514"
}
```

### GET /knowledge-stats
Returns statistics about the knowledge base.

**Response:**
```json
{
  "success": true,
  "knowledge_base": {
    "totalStories": 3,
    "totalChunks": 45,
    "totalWords": 25000,
    "availableThemes": ["revenge", "betrayal", "family_drama"],
    "averageChunkSize": 800
  },
  "description": "Statistics from the Data.txt knowledge base"
}
```

### GET /
Health check endpoint with system status.

## 🛠 Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd n8n-claude-extend
   npm install
   ```

2. **Prepare Knowledge Base**
   Ensure `Data.txt` is in the root directory with your story examples.

3. **Test Knowledge Base**
   ```bash
   npm run setup-knowledge
   ```

4. **Environment Variables**
   Create a `.env` file:
   ```env
   ANTHROPIC_API_KEY=your_claude_api_key_here
   PORT=3000
   NODE_ENV=production
   ```

5. **Development**
   ```bash
   npm run dev    # Development with hot reload
   npm run build  # Build for production
   npm start      # Start production server
   ```

## 📝 Data.txt Format

Your knowledge base should follow this structure:

```
Story1:

[First story content with themes like revenge, betrayal, etc.]

Story2:

[Second story content with different themes and narrative structure]

Story3:

[Additional story examples...]
```

## 🔍 How RAG Works

1. **Preprocessing**: `Data.txt` is automatically processed into themed chunks
2. **Query Analysis**: User prompts are analyzed for themes and keywords
3. **Context Retrieval**: Relevant story chunks are found using similarity matching
4. **Context Integration**: Best examples are provided to Claude as writing guidance
5. **Enhanced Generation**: Claude creates stories informed by the knowledge base patterns

## 🚀 Deployment Options

### Vercel
```bash
vercel --prod
```

### Render
Push to GitHub and connect to Render with:
- Build: `npm install && npm run build`
- Start: `npm start`

### Docker
```bash
docker build -t claude-story-expander .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=your_key claude-story-expander
```

## 🔧 Integration with n8n

1. **HTTP Request Node Configuration:**
   - Method: POST
   - URL: `https://your-deployed-url.com/expand-story`
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "story_prompt": "{{$json.story_prompt}}"
     }
     ```

2. **Knowledge Base Stats (Optional):**
   - Method: GET
   - URL: `https://your-deployed-url.com/knowledge-stats`

## 📖 Story Generation Guidelines

The RAG system optimizes for:
- **Length**: 6000-8000 words (30-45 minutes of content)
- **Style**: First-person narrative matching knowledge base examples
- **Audience**: 15-25 year olds seeking engaging, relatable content
- **Structure**: Clear progression informed by successful story patterns
- **Themes**: Automatically matched to relevant knowledge base content
- **Quality**: Enhanced by learning from high-performing story examples

## 🎯 RAG Benefits

- **Consistent Quality**: Stories follow proven narrative patterns
- **Theme Coherence**: Automatic matching ensures appropriate style and pacing
- **Reduced Hallucinations**: Grounded in actual story examples
- **Scalable Knowledge**: Easy to add new story examples to `Data.txt`
- **Contextual Awareness**: Understands what makes stories engaging

## ⚡ Performance

- Knowledge base loads once at startup
- Sub-second context retrieval for story generation
- Automatic caching of processed chunks
- Optimized similarity search algorithms

## 🔒 Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success with RAG context
- `400`: Bad Request (missing story_prompt)
- `500`: Server Error (Claude API issues, knowledge base errors)
- `503`: Service Unavailable (knowledge base not loaded)

## 📊 Monitoring

Monitor the knowledge base health:
- Check `/knowledge-stats` for system status
- Review chunk distribution across themes
- Validate story processing statistics

## 📄 License

MIT License - see LICENSE file for details. 