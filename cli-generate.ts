import { expandStory } from './main.js';
import { generateVoiceover, VoiceoverResult } from './fish-audio.js';
import { generateElevenLabsVoiceover, VoiceoverResult as ElevenLabsResult } from './elevenlabs-audio.js';
import fs from 'fs';
import path from 'path';
import * as readline from 'readline';

interface CLIOptions {
  prompt?: string;
  file?: string;
  output?: string;
  apiKey?: string;
  interactive?: boolean;
  voiceover?: boolean;
  withAudio?: boolean;
  elevenlabs?: boolean;
  fishAudio?: boolean;
  bothAudio?: boolean;
  fishApiKey?: string;
  elevenLabsApiKey?: string;
  voiceModel?: string;
  elevenLabsVoiceId?: string;
  audioFormat?: 'mp3' | 'wav' | 'opus';
  speechSpeed?: number;
  removeSilence?: boolean;
  silenceThreshold?: number;
  silenceLength?: number;
  elevenLabsRemoveSilence?: boolean;
  elevenLabsSilenceThreshold?: number;
  elevenLabsSilenceLength?: number;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--prompt':
      case '-p':
        options.prompt = nextArg;
        i++;
        break;
      case '--file':
      case '-f':
        options.file = nextArg;
        i++;
        break;
      case '--output':
      case '-o':
        options.output = nextArg;
        i++;
        break;
      case '--api-key':
      case '-k':
        options.apiKey = nextArg;
        i++;
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--voiceover':
      case '-v':
        options.voiceover = true;
        break;
      case '--with-audio':
      case '--audio':
      case '-a':
        options.withAudio = true;
        break;
      case '--elevenlabs':
      case '--eleven':
      case '-e':
        options.elevenlabs = true;
        break;
      case '--fish-audio':
      case '--fish':
      case '-f':
        options.fishAudio = true;
        break;
      case '--both-audio':
      case '--both':
      case '-b':
        options.bothAudio = true;
        break;
      case '--fish-key':
        options.fishApiKey = nextArg;
        i++;
        break;
      case '--elevenlabs-key':
      case '--eleven-key':
        options.elevenLabsApiKey = nextArg;
        i++;
        break;
      case '--elevenlabs-voice':
      case '--eleven-voice':
        options.elevenLabsVoiceId = nextArg;
        i++;
        break;
      case '--voice-model':
        options.voiceModel = nextArg;
        i++;
        break;
      case '--voice-id':
      case '--reference-id':
      case '--reference-audio':
      case '--ref-audio':
        console.error('❌ Voice options are locked. Only voice ID e29f28e68c494af18790c8ff2e0d40c2 is allowed.');
        process.exit(1);
        break;
      case '--audio-format':
        options.audioFormat = nextArg as 'mp3' | 'wav' | 'opus';
        i++;
        break;
      case '--speech-speed':
        options.speechSpeed = parseFloat(nextArg);
        i++;
        break;
      case '--remove-silence':
      case '--cut-silence':
      case '--trim-silence':
        options.removeSilence = true;
        break;
      case '--silence-threshold':
        options.silenceThreshold = parseFloat(nextArg);
        i++;
        break;
      case '--silence-length':
        options.silenceLength = parseFloat(nextArg);
        i++;
        break;
      case '--eleven-remove-silence':
        options.elevenLabsRemoveSilence = true;
        break;
      case '--eleven-silence-threshold':
        options.elevenLabsSilenceThreshold = parseFloat(nextArg);
        i++;
        break;
      case '--eleven-silence-length':
        options.elevenLabsSilenceLength = parseFloat(nextArg);
        i++;
        break;
      case '--no-eleven-silence':
        options.elevenLabsRemoveSilence = false;
        break;
      case '--no-fish-silence':
        options.removeSilence = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        // If no flag, treat as prompt
        if (!arg.startsWith('-') && !options.prompt) {
          options.prompt = arg;
        }
        break;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
🎬 Claude Story Generator CLI

USAGE:
  npm run generate -- [options]

OPTIONS:
  -p, --prompt <text>     Story prompt to expand
  -f, --file <path>      Read prompt from file
  -i, --interactive      Enter prompt interactively (default if no prompt given)
  -o, --output <path>    Save output to file (default: console)
  -k, --api-key <key>    Claude API key (optional)
  -v, --voiceover        Generate voiceover using Fish Audio (legacy)
  -a, --audio            Generate audio voiceover (same as --voiceover)
  --with-audio           Generate audio voiceover (same as --voiceover)
  -e, --elevenlabs       Generate ElevenLabs voiceover (first 4000 chars)
  -f, --fish-audio       Generate Fish Audio voiceover (full story)
  -b, --both-audio       Generate both ElevenLabs + Fish Audio
  --fish-key <key>       Fish Audio API key (optional - has hardcoded fallback)
  --elevenlabs-key <key> ElevenLabs API key (required for ElevenLabs)
  --voice-model <model>  Fish Audio voice model (default: s1)
  --elevenlabs-voice <id> ElevenLabs voice ID (default: Bella)
  --audio-format <fmt>   Audio format: mp3, wav, opus (default: mp3)
  --speech-speed <num>   Speech speed: 0.5-2.0 (default: 1.0)
  --remove-silence       Enable silence removal for Fish Audio (ON by default)
  --cut-silence          Same as --remove-silence
  --trim-silence         Same as --remove-silence
  --silence-threshold    Fish Audio silence threshold in dB (default: -45)
  --silence-length       Fish Audio minimum silence length in ms (default: 45)
  --eleven-remove-silence Enable silence removal for ElevenLabs (ON by default)
  --eleven-silence-threshold ElevenLabs silence threshold in dB (default: -45)
  --eleven-silence-length ElevenLabs minimum silence length in ms (default: 45)
  --no-eleven-silence    Disable silence removal for ElevenLabs
  --no-fish-silence      Disable silence removal for Fish Audio
  
