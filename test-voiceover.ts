import { generateElevenLabsVoiceover } from './elevenlabs-audio.js';
import { generateVoiceover } from './fish-audio.js';
import fs from 'fs';

interface TestOptions {
  elevenLabsKey?: string;
  fishKey?: string;
  testBoth?: boolean;
  elevenlabs?: boolean;
  fish?: boolean;
}

function parseTestArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--elevenlabs-key':
      case '--eleven-key':
        options.elevenLabsKey = nextArg;
        i++;
        break;
      case '--fish-key':
        options.fishKey = nextArg;
        i++;
        break;
      case '--both':
        options.testBoth = true;
        break;
      case '--elevenlabs':
      case '--eleven':
        options.elevenlabs = true;
        break;
      case '--fish':
        options.fish = true;
        break;
    }
  }
  
  return options;
}

async function testElevenLabs(apiKey?: string): Promise<boolean> {
  try {
    console.log('\n🧪 Testing ElevenLabs API...');
    
    const testText = "Hello! This is a test of ElevenLabs voice synthesis. If you can hear this, your API key is working correctly.";
    
    const result = await generateElevenLabsVoiceover(testText, {
      apiKey: apiKey,
      outputPath: './output/test_elevenlabs.mp3',
      removeSilence: false // Skip silence removal for faster testing
    });
    
    console.log('✅ ElevenLabs test successful!');
    console.log(`📁 Test file: ${result.audioPath}`);
    console.log(`📊 File size: ${(result.fileSize / 1024).toFixed(1)} KB`);
    console.log(`📝 Characters: ${result.characterCount}/4000`);
    
    return true;
    
  } catch (error: any) {
    console.error('❌ ElevenLabs test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('💡 Fix: Provide a valid ElevenLabs API key');
      console.log('   Get your key from: https://elevenlabs.io/app/settings/api-keys');
      console.log('   Usage: npm run test-voiceover -- --elevenlabs --elevenlabs-key "your-key-here"');
    }
    
    return false;
  }
}

async function testFishAudio(apiKey?: string): Promise<boolean> {
  try {
    console.log('\n🧪 Testing Fish Audio API...');
    
    const testText = "Hello! This is a test of Fish Audio voice synthesis. If you can hear this, your API configuration is working correctly.";
    
    const result = await generateVoiceover(testText, {
      apiKey: apiKey,
      outputPath: './output/test_fishaudio.mp3',
      removeSilence: false // Skip silence removal for faster testing
    });
    
    console.log('✅ Fish Audio test successful!');
    console.log(`📁 Test file: ${result.audioPath}`);
    console.log(`📊 File size: ${(result.fileSize / 1024).toFixed(1)} KB`);
    console.log(`⏱️  Duration: ~${Math.round(result.duration)}s`);
    
    return true;

  } catch (error: any) {
    console.error('❌ Fish Audio test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('💡 Note: Fish Audio uses a hardcoded fallback key by default');
      console.log('   To use your own key: npm run test-voiceover -- --fish --fish-key "your-key-here"');
    }
    
    return false;
  }
}

async function main() {
  const options = parseTestArgs();
  
  console.log('🧪 Voice API Test Suite');
  console.log('========================');
  console.log('This will test your API keys with short voice samples.\n');
  
  // Ensure output directory exists
  if (!fs.existsSync('./output')) {
    fs.mkdirSync('./output', { recursive: true });
  }
  
  let shouldTestElevenLabs = options.elevenlabs || options.testBoth;
  let shouldTestFish = options.fish || options.testBoth;
  
  // Default behavior: test both if no specific service selected
  if (!shouldTestElevenLabs && !shouldTestFish) {
    console.log('🎯 No specific service selected, testing both services...\n');
    shouldTestElevenLabs = true;
    shouldTestFish = true;
  }
  
  let elevenLabsSuccess = true;
  let fishSuccess = true;
  
  if (shouldTestElevenLabs) {
    elevenLabsSuccess = await testElevenLabs(options.elevenLabsKey);
  }
  
  if (shouldTestFish) {
    fishSuccess = await testFishAudio(options.fishKey);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎬 TEST RESULTS');
  console.log('='.repeat(50));
  
  if (shouldTestElevenLabs) {
    console.log(`${elevenLabsSuccess ? '✅' : '❌'} ElevenLabs: ${elevenLabsSuccess ? 'PASSED' : 'FAILED'}`);
}

  if (shouldTestFish) {
    console.log(`${fishSuccess ? '✅' : '❌'} Fish Audio: ${fishSuccess ? 'PASSED' : 'FAILED'}`);
  }
  
  const allPassed = elevenLabsSuccess && fishSuccess;
  console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('🚀 Your APIs are ready! You can now run the full story generation.');
    console.log('💡 Command: npm run generate -- "your story prompt here"');
  } else {
    console.log('💡 Fix the failed APIs above before running story generation.');
  }
  
  console.log('='.repeat(50));
}

main().catch((error) => {
  console.error('❌ Test suite error:', error.message);
  process.exit(1);
}); 