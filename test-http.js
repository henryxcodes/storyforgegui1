// Test script for the new HTTP endpoint
import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:3000';

async function testCompleteGeneration() {
  try {
    console.log('🚀 Testing complete generation endpoint...');
    
    const response = await axios.post(`${BASE_URL}/generate-complete`, {
      story_prompt: "Write a short 3000 word story about a young man who discovers his roommate has been secretly recording their conversations. Focus on his discovery and immediate reaction.", // Shorter story for testing
      elevenlabs_api_key: "sk_2f08313cf36c7ff4d765c89dd8157761c3cddfc10b8e0111", // Your key
      elevenlabs_voice_id: "jpjWfzKyhJIgrlqr39h8", // Your preferred voice
      remove_silence: true,
      elevenlabs_remove_silence: true
    }, {
      timeout: 2100000 // 35 minutes timeout (35 * 60 * 1000)
    });

    console.log('✅ Generation completed!');
    console.log(`📝 Story: ${response.data.story.word_count} words`);
    
    // Save ElevenLabs audio
    if (response.data.voiceovers.elevenlabs) {
      const elevenLabsBuffer = Buffer.from(response.data.voiceovers.elevenlabs.audio_base64, 'base64');
      fs.writeFileSync('http_elevenlabs_test.mp3', elevenLabsBuffer);
      console.log(`🎤 ElevenLabs: ${(response.data.voiceovers.elevenlabs.file_size / 1024 / 1024).toFixed(2)} MB saved`);
    }
    
    // Save Fish Audio
    if (response.data.voiceovers.fish_audio) {
      const fishAudioBuffer = Buffer.from(response.data.voiceovers.fish_audio.audio_base64, 'base64');
      fs.writeFileSync('http_fishaudio_test.mp3', fishAudioBuffer);
      console.log(`🐠 Fish Audio: ${(response.data.voiceovers.fish_audio.file_size / 1024 / 1024).toFixed(2)} MB saved`);
    }
    
    // Save story text
    fs.writeFileSync('http_story_test.txt', response.data.story.text);
    console.log('📄 Story text saved');
    
    console.log('🎉 All test files saved successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Test just the story endpoint first
async function testStoryOnly() {
  try {
    console.log('🚀 Testing story-only endpoint...');
    
    const response = await axios.post(`${BASE_URL}/expand-story`, {
      story_prompt: "A quick test story about a dog"
    }, {
      timeout: 300000 // 5 minutes
    });

    console.log('✅ Story generation completed!');
    console.log(`📝 Story length: ${response.data.expanded_story.split(' ').length} words`);
    console.log(`⚡ Tokens used: ${response.data.usage.input_tokens + response.data.usage.output_tokens}`);
    
  } catch (error) {
    console.error('❌ Story test error:', error.response?.data || error.message);
  }
}

// Run tests
console.log('🔍 Testing HTTP endpoints...\n');
await testStoryOnly();
console.log('\n' + '='.repeat(50) + '\n');
await testCompleteGeneration(); 