  Note: Voice is locked to ID e29f28e68c494af18790c8ff2e0d40c2
  -h, --help             Show this help

EXAMPLES:
  # Interactive mode (type your story, then choose audio)
  npm run generate                    # Will ask for audio after story
  npm run generate -- -i             # Will ask for audio after story
  
  # Generate story with voiceover (multiple ways)
  npm run generate -- -p "My sister stole my wedding" -v
  npm run generate -- -p "My sister stole my wedding" -a
  npm run generate -- -p "My sister stole my wedding" --audio
  npm run generate -- -p "My sister stole my wedding" --with-audio
  
  # Generate from file with custom voiceover settings
  npm run generate -- -f ./prompt.txt -a --audio-format wav --speech-speed 1.2
  
  # Generate with locked voice (e29f28e68c494af18790c8ff2e0d40c2)
  npm run generate -- -p "Story" -a
  
  # Full workflow with output files
  npm run generate -- -i -o story.txt --with-audio
  
  # Generate with ElevenLabs (premium quality, first 4000 chars)
  npm run generate -- -p "Story" -e --elevenlabs-key "your-key"
  
  # Generate with Fish Audio (full story)
  npm run generate -- -p "Story" -f --remove-silence
  
  # Generate both ElevenLabs + Fish Audio
  npm run generate -- -p "Story" -b --elevenlabs-key "your-key"
  
  # Advanced: Custom silence settings (automatic by default)
  npm run generate -- -p "Story" -b \\
    --elevenlabs-key "your-key" \\
    --eleven-silence-threshold -35 --eleven-silence-length 50 \\
    --silence-threshold -40 --silence-length 40
  
  # Disable silence removal if needed
  npm run generate -- -p "Story" -b --no-eleven-silence --no-fish-silence
  
  # Quick generation (prompt as argument)
  npm run generate -- "My roommate betrayed me"

  # With custom API keys (optional)
  npm run generate -- -p "Story prompt" -k "claude-key" --fish-key "fish-key"

FEATURES:
  ✅ RAG-enhanced generation using Data.txt knowledge base
  ✅ Automatic theme detection and context matching
  ✅ 12000-16000 word story expansion
  ✅ Reddit-style narrative optimization
  ✅ Dual voiceover system: ElevenLabs + Fish Audio
  ✅ ElevenLabs: Premium quality (first 4000 characters)
  ✅ Fish Audio: Full story voiceover (12000-16000 words)
  ✅ Independent silence removal settings for each service
  ✅ Interactive audio prompt after story generation
  ✅ Multiple audio formats (MP3, WAV, Opus)
  ✅ Adjustable speech speed and voice models
  ✅ Long text chunking for optimal audio quality
  ✅ Automatic silence removal with FFmpeg (enabled by default)
`);
}

async function readPromptFromFile(filePath: string): Promise<string> {
  try {
    const fullPath = path.resolve(filePath);
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to read file: ${filePath}`);
  }
}

