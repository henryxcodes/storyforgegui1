import fs from 'fs';
import path from 'path';

interface StoryChunk {
  id: string;
  content: string;
  storyId: string;
  chunkIndex: number;
  wordCount: number;
  themes: string[];
}

interface StoryMeta {
  id: string;
  title: string;
  mainThemes: string[];
  characterCount: number;
  plotStructure: string[];
  writingStyle: string[];
}

export class KnowledgeBase {
  private chunks: StoryChunk[] = [];
  private storyMetas: StoryMeta[] = [];
  
  constructor() {}

  async initialize(): Promise<void> {
    await this.loadAndProcessData();
    console.log('Knowledge base initialized successfully');
  }

  async loadAndProcessData(): Promise<void> {
    try {
      const dataPath = path.join(process.cwd(), 'Data.txt');
      
      // Check if file exists first
      if (!fs.existsSync(dataPath)) {
        throw new Error(`Data.txt not found at ${dataPath}. Working directory: ${process.cwd()}`);
      }
      
      console.log(`📁 Loading knowledge base from: ${dataPath}`);
      const content = await fs.promises.readFile(dataPath, 'utf-8');
      
      if (!content || content.trim().length === 0) {
        throw new Error('Data.txt is empty or invalid');
      }

      // Split content into individual stories
      const stories = this.extractStories(content);
      
      if (stories.length === 0) {
        throw new Error('No stories found in Data.txt');
      }

      for (const [index, story] of stories.entries()) {
        const storyId = `story_${index + 1}`;
        const meta = this.extractStoryMeta(story, storyId);
        this.storyMetas.push(meta);

        // Split story into chunks for RAG
        const chunks = this.chunkStory(story, storyId);
        this.chunks.push(...chunks);
      }

      console.log(`✅ Processed ${stories.length} stories into ${this.chunks.length} chunks`);
    } catch (error: any) {
      console.error('❌ Error loading knowledge base:', error.message);
      throw new Error(`Knowledge base initialization failed: ${error.message}`);
    }
  }

  private extractStories(content: string): string[] {
    // Split by story markers (Story1:, Story2:, etc.)
    const stories = content.split(/Story\d+:\s*/).filter(story => story.trim().length > 0);
    return stories;
  }

  private extractStoryMeta(story: string, storyId: string): StoryMeta {
    const lines = story.split('\n').filter(line => line.trim().length > 0);
    const title = lines[0]?.substring(0, 100) + '...' || 'Untitled';
    
    // Extract themes using keyword analysis
    const themes = this.extractThemes(story);
    
    // Analyze plot structure
    const plotStructure = this.analyzePlotStructure(story);
    
    // Analyze writing style
    const writingStyle = this.analyzeWritingStyle(story);
    
    return {
      id: storyId,
      title,
      mainThemes: themes,
      characterCount: story.length,
      plotStructure,
      writingStyle
    };
  }

  private extractThemes(story: string): string[] {
    const themeKeywords = {
      'revenge': ['revenge', 'payback', 'get back', 'retaliation', 'justice', 'reckoning'],
      'betrayal': ['betray', 'cheat', 'deceive', 'lie', 'backstab', 'unfaithful'],
      'family_drama': ['sister', 'brother', 'mother', 'father', 'family', 'parent'],
      'financial_fraud': ['money', 'credit', 'fraud', 'steal', 'bank', 'account', 'debt'],
      'relationships': ['wedding', 'marriage', 'boyfriend', 'girlfriend', 'love', 'dating'],
      'legal_consequences': ['lawyer', 'court', 'police', 'FBI', 'arrest', 'prison'],
      'social_humiliation': ['embarrass', 'shame', 'public', 'humiliate', 'expose'],
      'manipulation': ['manipulate', 'control', 'scheme', 'plan', 'trick']
    };

    const storyLower = story.toLowerCase();
    const themes: string[] = [];

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const matches = keywords.filter(keyword => storyLower.includes(keyword));
      if (matches.length >= 2) { // Theme needs multiple keyword matches
        themes.push(theme);
      }
    }

