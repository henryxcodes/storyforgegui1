import { KnowledgeBase } from './knowledge-base.js';

async function main() {
  console.log('🚀 Setting up Knowledge Base from Data.txt...');
  
  try {
    const knowledgeBase = new KnowledgeBase();
    await knowledgeBase.initialize();
    
    const stats = knowledgeBase.getStats();
    console.log('\n📊 Knowledge Base Statistics:');
    console.log(`├── Total Stories: ${stats.totalStories}`);
    console.log(`├── Total Chunks: ${stats.totalChunks}`);
    console.log(`├── Total Words: ${stats.totalWords.toLocaleString()}`);
    console.log(`├── Average Chunk Size: ${stats.averageChunkSize} words`);
    console.log(`└── Available Themes: ${stats.availableThemes.join(', ')}`);
    
    // Test search functionality
    console.log('\n🔍 Testing Search Functionality:');
    const testQueries = [
      'revenge wedding sister',
      'identity theft credit cards',
      'betrayal family drama',
      'planning revenge scheme'
    ];
    
    for (const query of testQueries) {
      const results = knowledgeBase.searchRelevantChunks(query, 2);
      console.log(`\n📝 Query: "${query}"`);
      console.log(`   Found ${results.length} relevant chunks`);
      
      if (results.length > 0) {
        const preview = results[0].content.substring(0, 100) + '...';
        console.log(`   Preview: ${preview}`);
        console.log(`   Themes: ${results[0].themes.join(', ')}`);
      }
    }
    
    // Test context generation
    console.log('\n🎯 Testing Context Generation:');
    const samplePrompt = "My sister betrayed me at my wedding";
    const context = knowledgeBase.generateContextForPrompt(samplePrompt);
    console.log(`Generated context length: ${context.length} characters`);
    
    console.log('\n✅ Knowledge Base setup completed successfully!');
    console.log('🎬 Ready to provide RAG-enhanced story expansions');
    
  } catch (error) {
    console.error('❌ Error setting up knowledge base:', error);
    process.exit(1);
  }
}

main(); 