async function saveStoryToFile(filePath: string, content: string): Promise<void> {
  try {
    const fullPath = path.resolve(filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await fs.promises.mkdir(dir, { recursive: true });
    
    await fs.promises.writeFile(fullPath, content, 'utf-8');
    console.log(`\n💾 Story saved to: ${fullPath}`);
  } catch (error) {
    throw new Error(`Failed to save file: ${filePath}`);
  }
}

async function getInteractivePrompt(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`
📝 INTERACTIVE STORY PROMPT MODE
${'─'.repeat(50)}

Type or paste your story prompt below. You can:
• Type multiple lines (press Enter for new lines)
• Paste text from clipboard
• Type 'DONE' on a new line when finished
• Type 'CANCEL' to exit

Examples:
"My sister stole my wedding dress and wore it to her own wedding"
"I discovered my roommate was secretly dating my ex"
"My boss took credit for my project, so I got revenge"

${'─'.repeat(50)}
Start typing your story prompt:`);

  return new Promise((resolve, reject) => {
    let lines: string[] = [];
    let inputting = true;

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase() === 'done') {
        rl.close();
        inputting = false;
        const prompt = lines.join('\n').trim();
        
        if (!prompt) {
          console.log('\n❌ No story prompt entered.');
          reject(new Error('No prompt provided'));
          return;
        }
        
        console.log(`\n✅ Story prompt captured (${prompt.length} characters)`);
        console.log(`📝 Preview: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}\n`);
        resolve(prompt);
      } else if (trimmed.toLowerCase() === 'cancel') {
        rl.close();
        inputting = false;
        console.log('\n⏹️  Story generation cancelled by user.');
        process.exit(0);
      } else {
        lines.push(line);
        // Show line count for multi-line input
        if (lines.length > 1) {
          process.stdout.write(`[Line ${lines.length}] `);
        }
      }
    };

    rl.on('line', handleLine);
    
    rl.on('close', () => {
      if (inputting) {
        // User pressed Ctrl+C or similar
        const prompt = lines.join('\n').trim();
        if (prompt) {
          console.log(`\n✅ Story prompt captured (${prompt.length} characters)`);
          resolve(prompt);
        } else {
          console.log('\n❌ No story prompt entered.');
          reject(new Error('No prompt provided'));
        }
      }
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      if (inputting) {
        rl.close();
        console.log('\n\n⏹️  Interactive input cancelled by user.');
        process.exit(0);
      }
    });
  });
}

function formatOutput(story: string, stats: any): string {
  const timestamp = new Date().toISOString();
  const wordCount = story.split(/\s+/).length;
  
  return `${'='.repeat(80)}
🎬 CLAUDE STORY GENERATOR - RAG ENHANCED
Generated: ${timestamp}
Word Count: ${wordCount.toLocaleString()}
Model: ${stats.model}
Tokens Used: ${stats.usage.input_tokens + stats.usage.output_tokens}
${'='.repeat(80)}

${story}

${'='.repeat(80)}
Generation Statistics:
- Input Tokens: ${stats.usage.input_tokens}
- Output Tokens: ${stats.usage.output_tokens}
- Processing Time: Complete
${'='.repeat(80)}`;
}