    return themes;
  }

  private analyzePlotStructure(story: string): string[] {
    const structure = [];
    const storyLower = story.toLowerCase();

    // Check for common narrative elements
    if (storyLower.includes('when i was') || storyLower.includes('growing up')) {
      structure.push('backstory_opening');
    }
    
    if (storyLower.includes('i discovered') || storyLower.includes('i found out')) {
      structure.push('discovery_moment');
    }
    
    if (storyLower.includes('i planned') || storyLower.includes('i decided')) {
      structure.push('planning_phase');
    }
    
    if (storyLower.includes('the day of') || storyLower.includes('at the')) {
      structure.push('execution_scene');
    }
    
    if (storyLower.includes('months later') || storyLower.includes('years later')) {
      structure.push('aftermath_resolution');
    }

    return structure;
  }

  private analyzeWritingStyle(story: string): string[] {
    const style = [];
    const sentences = story.split(/[.!?]+/);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

    if (avgSentenceLength > 100) {
      style.push('detailed_descriptive');
    } else if (avgSentenceLength < 50) {
      style.push('concise_punchy');
    }

    // Check for dialogue patterns
    if (story.includes('"') && (story.match(/"/g) || []).length > 10) {
      style.push('dialogue_heavy');
    }

    // Check for first person narrative
    if (story.toLowerCase().includes('i ') && (story.match(/\bi\b/gi) || []).length > 20) {
      style.push('first_person_narrative');
    }

    // Check for emotional intensity
    if (/(!){2,}/.test(story) || story.toLowerCase().includes('furious') || story.toLowerCase().includes('devastated')) {
      style.push('emotionally_intense');
    }

    return style;
  }

  private chunkStory(story: string, storyId: string): StoryChunk[] {
    const chunks: StoryChunk[] = [];
    const maxChunkWords = 800; // words per chunk
    const overlapWords = 100; // words for overlap between chunks
    
    const words = story.split(/\s+/);
    const totalWords = words.length;
    
    let chunkIndex = 0;
    let startIndex = 0;
    
    while (startIndex < totalWords) {
      const endIndex = Math.min(startIndex + maxChunkWords, totalWords);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkContent = chunkWords.join(' ');
      
      if (chunkContent.trim()) {
        chunks.push(this.createChunk(chunkContent, storyId, chunkIndex));
        chunkIndex++;
      }
      
      // Move start index, accounting for overlap
      startIndex = endIndex - overlapWords;
      if (startIndex >= totalWords - overlapWords) break;
    }
    
    return chunks;
  }

  private createChunk(content: string, storyId: string, chunkIndex: number): StoryChunk {
    const wordCount = content.split(/\s+/).length;
    const themes = this.extractThemes(content);
    
    return {
      id: `${storyId}_chunk_${chunkIndex}`,
      content: content.trim(),
      storyId,
      chunkIndex,
      wordCount,
      themes
    };
  }

  // Simple text similarity search using keyword matching
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'but', 'for', 'you', 'are', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'car', 'way', 'use', 'her', 'she', 'all', 'not', 'him', 'from', 'they', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'water', 'been', 'call', 'where', 'find', 'right', 'think', 'came', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']);
    
    const filtered1 = words1.filter(w => !stopWords.has(w));
    const filtered2 = words2.filter(w => !stopWords.has(w));
    
    const set1 = new Set(filtered1);
    const set2 = new Set(filtered2);
    
    // Calculate overlap
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity with keyword bonus
    let baseScore = intersection.size / union.size;
    
    // Bonus for theme keywords appearing in both texts
    const themeKeywords = ['revenge', 'betrayal', 'sister', 'wedding', 'money', 'credit', 'fraud', 'family', 'marriage', 'boyfriend', 'girlfriend', 'cheat', 'lie', 'steal', 'plan', 'scheme', 'humiliate', 'expose', 'justice', 'payback'];
    let themeBonus = 0;
    
    for (const keyword of themeKeywords) {
      if (text1.toLowerCase().includes(keyword) && text2.toLowerCase().includes(keyword)) {
        themeBonus += 0.1;
      }
    }
    
    return Math.min(baseScore + themeBonus, 1.0);
  }

  // Search for relevant chunks based on query
  searchRelevantChunks(query: string, maxResults: number = 5): StoryChunk[] {
    const results: Array<{chunk: StoryChunk, score: number}> = [];
    
    for (const chunk of this.chunks) {
      const score = this.calculateSimilarity(query, chunk.content);
      if (score > 0.05) { // Lower threshold for better matching
        results.push({ chunk, score });
      }
    }
    
    // Sort by relevance score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(r => r.chunk);
  }

  // Find examples based on themes
  findExamplesByTheme(themes: string[], maxResults: number = 3): StoryChunk[] {
    const relevantChunks = this.chunks.filter(chunk => 
      chunk.themes.some(theme => themes.includes(theme))
    );
    
    return relevantChunks.slice(0, maxResults);
  }

  // Get writing style examples
  getWritingStyleExamples(styleFeatures: string[], maxResults: number = 2): StoryChunk[] {
    const matchingStories = this.storyMetas.filter(meta =>
      meta.writingStyle.some(style => styleFeatures.includes(style))
    );
    
    const chunks: StoryChunk[] = [];
    for (const story of matchingStories.slice(0, maxResults)) {
      const storyChunks = this.chunks.filter(chunk => chunk.storyId === story.id);
      if (storyChunks.length > 0) {
        chunks.push(storyChunks[0]); // Take first chunk of each matching story
      }
    }
    
    return chunks;
  }

  // Generate context for story expansion
  generateContextForPrompt(userPrompt: string): string {
    // First try semantic search
    let searchResults = this.searchRelevantChunks(userPrompt, 2);
    
    // If no good matches, try theme-based matching
    if (searchResults.length === 0) {
      const promptThemes = this.extractThemes(userPrompt);
      if (promptThemes.length > 0) {
        searchResults = this.findExamplesByTheme(promptThemes, 2);
      }
    }
    
    // If still no matches, get examples from most common themes
    if (searchResults.length === 0) {
      const commonThemes = ['revenge', 'betrayal', 'family_drama'];
      searchResults = this.findExamplesByTheme(commonThemes, 2);
    }

    let context = "REFERENCE EXAMPLES FROM KNOWLEDGE BASE:\n\n";
    
    if (searchResults.length > 0) {
      searchResults.forEach((chunk, index) => {
        context += `EXAMPLE ${index + 1} - Themes: [${chunk.themes.join(', ')}]\n`;
        context += `NARRATIVE STYLE REFERENCE:\n`;
        // Use more content for better context
        context += `${chunk.content.substring(0, 1000)}\n`;
        if (chunk.content.length > 1000) context += "...\n";
        context += "\n" + "=".repeat(50) + "\n\n";
      });
    }

    context += `WRITING GUIDELINES:
- Follow the EXACT narrative style shown in the examples above
- Use first-person perspective throughout
- Include detailed character development and realistic dialogue  
- Build tension through careful pacing and plot progression
- Create emotional engagement with specific details and consequences
- Structure with clear acts: setup → conflict → planning → execution → resolution
- Include realistic aftermath and long-term consequences
- Match the tone, pacing, and emotional intensity of the reference examples
- Use similar themes and plot structures when appropriate`;
    
    return context;
  }

  // Get all available themes
  getAllThemes(): string[] {
    const allThemes = this.chunks.flatMap(chunk => chunk.themes);
    return [...new Set(allThemes)];
  }

  // Get statistics about the knowledge base
  getStats() {
    return {
      totalStories: this.storyMetas.length,
      totalChunks: this.chunks.length,
      totalWords: this.chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0),
      availableThemes: this.getAllThemes(),
      averageChunkSize: Math.round(this.chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0) / this.chunks.length)
    };
  }
} 