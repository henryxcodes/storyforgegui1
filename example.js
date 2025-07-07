import { generateVoiceover } from './dist/fish-audio.js';

// Example text to convert to speech
const text = "Hello, this is a test of the Fish Audio text-to-speech service. It converts text into natural-sounding speech.";

// Optional: you can provide your own API key if you don't want to use the hardcoded one
// const apiKey = 'your-api-key-here';

async function runExample() {
  try {
    console.log('Starting text-to-speech conversion...');
    
    const result = await generateVoiceover(text, {
      // apiKey: apiKey, // Uncomment if using your own API key
      format: 'mp3',     // Options: 'mp3', 'wav', 'opus'
      speed: 1.0,        // Speed multiplier (0.5 to 2.0)
      volume: 0          // Volume adjustment in dB (-20 to 20)
    });
    
    console.log('Conversion complete!');
    console.log(`Audio saved to: ${result.audioPath}`);
    console.log(`Duration: ${result.duration} seconds`);
    console.log(`File size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
runExample();