async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('🚀 Initializing Claude Story Generator with RAG...\n');
  
  // Get story prompt
  let prompt: string;
  
  if (options.interactive) {
    console.log('💬 Interactive mode requested...\n');
    prompt = await getInteractivePrompt();
  } else if (options.file) {
    console.log(`📄 Reading prompt from: ${options.file}`);
    prompt = await readPromptFromFile(options.file);
    console.log(`✅ Loaded prompt (${prompt.length} characters)\n`);
  } else if (options.prompt) {
    prompt = options.prompt;
  } else {
    // Default to interactive mode if no prompt provided
    console.log('💬 No prompt provided, entering interactive mode...\n');
    prompt = await getInteractivePrompt();
  }
  
  if (!prompt.trim()) {
    console.error('❌ Error: Empty prompt provided');
    process.exit(1);
  }
  
  console.log('🧠 RAG Context: Analyzing prompt for relevant knowledge base examples...');
  console.log('📝 Story Prompt Preview:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  console.log('');
  
  try {
    // Generate story
    console.log('⚡ Generating story with Claude + RAG enhancement...');
    console.log('⏱️  This may take 5-8 minutes for a full 12000-16000 word story...\n');
    
    const startTime = Date.now();
    const result = await expandStory(prompt, options.apiKey);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    // Extract story content
    const textContent = result.content.find(block => block.type === 'text');
    const story = textContent ? textContent.text : 'No story content found';
    
    console.log(`✅ Story generation completed in ${duration}s!`);
    console.log(`📊 Generated ${story.split(/\s+/).length.toLocaleString()} words`);
    console.log(`🎯 Used ${result.usage.input_tokens + result.usage.output_tokens} tokens\n`);
    
    // Format output
    const formattedOutput = formatOutput(story, result);
    
    // Save or display story
    if (options.output) {
      await saveStoryToFile(options.output, formattedOutput);
      console.log('📖 Story saved successfully!');
    } else {
      console.log(formattedOutput);
    }

    // Determine which audio services to use
    let shouldGenerateFishAudio = options.voiceover || options.withAudio || options.fishAudio || options.bothAudio;
    let shouldGenerateElevenLabs = options.elevenlabs || options.bothAudio;
    
    // Default behavior: Generate audio services based on available API keys and user preference
    if (!shouldGenerateFishAudio && !shouldGenerateElevenLabs) {
      // Check if ElevenLabs API key is available
      const hasElevenLabsKey = options.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
      
      if (hasElevenLabsKey) {
        console.log('🎵 Auto-generating both ElevenLabs + Fish Audio voiceovers...\n');
        shouldGenerateFishAudio = true;
        shouldGenerateElevenLabs = true;
      } else {
        console.log('🎵 Auto-generating Fish Audio voiceover (no ElevenLabs key provided)...\n');
        console.log('💡 To enable ElevenLabs: add --elevenlabs-key "your-key-here"\n');
        shouldGenerateFishAudio = true;
        shouldGenerateElevenLabs = false;
      }
    }

    // Generate voiceovers if requested
    let fishAudioResult: VoiceoverResult | null = null;
    let elevenLabsResult: ElevenLabsResult | null = null;
    
    // Generate ElevenLabs voiceover (first 4000 characters)
    if (shouldGenerateElevenLabs) {
      try {
        console.log('\n🎤 Starting ElevenLabs voiceover generation (first 4000 characters)...');
        console.log('⏱️  This may take 1-2 minutes...\n');

        const elevenLabsStartTime = Date.now();
        elevenLabsResult = await generateElevenLabsVoiceover(story, {
          apiKey: options.elevenLabsApiKey,
          voiceId: options.elevenLabsVoiceId,
          removeSilence: options.elevenLabsRemoveSilence !== false, // Default to true unless explicitly disabled
          silenceThreshold: options.elevenLabsSilenceThreshold || -45, // ElevenLabs: Optimized settings
          silenceLength: options.elevenLabsSilenceLength || 45, // ElevenLabs: min_silence_len = 45ms
          outputPath: options.output ? 
            options.output.replace(/\.[^/.]+$/, '') + '_elevenlabs.mp3' :
            undefined
        });

        const elevenLabsEndTime = Date.now();
        const elevenLabsDuration = ((elevenLabsEndTime - elevenLabsStartTime) / 1000).toFixed(1);

        console.log(`\n🎉 ElevenLabs voiceover completed in ${elevenLabsDuration}s!`);
        console.log(`🎵 Audio file: ${elevenLabsResult.audioPath}`);
        console.log(`📊 File size: ${(elevenLabsResult.fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`⏱️  Duration: ~${Math.round(elevenLabsResult.duration / 60)} minutes`);
        console.log(`📝 Characters: ${elevenLabsResult.characterCount}/4000`);

      } catch (elevenLabsError: any) {
        console.error('\n❌ ElevenLabs generation failed:', elevenLabsError.message);
        console.log('📝 Story was generated successfully, but ElevenLabs voiceover failed.');
        
        if (elevenLabsError.message.includes('API key')) {
          console.log('💡 Tip: Provide your ElevenLabs API key using one of these methods:');
          console.log('   • Set environment variable: export ELEVENLABS_API_KEY="your-key-here"');
          console.log('   • Use CLI flag: --elevenlabs-key "your-key-here"');
          console.log('   • Get your key from: https://elevenlabs.io/app/settings/api-keys');
        } else if (elevenLabsError.message.includes('credits')) {
          console.log('💡 Tip: Check your ElevenLabs account balance at https://elevenlabs.io/app/billing');
        } else if (elevenLabsError.message.includes('rate limit')) {
          console.log('💡 Tip: Wait a few minutes and try again, or upgrade your ElevenLabs plan');
        }
      }
    }

    // Generate Fish Audio voiceover (full story)
    if (shouldGenerateFishAudio) {
      try {
        console.log('\n🎤 Starting Fish Audio voiceover generation (full story)...');
        console.log('⏱️  This may take 5-10 minutes for long stories...\n');

        const fishAudioStartTime = Date.now();
        fishAudioResult = await generateVoiceover(story, {
          apiKey: options.fishApiKey,
          model: options.voiceModel || 's1',
          format: options.audioFormat || 'mp3',
          speed: options.speechSpeed || 1.0,
          removeSilence: options.removeSilence !== false, // Default to true unless explicitly disabled
          silenceThreshold: options.silenceThreshold || -45, // Fish Audio: Same as ElevenLabs
          silenceLength: options.silenceLength || 45, // Fish Audio: Same min_silence_len as ElevenLabs
          outputPath: options.output ? 
            options.output.replace(/\.[^/.]+$/, '') + '_fishaudio.' + (options.audioFormat || 'mp3') :
            undefined
        });

        const fishAudioEndTime = Date.now();
        const fishAudioDuration = ((fishAudioEndTime - fishAudioStartTime) / 1000).toFixed(1);

        console.log(`\n🎉 Fish Audio voiceover completed in ${fishAudioDuration}s!`);
        console.log(`🎵 Audio file: ${fishAudioResult.audioPath}`);
        console.log(`📊 File size: ${(fishAudioResult.fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`⏱️  Duration: ~${Math.round(fishAudioResult.duration / 60)} minutes`);
        console.log(`🎚️  Format: ${fishAudioResult.format.toUpperCase()}`);

      } catch (fishAudioError: any) {
        console.error('\n❌ Fish Audio generation failed:', fishAudioError.message);
        console.log('📝 Story was generated successfully, but Fish Audio voiceover failed.');
        
        if (fishAudioError.message.includes('API key')) {
          console.log('💡 Tip: Fish Audio API key issue. The system uses a hardcoded fallback key.');
          console.log('   • To use your own key: --fish-key "your-key-here"');
          console.log('   • Or set environment variable: export FISH_API_KEY="your-key-here"');
        } else if (fishAudioError.message.includes('credits')) {
          console.log('💡 Tip: Check your Fish Audio account balance');
        } else if (fishAudioError.message.includes('chunk')) {
          console.log('💡 Tip: Text processing failed. Try with a shorter story or check your internet connection.');
        } else if (fishAudioError.message.includes('rate limit')) {
          console.log('💡 Tip: Fish Audio rate limit exceeded. Wait a few minutes and try again.');
        }
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎬 GENERATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`📝 Story: ${story.split(/\s+/).length.toLocaleString()} words generated`);
    console.log(`⚡ Claude: ${result.usage.input_tokens + result.usage.output_tokens} tokens used`);
    
    if (elevenLabsResult) {
      console.log(`🎤 ElevenLabs: ${(elevenLabsResult.fileSize / 1024 / 1024).toFixed(2)} MB audio file (${elevenLabsResult.characterCount} chars)`);
      console.log(`📁 ElevenLabs saved to: ${elevenLabsResult.audioPath}`);
    }
    
    if (fishAudioResult) {
      console.log(`🎤 Fish Audio: ${(fishAudioResult.fileSize / 1024 / 1024).toFixed(2)} MB audio file (full story)`);
      console.log(`📁 Fish Audio saved to: ${fishAudioResult.audioPath}`);
    }
    
    if (options.output) {
      console.log(`📄 Text saved to: ${path.resolve(options.output)}`);
    }
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Generation interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
}); 